// Per-lead deploy chain. One command, fully mechanical, no manual UI steps.
//
// Reads the lead's content brief at data/leads/<id>.json (hand-authored
// once in a Claude session from /generator's App.tsx + facts.json). Then:
//
//   1. Creates a fresh Sanity project (EU residency).
//   2. Creates the production dataset.
//   3. Registers CORS for localhost + the upcoming pages.dev URL.
//   4. Uploads assets from /generator/data/repo/d/<hash>/ and creates
//      cafe + menu sections + highlights via @sanity/client.
//   5. Validates content contracts.
//   6. Creates a Cloudflare Pages project named after the lead's
//      url_hash (so the URL is <hash>.pages.dev), sourced from the
//      shared template repo nilpage/sanity-547. Sets env vars to the
//      new Sanity project ID.
//   7. Creates a CF deploy hook + a Sanity webhook so future content
//      publishes auto-rebuild.
//   8. Triggers the first build, polls until success, prints the URL.
//
// Usage:
//   CF_API_TOKEN=...  CF_ACCOUNT_ID=...  node scripts/deploy.mjs --lead=<id>
//
// Or set both in your shell. The Sanity auth token is read from
// ~/.config/sanity/config.json (set by `pnpm sanity login` once).
//
// Idempotent on re-run: if a lead is already deployed, the script reads
// the existing IDs from data/sanity-state.json and skips creation steps,
// only running content import + validation. Pass --force to recreate.

import { createClient } from "@sanity/client";
import { existsSync, readFile, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { validate } from "./validate-content.mjs";

const readFileAsync = promisify(readFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const generatorRoot = resolve(repoRoot, "..", "generator");
const registryDb = resolve(repoRoot, "..", "scan", "data", "registry.db");
const stateFile = resolve(repoRoot, "data", "sanity-state.json");

const SHARED_TEMPLATE_REPO = { owner: "nilpage", name: "sanity-547" };
const SANITY_API_VERSION = "v2025-02-19";
const SANITY_ORG_ID = "o3YHu6Vaz";

// ---------- helpers ----------

function loadState() {
  if (!existsSync(stateFile)) return { leads: {} };
  return JSON.parse(readFileSync(stateFile, "utf8"));
}

function saveState(state) {
  writeFileSync(stateFile, JSON.stringify(state, null, 2) + "\n");
}

function sanityToken() {
  if (process.env.SANITY_AUTH_TOKEN) return process.env.SANITY_AUTH_TOKEN;
  try {
    const config = JSON.parse(
      readFileSync(resolve(homedir(), ".config/sanity/config.json"), "utf8"),
    );
    if (config.authToken) return config.authToken;
  } catch {}
  throw new Error("No Sanity auth token. Run `pnpm sanity login`.");
}

function cfEnv() {
  const token = process.env.CF_API_TOKEN;
  const account = process.env.CF_ACCOUNT_ID;
  if (!token || !account) {
    throw new Error(
      "Missing CF_API_TOKEN or CF_ACCOUNT_ID env vars. " +
        "Get them from Cloudflare Dashboard > My Profile > API Tokens.",
    );
  }
  return { token, account };
}

function lookupHash(businessId) {
  const r = spawnSync("python3", [
    "-c",
    `
import sqlite3, sys
con = sqlite3.connect(sys.argv[1])
row = con.execute('select url_hash from demos where business_id = ?', (int(sys.argv[2]),)).fetchone()
sys.stdout.write(row[0] if row else '')
`,
    registryDb,
    String(businessId),
  ]);
  if (r.status !== 0) {
    throw new Error(`Failed to query registry.db: ${r.stderr.toString()}`);
  }
  const hash = r.stdout.toString().trim();
  if (!hash) {
    throw new Error(
      `No demos row for business_id=${businessId} in scan/data/registry.db.`,
    );
  }
  return hash;
}

async function fetchJson(url, init = {}) {
  const r = await fetch(url, init);
  const text = await r.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  if (!r.ok) {
    const msg =
      typeof body === "object"
        ? JSON.stringify(body)
        : String(body).slice(0, 500);
    throw new Error(`${r.status} ${r.statusText} from ${url}\n${msg}`);
  }
  return body;
}

// ---------- step 1: Sanity project + dataset + CORS ----------

async function ensureSanityProject(leadState, brief) {
  if (leadState.sanityProjectId) {
    console.log(`  reusing Sanity project ${leadState.sanityProjectId}`);
    return leadState.sanityProjectId;
  }
  const token = sanityToken();
  const body = await fetchJson(
    `https://api.sanity.io/${SANITY_API_VERSION}/projects`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        displayName: brief.name,
        organizationId: SANITY_ORG_ID,
        dataResidency: "eu",
      }),
    },
  );
  const projectId = body.id || body._id;
  if (!projectId) throw new Error(`Project create returned no id: ${JSON.stringify(body)}`);
  console.log(`  created Sanity project ${projectId} (${brief.name})`);
  leadState.sanityProjectId = projectId;
  return projectId;
}

async function ensureSanityDataset(projectId) {
  const token = sanityToken();
  // PUT is idempotent for dataset creation (404 if missing → creates;
  // 200 if exists → ok). Some Sanity API versions reject duplicate
  // creates with 409, so we tolerate both.
  try {
    await fetchJson(
      `https://api.sanity.io/${SANITY_API_VERSION}/projects/${projectId}/datasets/production`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ aclMode: "public" }),
      },
    );
    console.log(`  ensured dataset production`);
  } catch (e) {
    if (!String(e.message).includes("already exists")) throw e;
    console.log(`  dataset production already exists`);
  }
}

async function addCors(projectId, origin) {
  const token = sanityToken();
  try {
    await fetchJson(
      `https://api.sanity.io/${SANITY_API_VERSION}/projects/${projectId}/cors`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ origin, allowCredentials: true }),
      },
    );
    console.log(`  CORS + ${origin}`);
  } catch (e) {
    if (String(e.message).includes("Duplicate")) {
      console.log(`  CORS = ${origin} (already present)`);
    } else throw e;
  }
}

// ---------- step 2: content import ----------

function withKeys(items, prefix) {
  return items.map((item, i) => ({ _key: `${prefix}${i + 1}`, ...item }));
}

function ptFromString(text, key = "intro1") {
  return [
    {
      _type: "block",
      _key: key,
      style: "normal",
      markDefs: [],
      children: [{ _type: "span", _key: `${key}span`, text, marks: [] }],
    },
  ];
}

function imageRef(assetId, alt, extras = {}) {
  return {
    _type: "image",
    asset: { _type: "reference", _ref: assetId },
    ...(alt ? { alt } : {}),
    ...extras,
  };
}

function fileRef(assetId) {
  return { _type: "file", asset: { _type: "reference", _ref: assetId } };
}

async function importContent(projectId, hash, brief, leadState, force) {
  const client = createClient({
    projectId,
    dataset: "production",
    apiVersion: "2026-01-01",
    useCdn: false,
    token: sanityToken(),
  });

  const existing = await client.fetch(`*[_type == "cafe"][0]{_id}`);
  if (existing && !force) {
    console.log(`  cafe exists (${existing._id}); skipping import`);
    leadState.cafeId = existing._id;
    return;
  }

  const assetDir = resolve(generatorRoot, "data", "repo", "d", hash);
  console.log(`  uploading assets from ${assetDir}`);

  async function upload(filename, kind, ct) {
    if (!filename) return null;
    const path = resolve(assetDir, filename);
    let buf;
    try {
      buf = await readFileAsync(path);
    } catch {
      console.warn(`    (missing ${filename})`);
      return null;
    }
    const a = await client.assets.upload(kind, buf, { filename, contentType: ct });
    console.log(`    ${filename} -> ${a._id}`);
    return a._id;
  }

  const heroId = await upload(brief.assets?.hero?.file, "image", "image/jpeg");
  const logoId = await upload(brief.assets?.logo?.file, "image", "image/png");
  const teamId = await upload(brief.team?.photoFile, "image", "image/jpeg");
  const sectionPdfIds = {};
  for (const s of brief.menuSections ?? []) {
    if (!s.pdfFile) continue;
    const id = await upload(s.pdfFile, "file", "application/pdf");
    if (id) sectionPdfIds[s.key] = id;
  }

  console.log("  creating cafe singleton");
  const cafeDoc = {
    _type: "cafe",
    name: brief.name,
    tagline: brief.tagline,
    ...(heroId ? { hero: imageRef(heroId, brief.assets.hero.alt) } : {}),
    ...(logoId ? { logo: imageRef(logoId, brief.assets.logo.alt) } : {}),
    ...(brief.intro ? { intro: ptFromString(brief.intro) } : {}),
    ...(brief.handwerke?.length
      ? { handwerke: withKeys(brief.handwerke.map((h) => ({ _type: "handwerk", ...h })), "hw") }
      : {}),
    ...(brief.team
      ? {
          team: {
            ...(teamId
              ? { photo: imageRef(teamId, brief.team.title, { caption: brief.team.caption }) }
              : {}),
            title: brief.team.title,
            body: brief.team.body,
          },
        }
      : {}),
    ...(brief.features?.length
      ? { features: withKeys(brief.features.map((f) => ({ _type: "feature", ...f })), "ft") }
      : {}),
    ...(brief.address ? { address: brief.address } : {}),
    ...(brief.phone ? { phone: brief.phone } : {}),
    ...(brief.email ? { email: brief.email } : {}),
    ...(brief.owners ? { owners: brief.owners } : {}),
    ...(brief.locationHint ? { locationHint: brief.locationHint } : {}),
    ...(brief.hours?.length
      ? { hours: withKeys(brief.hours.map((h) => ({ _type: "hourEntry", ...h })), "hr") }
      : {}),
    ...(brief.specialHours?.length
      ? { specialHours: withKeys(brief.specialHours.map((s) => ({ _type: "specialHourEntry", ...s })), "sh") }
      : {}),
    ...(brief.hoursNote ? { hoursNote: brief.hoursNote } : {}),
  };
  const createdCafe = await client.create(cafeDoc);
  leadState.cafeId = createdCafe._id;
  console.log(`    cafe -> ${createdCafe._id}`);

  console.log("  creating menu sections");
  const sectionIdByKey = {};
  for (const s of brief.menuSections ?? []) {
    const doc = {
      _type: "menuSection",
      title: s.title,
      headline: s.headline,
      slug: { _type: "slug", current: s.key },
      ...(s.subtitle ? { subtitle: s.subtitle } : {}),
      ...(s.intro ? { intro: s.intro } : {}),
      ...(s.pdfLabel ? { pdfLabel: s.pdfLabel } : {}),
      ...(sectionPdfIds[s.key] ? { pdf: fileRef(sectionPdfIds[s.key]) } : {}),
      ...(s.extras?.length
        ? { extras: withKeys(s.extras.map((e) => ({ _type: "extraEntry", ...e })), `ex${s.key}`) }
        : {}),
      order: s.order ?? 100,
    };
    const created = await client.create(doc);
    sectionIdByKey[s.key] = created._id;
  }

  console.log("  creating highlights");
  let n = 0;
  for (const s of brief.menuSections ?? []) {
    const sid = sectionIdByKey[s.key];
    for (const h of s.highlights ?? []) {
      await client.create({
        _type: "menuHighlight",
        name: h.name,
        section: { _type: "reference", _ref: sid },
        ...(h.category ? { category: h.category } : {}),
        ...(h.description ? { description: h.description } : {}),
        ...(h.price ? { price: h.price } : {}),
        ...(h.note ? { note: h.note } : {}),
        ...(h.featured ? { featured: true } : {}),
        order: h.order ?? 100,
      });
      n += 1;
    }
  }
  console.log(`    ${n} highlights`);
}

// ---------- step 3: CF Pages + webhooks ----------

async function ensureCfProject(leadState, hash, sanityProjectId) {
  const { token, account } = cfEnv();
  if (leadState.cfProjectName) {
    console.log(`  reusing CF project ${leadState.cfProjectName}`);
    return leadState.cfProjectName;
  }
  const body = await fetchJson(
    `https://api.cloudflare.com/client/v4/accounts/${account}/pages/projects`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: hash,
        production_branch: "main",
        source: {
          type: "github",
          config: {
            owner: SHARED_TEMPLATE_REPO.owner,
            repo_name: SHARED_TEMPLATE_REPO.name,
            production_branch: "main",
            deployments_enabled: true,
          },
        },
        build_config: {
          build_command: "pnpm install --frozen-lockfile && pnpm build",
          destination_dir: "out",
          root_dir: "",
        },
        deployment_configs: {
          production: {
            env_vars: {
              NEXT_PUBLIC_SANITY_PROJECT_ID: { value: sanityProjectId },
              NEXT_PUBLIC_SANITY_DATASET: { value: "production" },
              NEXT_PUBLIC_SANITY_API_VERSION: { value: "2026-01-01" },
              NODE_VERSION: { value: "22" },
            },
          },
        },
      }),
    },
  );
  if (!body.success) {
    throw new Error(`CF project create failed: ${JSON.stringify(body.errors)}`);
  }
  const name = body.result.name;
  console.log(`  CF project ${name} created (${name}.pages.dev)`);
  leadState.cfProjectName = name;
  return name;
}

async function ensureDeployHook(leadState, projectName) {
  const { token, account } = cfEnv();
  if (leadState.cfDeployHookId) {
    console.log(`  reusing deploy hook ${leadState.cfDeployHookId}`);
    return leadState.cfDeployHookId;
  }
  const body = await fetchJson(
    `https://api.cloudflare.com/client/v4/accounts/${account}/pages/projects/${projectName}/deploy_hooks`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: "sanity-publish", branch: "main" }),
    },
  );
  if (!body.success) {
    throw new Error(`Deploy hook create failed: ${JSON.stringify(body.errors)}`);
  }
  const list = await fetchJson(
    `https://api.cloudflare.com/client/v4/accounts/${account}/pages/projects/${projectName}/deploy_hooks`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const hook = list.result.find((h) => h.name === "sanity-publish");
  leadState.cfDeployHookId = hook.hook_id;
  console.log(`  deploy hook ${hook.hook_id}`);
  return hook.hook_id;
}

async function ensureSanityWebhook(leadState, sanityProjectId, deployHookId) {
  if (leadState.sanityWebhookId) {
    console.log(`  reusing Sanity webhook ${leadState.sanityWebhookId}`);
    return leadState.sanityWebhookId;
  }
  const token = sanityToken();
  const body = await fetchJson(
    `https://${sanityProjectId}.api.sanity.io/${SANITY_API_VERSION}/hooks/projects/${sanityProjectId}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "document",
        name: "auto-rebuild-cloudflare",
        description: "Trigger Cloudflare Pages rebuild on publish.",
        url: `https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/${deployHookId}`,
        dataset: "production",
        apiVersion: SANITY_API_VERSION,
        rule: {
          on: ["create", "update", "delete"],
          filter: "_type in ['cafe', 'menuSection', 'menuHighlight', 'aktuell']",
          projection: "{}",
        },
        httpMethod: "POST",
      }),
    },
  );
  leadState.sanityWebhookId = body.id;
  console.log(`  Sanity webhook ${body.id}`);
  return body.id;
}

async function triggerBuildAndWait(projectName) {
  const { token, account } = cfEnv();
  const trig = await fetchJson(
    `https://api.cloudflare.com/client/v4/accounts/${account}/pages/projects/${projectName}/deployments`,
    { method: "POST", headers: { Authorization: `Bearer ${token}` } },
  );
  const id = trig.result.id;
  console.log(`  triggered deploy ${id}, polling`);
  let prev = "";
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 12_000));
    const r = await fetchJson(
      `https://api.cloudflare.com/client/v4/accounts/${account}/pages/projects/${projectName}/deployments/${id}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const stage = r.result.latest_stage;
    const cur = `${stage?.name}/${stage?.status}`;
    if (cur !== prev) {
      console.log(`    ${cur}`);
      prev = cur;
    }
    if (cur === "deploy/success") return;
    if (stage?.status === "failure" || stage?.status === "canceled") {
      throw new Error(`Build ${cur}`);
    }
  }
  throw new Error("Build timed out after 12 minutes");
}

// ---------- main ----------

async function main() {
  const args = process.argv.slice(2);
  const leadArg = args.find((a) => a.startsWith("--lead="));
  if (!leadArg) {
    console.error("usage: node scripts/deploy.mjs --lead=<id> [--force]");
    process.exit(2);
  }
  const leadId = leadArg.slice("--lead=".length);
  const force = args.includes("--force");

  const briefPath = resolve(repoRoot, "data", "leads", `${leadId}.json`);
  if (!existsSync(briefPath)) {
    throw new Error(
      `No brief at ${briefPath}. Author it first by reading ` +
        `../generator/web/leads/${leadId}/App.tsx and ` +
        `../generator/data/copy/${leadId}.facts.json.`,
    );
  }
  const brief = JSON.parse(readFileSync(briefPath, "utf8"));
  const hash = lookupHash(brief.businessId);

  const state = loadState();
  state.leads = state.leads || {};
  state.leads[leadId] = state.leads[leadId] || {};
  const leadState = state.leads[leadId];
  leadState.hash = hash;
  leadState.businessId = brief.businessId;
  leadState.name = brief.name;

  console.log(`\n=== lead ${leadId} (${brief.name}) ===`);
  console.log(`hash:           ${hash}`);
  console.log(`expected URL:   https://${hash}.pages.dev/`);

  console.log("\n[1/5] Sanity project + dataset + CORS");
  const sanityProjectId = await ensureSanityProject(leadState, brief);
  saveState(state);
  await ensureSanityDataset(sanityProjectId);
  for (const origin of [
    "http://localhost:3000",
    `https://${hash}.pages.dev`,
    `https://*.${hash}.pages.dev`,
  ]) {
    await addCors(sanityProjectId, origin);
  }
  saveState(state);

  console.log("\n[2/5] Content import");
  await importContent(sanityProjectId, hash, brief, leadState, force);
  saveState(state);

  console.log("\n[3/5] Content validation");
  process.env.NEXT_PUBLIC_SANITY_PROJECT_ID = sanityProjectId;
  process.env.NEXT_PUBLIC_SANITY_DATASET = "production";
  const { issues, okMessages } = await validate();
  for (const m of okMessages) console.log(`  ok    ${m}`);
  if (issues.length > 0) {
    for (const i of issues) console.error(`  FAIL  ${i}`);
    throw new Error(`Content contract violations: ${issues.length}`);
  }

  console.log("\n[4/5] Cloudflare Pages + webhooks");
  const cfName = await ensureCfProject(leadState, hash, sanityProjectId);
  saveState(state);
  const deployHookId = await ensureDeployHook(leadState, cfName);
  saveState(state);
  await ensureSanityWebhook(leadState, sanityProjectId, deployHookId);
  saveState(state);

  console.log("\n[5/5] First build");
  await triggerBuildAndWait(cfName);
  leadState.deployedAt = new Date().toISOString();
  saveState(state);

  console.log(`\n=== done. live at https://${hash}.pages.dev/ ===`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error("\nERROR:", err.message ?? err);
    process.exit(1);
  });
}
