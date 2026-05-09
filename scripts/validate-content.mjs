// Content-vs-layout contract checks for the sanity-generator track.
//
// What this catches:
// - Handwerke count not a multiple of 3 (desktop renders 3-col).
// - Cards-mode menu sections (have a featured highlight) where non-featured
//   count is not a multiple of 3.
// - Grid-mode menu sections (highlights have categories) where distinct
//   category count is not a multiple of 4.
//
// Run standalone (`node scripts/validate-content.mjs`) or import `validate()`
// from another script to fail fast before publishing.

import { createClient } from "@sanity/client";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

function getToken() {
  if (process.env.SANITY_AUTH_TOKEN) return process.env.SANITY_AUTH_TOKEN;
  try {
    const config = JSON.parse(
      readFileSync(join(homedir(), ".config/sanity/config.json"), "utf8"),
    );
    return config.authToken;
  } catch {
    return undefined;
  }
}

function makeClient() {
  return createClient({
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "p16k3ee6",
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
    apiVersion: "2026-01-01",
    useCdn: false,
    token: getToken(),
    perspective: "published",
  });
}

const HANDWERKE_COLS = 3;
const CARDS_COLS = 3;
const GRID_COLS = 4;

export async function validate() {
  const client = makeClient();
  const issues = [];
  const okMessages = [];

  // 1. Handwerke
  const cafe = await client.fetch(`*[_type == "cafe"][0]{handwerke, name}`);
  if (cafe?.handwerke?.length) {
    const n = cafe.handwerke.length;
    if (n % HANDWERKE_COLS !== 0) {
      const drop = n % HANDWERKE_COLS;
      const add = HANDWERKE_COLS - drop;
      issues.push(
        `Handwerke count is ${n}. Desktop renders in ${HANDWERKE_COLS}-column grid; needs a multiple of ${HANDWERKE_COLS}. Add ${add} or drop ${drop}.`,
      );
    } else {
      okMessages.push(
        `handwerke: ${n} entries fit ${HANDWERKE_COLS}-column desktop grid.`,
      );
    }
  }

  // 2. Menu sections
  const sections = await client.fetch(`*[_type == "menuSection"]{
    _id,
    title,
    "highlights": *[_type == "menuHighlight" && references(^._id)]{
      name, category, featured
    }
  }`);

  for (const section of sections) {
    const highlights = section.highlights ?? [];
    if (highlights.length === 0) {
      okMessages.push(
        `menu "${section.title}": no highlights, only PDF link will render.`,
      );
      continue;
    }

    const featured = highlights.filter((h) => h.featured);
    const nonFeatured = highlights.filter((h) => !h.featured);
    const hasCategories = highlights.some((h) => h.category);

    if (featured.length > 0) {
      // Cards mode.
      if (featured.length > 1) {
        issues.push(
          `menu "${section.title}": ${featured.length} highlights are featured. Cards mode supports exactly one full-width featured card; demote the others.`,
        );
        continue;
      }
      const n = nonFeatured.length;
      if (n === 0) {
        okMessages.push(
          `menu "${section.title}": cards mode with only the featured card.`,
        );
      } else if (n % CARDS_COLS !== 0) {
        const drop = n % CARDS_COLS;
        const add = CARDS_COLS - drop;
        issues.push(
          `menu "${section.title}": cards mode with ${n} non-featured highlights. Desktop renders in ${CARDS_COLS}-column grid; needs a multiple of ${CARDS_COLS}. Add ${add} or drop ${drop}.`,
        );
      } else {
        okMessages.push(
          `menu "${section.title}": cards mode, 1 featured + ${n} cards fits ${CARDS_COLS}-column grid.`,
        );
      }
    } else if (hasCategories) {
      // Grid mode.
      const cats = [
        ...new Set(highlights.map((h) => h.category).filter(Boolean)),
      ];
      if (cats.length % GRID_COLS !== 0) {
        const drop = cats.length % GRID_COLS;
        const add = GRID_COLS - drop;
        issues.push(
          `menu "${section.title}": grid mode with ${cats.length} categories [${cats.join(", ")}]. Desktop renders in ${GRID_COLS}-column grid; needs a multiple of ${GRID_COLS}. Add ${add} category or drop ${drop}.`,
        );
      } else {
        okMessages.push(
          `menu "${section.title}": grid mode, ${cats.length} categories fit ${GRID_COLS}-column grid.`,
        );
      }
    } else {
      // List mode: no symmetry constraint.
      okMessages.push(
        `menu "${section.title}": list mode, ${highlights.length} highlights (no symmetry constraint).`,
      );
    }
  }

  return { issues, okMessages };
}

async function main() {
  console.log("Validating content against layout contracts...\n");
  const { issues, okMessages } = await validate();
  for (const m of okMessages) console.log(`  ok    ${m}`);
  if (issues.length > 0) {
    console.log("");
    for (const i of issues) console.error(`  FAIL  ${i}`);
    console.error(
      `\n${issues.length} content-vs-layout contract violation(s).`,
    );
    process.exit(1);
  }
  console.log("\nAll content fits the layout contracts.");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
