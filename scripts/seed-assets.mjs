import { createClient } from "@sanity/client";
import { readFile, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

import { validate } from "./validate-content.mjs";
import { validateVisual } from "./validate-visual.mjs";

const readFileAsync = promisify(readFile);

let token = process.env.SANITY_AUTH_TOKEN;
if (!token) {
  try {
    const config = JSON.parse(
      readFileSync(join(homedir(), ".config/sanity/config.json"), "utf8"),
    );
    token = config.authToken;
  } catch {
    console.error(
      "Could not find Sanity auth token. Run `pnpm sanity login` first.",
    );
    process.exit(1);
  }
}

const PROJECT_ID = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "p16k3ee6";
const DATASET = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";

const client = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  apiVersion: "2026-01-01",
  useCdn: false,
  token,
});

const ASSET_DIR = "/home/pi/projects/nopage/generator/data/repo/d/a1d44df0";

const CAFE_ID = "c61d4798-d86d-40f8-8907-3685049e7b23";
const SECTION_IDS = {
  fruehstueck: "6c93eaa8-c4e3-4b29-b4c3-06b22653203d",
  speisekarte: "5ef2df35-f98c-490f-984a-25c98b8c9d62",
  coupes: "7009ea48-3f17-4249-85a4-f0e7ac0a70e6",
};

async function uploadAsset(filename, kind, contentType) {
  const buffer = await readFileAsync(resolve(ASSET_DIR, filename));
  process.stdout.write(
    `Uploading ${filename} (${(buffer.length / 1024).toFixed(0)} KB) ... `,
  );
  const asset = await client.assets.upload(kind, buffer, {
    filename,
    contentType,
  });
  console.log(asset._id);
  return asset._id;
}

function imageRef(assetId, alt) {
  return {
    _type: "image",
    asset: { _type: "reference", _ref: assetId },
    ...(alt ? { alt } : {}),
  };
}

function fileRef(assetId) {
  return {
    _type: "file",
    asset: { _type: "reference", _ref: assetId },
  };
}

async function main() {
  console.log(`Project: ${PROJECT_ID}, dataset: ${DATASET}\n`);

  const heroId = await uploadAsset("hero.jpg", "image", "image/jpeg");
  const logoId = await uploadAsset("logo.png", "image", "image/png");
  const teamId = await uploadAsset("team.jpg", "image", "image/jpeg");
  const fruePdfId = await uploadAsset(
    "fruehstueck.pdf",
    "file",
    "application/pdf",
  );
  const speiPdfId = await uploadAsset(
    "speisekarte.pdf",
    "file",
    "application/pdf",
  );
  const coupePdfId = await uploadAsset(
    "coupes.pdf",
    "file",
    "application/pdf",
  );

  console.log("\nPatching cafe singleton ...");
  await client
    .patch(CAFE_ID)
    .set({
      hero: imageRef(heroId, "Cafe Konditorei Ryser in Schwyz"),
      logo: imageRef(logoId, "Ryser Logo"),
      "team.photo": {
        ...imageRef(teamId, "Paul und Heidi Ryser-Danioth in der Backstube"),
        caption: "Paul und Heidi, in der eigenen Backstube",
      },
    })
    .commit();
  console.log("  cafe patched");

  console.log("\nPatching menu sections ...");
  await client
    .patch(SECTION_IDS.fruehstueck)
    .set({ pdf: fileRef(fruePdfId) })
    .commit();
  await client
    .patch(SECTION_IDS.speisekarte)
    .set({ pdf: fileRef(speiPdfId) })
    .commit();
  await client
    .patch(SECTION_IDS.coupes)
    .set({ pdf: fileRef(coupePdfId) })
    .commit();
  console.log("  3 sections patched");

  console.log("\nValidating content against layout contracts ...");
  const { issues, okMessages } = await validate();
  for (const m of okMessages) console.log(`  ok    ${m}`);
  if (issues.length > 0) {
    console.log("");
    for (const i of issues) console.error(`  FAIL  ${i}`);
    console.error(
      `\nSeed stopped: ${issues.length} content contract violation(s) need fixing.`,
    );
    process.exit(1);
  }

  if (process.argv.includes("--skip-visual")) {
    console.log("\nSkipping visual validation (--skip-visual).");
    console.log("\nDone. Content contracts satisfied; visual review skipped.");
    return;
  }

  console.log(
    "\nRunning visual review (Playwright + claude -p, ~30 seconds) ...",
  );
  let visualResult;
  try {
    visualResult = await validateVisual({
      url: process.env.NEXT_PUBLIC_VALIDATE_URL || "http://localhost:3000/",
    });
  } catch (err) {
    console.warn(
      `\nVisual review skipped: ${err.message ?? err}\nIs the dev server running on http://localhost:3000? Re-run after \`pnpm dev\`.`,
    );
    console.log("\nDone. Content contracts satisfied; visual review unavailable.");
    return;
  }

  const { issues: visualIssues } = visualResult;
  if (visualIssues.length === 0) {
    console.log("\nVisual review: clean.");
    console.log("\nDone. All contracts satisfied; visual review clean.");
    return;
  }

  console.error(`\nVisual review: ${visualIssues.length} issue(s).\n`);
  for (const i of visualIssues) {
    const sev = i.severity?.toUpperCase() ?? "?";
    console.error(`  [${sev}] ${i.viewport} / ${i.section}: ${i.description}`);
  }
  console.error(
    `\nSeed stopped: visual review failed. Fix the issues, then re-run.`,
  );
  process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error("\nERROR:", err.message ?? err);
    if (err.responseBody) console.error(err.responseBody);
    process.exit(1);
  });
}
