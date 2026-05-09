// Per-lead import: read a content brief from data/leads/<id>.json and the
// matching generator/data/repo/d/<hash>/ assets, populate the Sanity dataset.
//
// Usage:
//   node scripts/import-from-generator.mjs --lead=547
//
// Per-lead workflow:
//   1. In a fresh Claude session, read
//      ../generator/data/copy/<id>.facts.json AND
//      ../generator/web/leads/<id>/App.tsx
//      and hand-author data/leads/<id>.json (mirroring the Ryser example).
//   2. Run this script. It uploads assets, creates Sanity docs, validates.
//
// Idempotency: if the dataset already has a `cafe` document, the script
// refuses to run unless --force is passed. This avoids duplicate cafés
// from accidental re-runs.

import { createClient } from "@sanity/client";
import { readFile, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { validate } from "./validate-content.mjs";

const readFileAsync = promisify(readFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const generatorRoot = resolve(repoRoot, "..", "generator");
const registryDb = resolve(repoRoot, "..", "scan", "data", "registry.db");

function getToken() {
  if (process.env.SANITY_AUTH_TOKEN) return process.env.SANITY_AUTH_TOKEN;
  try {
    const config = JSON.parse(
      readFileSync(join(homedir(), ".config/sanity/config.json"), "utf8"),
    );
    return config.authToken;
  } catch {
    throw new Error("No Sanity auth token. Run `pnpm sanity login` first.");
  }
}

function lookupHash(businessId) {
  const result = spawnSync("python3", [
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
  if (result.status !== 0) {
    throw new Error(
      `Failed to query registry.db: ${result.stderr.toString()}`,
    );
  }
  const hash = result.stdout.toString().trim();
  if (!hash) {
    throw new Error(
      `No demos row for business_id=${businessId} in scan/data/registry.db. Run the generator audit first.`,
    );
  }
  return hash;
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
  return {
    _type: "file",
    asset: { _type: "reference", _ref: assetId },
  };
}

function withKeys(items, prefix) {
  return items.map((item, i) => ({
    _key: `${prefix}${i + 1}`,
    ...item,
  }));
}

function portableTextFromString(text, blockKey = "intro1") {
  return [
    {
      _type: "block",
      _key: blockKey,
      style: "normal",
      markDefs: [],
      children: [
        {
          _type: "span",
          _key: `${blockKey}span`,
          text,
          marks: [],
        },
      ],
    },
  ];
}

async function main() {
  const args = process.argv.slice(2);
  const leadArg = args.find((a) => a.startsWith("--lead="));
  if (!leadArg) {
    console.error("usage: node scripts/import-from-generator.mjs --lead=<id> [--force]");
    process.exit(2);
  }
  const leadId = leadArg.slice("--lead=".length);
  const force = args.includes("--force");

  const briefPath = resolve(repoRoot, "data", "leads", `${leadId}.json`);
  const brief = JSON.parse(readFileSync(briefPath, "utf8"));
  console.log(`Brief: ${briefPath}`);

  const hash = lookupHash(brief.businessId);
  const assetDir = resolve(generatorRoot, "data", "repo", "d", hash);
  console.log(`Generator hash: ${hash}`);
  console.log(`Asset dir:      ${assetDir}`);

  function readEnvLocal(key) {
    try {
      const lines = readFileSync(resolve(repoRoot, ".env.local"), "utf8").split("\n");
      const line = lines.find((l) => l.startsWith(`${key}=`));
      if (!line) return "";
      return line.slice(key.length + 1).trim().replace(/^['"]|['"]$/g, "");
    } catch {
      return "";
    }
  }
  const projectId =
    process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || readEnvLocal("NEXT_PUBLIC_SANITY_PROJECT_ID");
  if (!projectId) {
    throw new Error("NEXT_PUBLIC_SANITY_PROJECT_ID not set in env or .env.local.");
  }
  const dataset =
    process.env.NEXT_PUBLIC_SANITY_DATASET || readEnvLocal("NEXT_PUBLIC_SANITY_DATASET") || "production";

  const client = createClient({
    projectId,
    dataset,
    apiVersion: "2026-01-01",
    useCdn: false,
    token: getToken(),
  });

  // Idempotency guard.
  const existing = await client.fetch(`*[_type == "cafe"][0]{_id}`);
  if (existing && !force) {
    console.error(
      `\nDataset already has a cafe document (${existing._id}). ` +
        `Pass --force to re-import (will create duplicates).`,
    );
    process.exit(1);
  }

  console.log(`\nProject: ${projectId}, dataset: ${dataset}`);
  console.log("\nUploading assets ...");

  async function uploadIfPresent(filename, kind, contentType) {
    if (!filename) return null;
    const path = resolve(assetDir, filename);
    let buffer;
    try {
      buffer = await readFileAsync(path);
    } catch {
      console.warn(`  (skipped ${filename}: not found)`);
      return null;
    }
    const asset = await client.assets.upload(kind, buffer, {
      filename,
      contentType,
    });
    console.log(`  ${filename} (${(buffer.length / 1024).toFixed(0)} KB) -> ${asset._id}`);
    return asset._id;
  }

  const heroId = await uploadIfPresent(brief.assets?.hero?.file, "image", "image/jpeg");
  const logoId = await uploadIfPresent(brief.assets?.logo?.file, "image", "image/png");
  const teamPhotoId = await uploadIfPresent(brief.team?.photoFile, "image", "image/jpeg");

  // Upload section PDFs.
  const sectionPdfIds = {};
  for (const section of brief.menuSections ?? []) {
    if (!section.pdfFile) continue;
    const id = await uploadIfPresent(section.pdfFile, "file", "application/pdf");
    if (id) sectionPdfIds[section.key] = id;
  }

  // 1. Create cafe singleton.
  console.log("\nCreating cafe singleton ...");
  const cafeDoc = {
    _type: "cafe",
    name: brief.name,
    tagline: brief.tagline,
    ...(heroId
      ? { hero: imageRef(heroId, brief.assets.hero.alt) }
      : {}),
    ...(logoId
      ? { logo: imageRef(logoId, brief.assets.logo.alt) }
      : {}),
    ...(brief.intro ? { intro: portableTextFromString(brief.intro) } : {}),
    ...(brief.handwerke?.length
      ? {
          handwerke: withKeys(
            brief.handwerke.map((h) => ({ _type: "handwerk", ...h })),
            "hw",
          ),
        }
      : {}),
    ...(brief.team
      ? {
          team: {
            ...(teamPhotoId
              ? {
                  photo: imageRef(teamPhotoId, brief.team.title, {
                    caption: brief.team.caption,
                  }),
                }
              : {}),
            title: brief.team.title,
            body: brief.team.body,
          },
        }
      : {}),
    ...(brief.features?.length
      ? {
          features: withKeys(
            brief.features.map((f) => ({ _type: "feature", ...f })),
            "ft",
          ),
        }
      : {}),
    ...(brief.address ? { address: brief.address } : {}),
    ...(brief.phone ? { phone: brief.phone } : {}),
    ...(brief.email ? { email: brief.email } : {}),
    ...(brief.owners ? { owners: brief.owners } : {}),
    ...(brief.locationHint ? { locationHint: brief.locationHint } : {}),
    ...(brief.hours?.length
      ? {
          hours: withKeys(
            brief.hours.map((h) => ({ _type: "hourEntry", ...h })),
            "hr",
          ),
        }
      : {}),
    ...(brief.specialHours?.length
      ? {
          specialHours: withKeys(
            brief.specialHours.map((s) => ({ _type: "specialHourEntry", ...s })),
            "sh",
          ),
        }
      : {}),
    ...(brief.hoursNote ? { hoursNote: brief.hoursNote } : {}),
  };
  const createdCafe = await client.create(cafeDoc);
  console.log(`  cafe -> ${createdCafe._id}`);

  // 2. Create menu sections (collect IDs by key for highlight references).
  console.log("\nCreating menu sections ...");
  const sectionIdByKey = {};
  for (const section of brief.menuSections ?? []) {
    const doc = {
      _type: "menuSection",
      title: section.title,
      headline: section.headline,
      slug: { _type: "slug", current: section.key },
      ...(section.subtitle ? { subtitle: section.subtitle } : {}),
      ...(section.intro ? { intro: section.intro } : {}),
      ...(section.pdfLabel ? { pdfLabel: section.pdfLabel } : {}),
      ...(sectionPdfIds[section.key]
        ? { pdf: fileRef(sectionPdfIds[section.key]) }
        : {}),
      ...(section.extras?.length
        ? {
            extras: withKeys(
              section.extras.map((e) => ({ _type: "extraEntry", ...e })),
              `ex${section.key}`,
            ),
          }
        : {}),
      order: section.order ?? 100,
    };
    const created = await client.create(doc);
    sectionIdByKey[section.key] = created._id;
    console.log(`  ${section.title} -> ${created._id}`);
  }

  // 3. Create highlights with references to their sections.
  console.log("\nCreating menu highlights ...");
  let highlightCount = 0;
  for (const section of brief.menuSections ?? []) {
    const sectionId = sectionIdByKey[section.key];
    if (!sectionId) continue;
    for (const h of section.highlights ?? []) {
      const doc = {
        _type: "menuHighlight",
        name: h.name,
        section: { _type: "reference", _ref: sectionId },
        ...(h.category ? { category: h.category } : {}),
        ...(h.description ? { description: h.description } : {}),
        ...(h.price ? { price: h.price } : {}),
        ...(h.note ? { note: h.note } : {}),
        ...(h.featured ? { featured: true } : {}),
        order: h.order ?? 100,
      };
      await client.create(doc);
      highlightCount += 1;
    }
  }
  console.log(`  ${highlightCount} highlights created.`);

  // 4. Validate against contracts.
  console.log("\nValidating content contracts ...");
  const { issues, okMessages } = await validate();
  for (const m of okMessages) console.log(`  ok    ${m}`);
  if (issues.length > 0) {
    console.log("");
    for (const i of issues) console.error(`  FAIL  ${i}`);
    console.error(
      `\nImport completed, but ${issues.length} contract violation(s) need fixing in data/leads/${leadId}.json before pushing.`,
    );
    process.exit(1);
  }

  console.log(
    `\nDone. Lead ${leadId} imported into Sanity (project ${projectId}).` +
      `\nNext: run scripts/seed-assets.mjs to re-validate, then deploy.`,
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error("\nERROR:", err.message ?? err);
    if (err.responseBody) console.error(err.responseBody);
    process.exit(1);
  });
}
