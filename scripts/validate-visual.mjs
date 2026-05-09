// Visual QA via headless chromium screenshots + a `claude -p` reviewer.
//
// Mirrors generator/'s "Claude conversation as the LLM step" pattern: spawn
// a fresh claude CLI subprocess, hand it the screenshot paths, get back
// structured JSON findings. The current Claude session never sees the raw
// pixels; only the structured review.
//
// Usage:
//   node scripts/validate-visual.mjs [--url=http://localhost:3000/]
//
// Or import { validateVisual } from another script.

import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { chromium } from "playwright";

const VIEWPORTS = [
  { name: "mobile", width: 375, height: 812 },
  { name: "tablet", width: 1024, height: 800 },
  { name: "desktop", width: 1440, height: 900 },
];

const REVIEW_PROMPT = (paths) => `You are a visual QA reviewer for a Swiss café demo website. Read all three screenshots:

- mobile (375 px):  ${paths.mobile}
- tablet (1024 px): ${paths.tablet}
- desktop (1440 px): ${paths.desktop}

The site is for Café Konditorei Ryser in Schwyz. Quality bar: Awwwards-Honors hand-designed look, decisive cocoa+paper+caramel palette, Newsreader+Manrope type pairing.

Check for visual bugs in this priority order:

1. Leader-dot baseline alignment. In Speisekarte (4-column menu) and Öffnungszeiten (hours table), each row has: name, dotted leader line, price. The dotted line MUST sit on the text baseline. If the dots float above the baseline or below the price descender, flag it. This is the single most common bug; check every row in every column carefully.
2. Grid orphan rows. A 3-column grid with N cards where N % 3 != 0 leaves a broken last row; same for 4-column grids. Flag any section where the last row has fewer items than the column count.
3. Featured card layout. The "Hausspezialität" Coupe Ryser must span full width in cards mode. Verify it does.
4. Text overflow or truncation, anywhere.
5. Image aspect-ratio distortion, especially the team photo and hero.
6. Contrast and legibility, especially light text on light backgrounds.
7. Mobile (375 px): no horizontal scroll, no overlapping elements, no text smaller than 14 px, every section reachable.

Respond with strict JSON inside a fenced \`\`\`json code block. No prose outside the fence. Schema:

\`\`\`json
{
  "issues": [
    {
      "viewport": "mobile" | "tablet" | "desktop",
      "section": "<section name, e.g. Speisekarte, Coupes, hero, Öffnungszeiten>",
      "severity": "high" | "medium" | "low",
      "description": "<specific and actionable, e.g. 'Toast Hawaii dotted leader sits 4 px below the Fr. 11.00 baseline'>"
    }
  ]
}
\`\`\`

If clean, output \`{"issues": []}\` inside the fence.`;

async function captureScreenshots(url, outDir) {
  mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const paths = {};
  try {
    for (const vp of VIEWPORTS) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 1,
      });
      const page = await context.newPage();
      await page.goto(url, { waitUntil: "networkidle", timeout: 30_000 });
      // Give fonts and Sanity images a beat to settle.
      await page.waitForTimeout(800);
      const path = join(outDir, `${vp.name}.png`);
      await page.screenshot({ path, fullPage: true, type: "png" });
      paths[vp.name] = path;
      await context.close();
    }
  } finally {
    await browser.close();
  }
  return paths;
}

function runClaude(prompt) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "claude",
      ["-p", prompt, "--allowed-tools", "Read"],
      {
        stdio: ["ignore", "pipe", "pipe"],
        env: process.env,
      },
    );
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`claude exited ${code}\n${stderr}`));
      } else {
        resolve(stdout);
      }
    });
    child.on("error", reject);
  });
}

function extractJson(raw) {
  const fence = /```json\s*([\s\S]*?)```/i.exec(raw);
  const candidate = fence ? fence[1] : raw;
  try {
    return JSON.parse(candidate);
  } catch {
    const match = /\{[\s\S]*\}/.exec(candidate);
    if (!match) throw new Error("no JSON found in claude output");
    return JSON.parse(match[0]);
  }
}

export async function validateVisual({
  url = "http://localhost:3000/",
  outDir = join(tmpdir(), "sanity-visual"),
} = {}) {
  console.log(`Capturing screenshots from ${url} ...`);
  const paths = await captureScreenshots(url, outDir);
  for (const [name, p] of Object.entries(paths)) {
    console.log(`  ${name}: ${p}`);
  }
  console.log("\nReviewing with claude -p ...");
  const raw = await runClaude(REVIEW_PROMPT(paths));
  const parsed = extractJson(raw);
  const issues = parsed.issues ?? [];
  return { issues, raw, paths };
}

async function main() {
  const args = process.argv.slice(2);
  const urlArg = args.find((a) => a.startsWith("--url="));
  const url = urlArg ? urlArg.slice("--url=".length) : "http://localhost:3000/";

  const { issues } = await validateVisual({ url });
  if (issues.length === 0) {
    console.log("\nVisual review: clean.");
    return;
  }
  console.log(`\nVisual review: ${issues.length} issue(s) found.\n`);
  for (const i of issues) {
    const sev = i.severity?.toUpperCase() ?? "?";
    console.log(`  [${sev}] ${i.viewport} / ${i.section}: ${i.description}`);
  }
  process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error("\nERROR:", err.message ?? err);
    process.exit(1);
  });
}
