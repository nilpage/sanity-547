# CLAUDE.md, sanity-generator

Operating mode + hard rules for the agent designing per-lead demos in this
project. Read this before any UI / schema / content work in
`/home/pi/projects/nopage/sanity-generator/`.

## What this project is

Sister track to `../generator/` (React static demos) and `../wp-generator/`
(WordPress demos). Same lead source (`../scan/data/registry.db`), same
quality bar (Awwwards-Honors hand-designed look), but a different
substrate: a Next.js + Sanity site per lead, where the baker can edit
content in a German Studio at `/studio` after the demo converts.

The umbrella `nopage/` is not a git repo. This directory is its own git
repo with its own remote story.

## Reading order before designing

The full design quality bar lives in `../generator/docs/agent/design.md`.
**Read it before any design work.** The same rules apply here, just
expressed through a Sanity schema instead of hand-typed `App.tsx` arrays.
The audit protocol in `../generator/docs/agent/audit.md` is the same.

This file only adds the Sanity-specific deltas to those rules.

## Hard rules, do not break

These rules are why visual bugs ship. If you skip any, expect the user to
catch the failure and ask you to redo the work.

1. **Browser-test every UI / CSS change before reporting it done.** Curl
   alone does not count. Either the user loads the page in a real browser
   and confirms, or `node scripts/validate-visual.mjs` passes. CSS that
   "should align by my math" is the textbook failure mode (Toast Hawaii
   dots, 2026-05-09): math without rendering check is shipping uninspected
   work.

2. **Run both validators before saying done.**
   ```bash
   node scripts/validate-content.mjs
   node scripts/validate-visual.mjs   # when implemented
   ```
   Content validator must exit 0. Visual validator findings must be
   addressed or explicitly waived in the response.

3. **Layout-content contracts**, encoded in `scripts/validate-content.mjs`:
   - `cafe.handwerke` count must be a multiple of 3 (desktop 3-column).
   - Menu sections in cards mode (any highlight has `featured: true`):
     non-featured highlight count must be a multiple of 3.
   - Menu sections in grid mode (highlights have categories): distinct
     category count must be a multiple of 4.
   These are not preferences. They are why the design works at desktop
   width. Adding a 3rd category to a 4-column grid leaves an empty
   column, which the user noticed immediately on Speisekarte.

4. **No em or en dashes in rendered demo content.** Identical rule to
   `../generator/`. Use commas, periods, semicolons, parens, or "bis"
   for ranges. Applies to schema labels, helper text, and any prose in
   `app/`. Does NOT apply to this file or the agent docs.

5. **No real PII in artifacts.** Contact placeholder is
   `deine-app@proton.me`, never the operator's real email. The operator's
   real email is the lead's published address (`cafe.ryser@bluewin.ch`),
   shown as a contact link, never as a form target.

6. **Schema labels and helper text in the lead's primary language.**
   Currently DE only; add bilingual support per lead when needed via
   `@sanity/document-internationalization`. Never ship Sanity Studio
   chrome in English to a German baker.

7. **Pre-populate via `scripts/seed-assets.mjs`, never via Studio
   clicks.** The whole point of the autonomous track is no manual UI
   steps. If a lead needs to be designed, the seed script reads scan
   data, uploads assets, patches docs, validates. The user runs one
   command.

8. **Sanity asset uploads use the @sanity/client write API, not the
   MCP.** The MCP `create_documents_from_json` tool ignores explicit
   `_id` and cannot upload binary assets. The seed script reads the auth
   token from `~/.config/sanity/config.json` (set by `pnpm sanity login`)
   and uploads via `client.assets.upload(kind, buffer, { filename,
   contentType })`.

9. **Per-lead Sanity project, EU data residency.** Swiss DSG / GDPR
   compliance. Set at `sanity init` time (`--data-residency eu`); cannot
   be changed without re-create. CORS for `localhost:3000` is
   automatically registered by `sanity init`.

10. **Type pairing and palette per lead, not project-wide.** Default
    pairing is Newsreader + Manrope (Ryser-tuned). For a hobby shop or
    an Italian deli, pick a different pair from the
    `../generator/docs/agent/design.md` canonical pool (Cormorant,
    Playfair, Italiana, GT Sectra, Recoleta, Fraunces, DM Serif Display,
    Migra, Söhne, Manrope, Public Sans, Space Grotesk, etc.). Never two
    leads with the same pairing.

## Pre-completion checklist

Before saying a piece of work is done, walk this checklist explicitly.
This is not optional.

- [ ] TypeScript compiles (`pnpm exec tsc --noEmit`).
- [ ] Dev server returns 200 on `/` and `/studio` (curl is fine for this).
- [ ] User has loaded the page in a real browser and confirmed, OR
      visual validator passed. Math + curl is not enough.
- [ ] `node scripts/validate-content.mjs` exits 0.
- [ ] No em / en dashes anywhere under `app/`, `sanity/`,
      `scripts/seed-*.mjs`. Check with `grep -rnE "—|–"`.
- [ ] Footer disclaimer + source attribution + `deine-app@proton.me`
      present in rendered HTML.

## Trigger phrases

| User says | You do |
|-----------|--------|
| "design lead 547 via sanity" / "sanity design 547" | per-lead procedure (below) on id 547 |
| "design the next N via sanity" | run the bash loop (below) over N candidates from `demo_candidates`, one fresh `claude -p` spawn per lead |
| "iterate sanity 547" | reload the lead's live URL, eyeball + run validators, fix what's off, push (auto-rebuild fires) |
| "validate sanity 547" | set the lead's project ID env var, run `node scripts/validate-content.mjs` and `node scripts/validate-visual.mjs` |
| "redeploy sanity 547" | re-run `node scripts/deploy.mjs --lead=547 --force` (idempotent steps skip; --force re-imports content) |

## Per-lead procedure (sanity track)

Triggered by "design lead `<id>` via sanity". Walk this in a fresh
session, one lead at a time, deeply (matching `/generator`'s rule).

### 1. Read what `/generator` already produced for this lead

The audit work is already done by `/generator`. Don't repeat it.

- `../generator/data/copy/<id>.facts.json` — business name, category,
  email, snapshot, image URLs.
- `../generator/web/leads/<id>/App.tsx` — the validated content arrays
  (HANDWERKE, FRUEHSTUECK, COUPES, etc.) and prose (intro, team body,
  feature blurbs, hours, holidays). This is the SOURCE OF TRUTH for
  what content goes on the demo. Don't reinvent.
- `../generator/data/repo/d/<hash>/` — harvested assets: hero.jpg,
  team.jpg, logo.png, PDFs. Look up the hash via:
  `select url_hash from demos where business_id = <id>` against
  `../scan/data/registry.db`.

### 2. Hand-author the content brief at `data/leads/<id>.json`

Mirror `data/leads/547.json` (Ryser) as the canonical example. Keys:

- Top-level: `businessId`, `name`, `tagline`, `intro`, `address`,
  `phone`, `email`, `owners`, `locationHint`, `hoursNote`.
- `handwerke`, `team`, `features` from the App.tsx HANDWERKE / TEAM /
  Felchlin/Schwyzer-Örgeli/Terrasse blocks.
- `hours`, `specialHours` from HOURS / HOLIDAYS arrays.
- `menuSections[]`: one per FRUEHSTUECK / SPEISEKARTE / COUPES section,
  with `key`, `title`, `headline`, `pdfFile`, `pdfLabel`, optional
  `subtitle` and `intro`, optional `extras[]`, and `highlights[]` (4
  for list mode, 4 categories for grid mode, featured + 3 cards for
  cards mode — the validator enforces these counts).
- `assets`: hero + logo file names (referring to files in
  `../generator/data/repo/d/<hash>/`).

Rules while authoring:
- No em / en dashes anywhere (replace with commas, periods, "bis"
  for ranges).
- Match the lead's primary language exactly.
- Voice fidelity: keep dialect, exclamation marks, regional words
  ("z'mörgele", "Kaffeklatsch", "Gluscht") verbatim.
- Faithful to facts: never invent prices, services, awards, hours.

### 3. Deploy

```bash
CF_API_TOKEN=...  CF_ACCOUNT_ID=9af9dd6feb9e75d20059b1b815178adb \
  node scripts/deploy.mjs --lead=<id>
```

The script chains: Sanity project (EU) + dataset + CORS + content
import + validators + CF Pages project (named `<hash>`) + deploy hook
+ Sanity webhook + first build. About 3-5 minutes per lead. Idempotent
on re-run (reads `data/sanity-state.json` to skip already-done steps).

### 4. Visual review

```bash
node scripts/validate-visual.mjs --url=https://<hash>.pages.dev/
```

Mandatory before declaring done. The Playwright + claude -p reviewer
flags baseline misalignment, grid orphans, overflow, contrast issues,
mobile breakage. Fix anything it surfaces; push fixes to the shared
template repo (one commit triggers a rebuild for ALL active leads, but
that's fine — the template fix benefits everyone).

### 5. Record state

The deploy script writes to `data/sanity-state.json`. No external
registry update needed unless you want to mirror into
`../scan/data/registry.db`'s `demos` table — that table is `/generator`-
specific; sanity-track demos can live in their own state file or a
parallel `sanity_demos` table. Defer until needed.

## Batch procedure (loop)

For N leads at once, the canonical pattern is one fresh `claude -p`
spawn per lead. From a plain shell, not from inside an interactive
session:

```bash
export CF_API_TOKEN=...
export CF_ACCOUNT_ID=9af9dd6feb9e75d20059b1b815178adb
for id in 547 568 612 ; do
  claude -p "design lead $id via sanity. Read CLAUDE.md, follow the per-lead procedure end to end, and exit when the live URL is up." \
    --output-format text
done
```

Each spawn has clean context, reads CLAUDE.md fresh, follows the
procedure, exits. Failures don't cascade. State persists in
`data/sanity-state.json`. Re-running the loop on already-deployed leads
is a fast no-op (idempotency guard hits early).

Future improvement: a `scripts/design_loop.mjs` that picks candidates
from `../scan/data/registry.db` `demo_candidates` view automatically,
rate-limit-detects, and resumes via state file. The bash loop above is
the minimum viable orchestrator and works today.

## What lives where

- `sanity/schemaTypes/` — TypeScript schemas for cafe, menuSection,
  menuHighlight, aktuell. German labels and helper text. Lead-agnostic.
- `sanity/structure.ts` — Studio nav. Café-Informationen as a
  filtered-list singleton, Menü grouped (Abschnitte + Hervorhebungen),
  Aktuelles flat.
- `sanity/lib/{client,image,queries}.ts` — read-only client and GROQ
  queries used by the front-end.
- `sanity.config.ts` — Studio config, basePath `/studio`, singleton
  templates filter, dev-action filter (no delete / unpublish /
  duplicate on cafe).
- `sanity.cli.ts` — CLI config for `sanity init`.
- `app/` — Next.js app. `app/page.tsx` renders the homepage from Sanity
  data; `app/studio/[[...tool]]/page.tsx` mounts the Studio with
  `next/dynamic` ssr-false (avoids `window is not defined` SSR error).
- `scripts/seed-assets.mjs` — uploads assets, patches docs, runs
  validators. The autonomous-track entry point.
- `scripts/validate-content.mjs` — data-shape contracts. Fast (~1s).
- `scripts/validate-visual.mjs` — Playwright + claude -p review. Slow
  (~30s). When implemented.

## Known shapes from the Ryser PoC

- Project ID: `p16k3ee6`, dataset `production`, EU residency.
- Cafe singleton ID: `c61d4798-d86d-40f8-8907-3685049e7b23` (auto, MCP
  ignores explicit `_id`; structure.ts uses a filtered list to find it).
- Menu sections:
  - Frühstückskarte `6c93eaa8-c4e3-4b29-b4c3-06b22653203d`
  - Speisekarte    `5ef2df35-f98c-490f-984a-25c98b8c9d62`
  - Coupes         `7009ea48-3f17-4249-85a4-f0e7ac0a70e6`
- Highlights: 12 docs (4 Frühstück list + 4 Speisekarte grid + 1 featured
  Coupe + 3 Coupes cards) plus 1 Suppen & Salate item to fill the grid.

## Production wiring

### URL naming convention

Cloudflare Pages project names become the `<name>.pages.dev` subdomain.
**The CF project name MUST be the lead's `url_hash`** from
`../scan/data/registry.db` (8 hex chars, derived via
`HMAC-SHA256(NOPAGE_DEMO_SECRET, str(business_id))[:8]`).

Rationale: leads who saw a `/generator` demo at
`nilpage.github.io/nopage/d/<hash>/` see the same hash at
`<hash>.pages.dev` for the Sanity track. The hash carries the brand
trust we already built. **Never use the lead id (e.g., `sanity-547`),
the framework name (`sanity-`), or any prefix in the CF project name.**
For Ryser (lead 547): hash `a1d44df0` → `a1d44df0.pages.dev`.

GitHub repo names are internal and don't appear in the URL; current
convention is `nilpage/sanity-<lead_id>` (the lead id is fine here for
operator orientation), but the future orchestrator may switch to
`nilpage/<hash>` for full consistency.

### Ryser (lead 547) artifacts

- GitHub repo: `nilpage/sanity-547` (public). Push to `main` triggers
  Cloudflare Pages build. Build command: `pnpm install --frozen-lockfile
  && pnpm build`. Output: `out/`. Node 22.
- Cloudflare Pages project: `a1d44df0`, account
  `9af9dd6feb9e75d20059b1b815178adb`. Live at `https://a1d44df0.pages.dev/`.
  Production env vars set on the CF project:
  `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET`,
  `NEXT_PUBLIC_SANITY_API_VERSION`.
- CF Pages deploy hook: id `1b76eae3-aff8-477f-ac4f-9bb709063ab1`.
  POST to `https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/<id>`
  triggers a build on `main`. Unauthenticated.
- Sanity webhook: id `tyFQ1spsE6yYtpbn`, fires on create/update/delete of
  `cafe`, `menuSection`, `menuHighlight`, `aktuell`, only on published
  documents (`includeDrafts: false`). Targets the CF deploy hook URL.
  Round-trip from publish to live: roughly 60–120 s (Sanity webhook
  delivery + CF Pages build).
- Sanity CORS origins for the live Studio: `http://localhost:3000`,
  `https://a1d44df0.pages.dev`, `https://*.a1d44df0.pages.dev`.
  (Stale `sanity-547.pages.dev` entries from the original deploy are
  harmless and can be removed later via the Manage API.)

## Multi-tenant architecture

One shared template repo (`nilpage/sanity-547`, kept name for now)
serves as the source for ALL leads' CF Pages projects. The repo is
generic: it reads `NEXT_PUBLIC_SANITY_PROJECT_ID` etc. at build time
and renders that project's content.

Per lead:
- One Sanity project (EU residency, free tier).
- One CF Pages project named `<hash>`, sourcing the shared repo, env
  vars pointing at the lead's Sanity project ID.
- One CF deploy hook, one Sanity webhook tying them together.
- One row in `data/sanity-state.json` recording all the IDs.

A code-level template fix pushed to `nilpage/sanity-547`'s `main`
auto-rebuilds every active lead's CF Pages project. That's a feature:
one commit fixes everyone. Be careful with breaking changes — visual
regression should run on at least one lead before pushing template
changes. Check `data/sanity-state.json` for live URLs.

## One-time setup (already done for the current account)

- Cloudflare Pages GitHub App installed on `nilpage` org with all-
  repos access. (`https://github.com/apps/cloudflare-pages` → Configure)
- `pnpm sanity login` ran once; auth token cached at
  `~/.config/sanity/config.json`.
- `CF_API_TOKEN` + `CF_ACCOUNT_ID` env vars set in your shell.

`scripts/deploy.mjs` reads the Sanity token from the config file and
the CF credentials from env. No interactive steps.

## Failure modes already encountered

| Symptom | Root cause | Catch |
|---------|-----------|-------|
| Studio renders blank with errors | `_id` in `.env.local` declared twice (first empty), or empty | Validator with env shape check; for now, the seed script exits with a clear message |
| `window is not defined` on `/studio` SSR | `NextStudio` accesses `window` at module load | Use `next/dynamic` with `ssr: false` |
| Coupes grid shows 2 cards in a 3-column row | Non-featured count is 2, not a multiple of 3 | Content validator |
| Speisekarte shows 3 categories in a 4-column row | Distinct categories not a multiple of 4 | Content validator |
| Toast Hawaii dotted leader sits below the price baseline | `align-self: end` + `margin-bottom` math vs italic-serif baseline | Visual validator (TODO); for now, flex baseline + em-based dots height |
| Sanity Studio chrome in English | i18n locale not configured | Add `@sanity/locale-de-DE` plugin (TODO) |

When a new failure mode is found, add it here with the symptom, root
cause, and where it should be caught. The table is the project's
collective memory; if it grows, the validators grow with it.
