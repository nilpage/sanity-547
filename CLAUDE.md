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
| "iterate sanity ryser" | reload current Ryser site, eyeball, fix what's off, re-validate |
| "validate sanity" | run both validators, report findings |
| "seed sanity ryser" | re-run `scripts/seed-assets.mjs` (idempotent) |

## Per-lead procedure (sanity track)

To be filled in once the per-lead orchestrator is built. Currently the
flow is:

1. `pnpm sanity login` and `pnpm sanity init --create-project` (one-time
   per lead, EU residency).
2. Set `NEXT_PUBLIC_SANITY_PROJECT_ID` in `.env.local`.
3. Run `node scripts/seed-assets.mjs` (uploads assets, patches docs,
   validates content).
4. Run `pnpm dev`, check `/` and `/studio` in a browser. Iterate the
   design until both validators are clean and the user has eyeballed.
5. (TODO) Deploy to Vercel via `vercel deploy --prod`.
6. (TODO) Record the demo row in the registry, mirroring
   `../generator/scripts/record_demo.py`.

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

- GitHub repo: `nilpage/sanity-547` (public). Push to `main` triggers
  Cloudflare Pages build. Build command: `pnpm install --frozen-lockfile
  && pnpm build`. Output: `out/`. Node 22.
- Cloudflare Pages project: `sanity-547`, account
  `9af9dd6feb9e75d20059b1b815178adb`. Live at `sanity-547.pages.dev`.
  Production env vars set on the CF project: `NEXT_PUBLIC_SANITY_PROJECT_ID`,
  `NEXT_PUBLIC_SANITY_DATASET`, `NEXT_PUBLIC_SANITY_API_VERSION`.
- CF Pages deploy hook: id `46ec3b29-7d62-4d62-b8df-e8a5569298fc`.
  POST to `https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/<id>`
  triggers a build on `main`. Unauthenticated.
- Sanity webhook: id `A3TEsubCgSnCwdUj`, fires on create/update/delete of
  `cafe`, `menuSection`, `menuHighlight`, `aktuell`, only on published
  documents (`includeDrafts: false`). Targets the CF deploy hook URL.
  Round-trip from publish to live: roughly 60–120 s (Sanity webhook
  delivery + CF Pages build).
- Sanity CORS origins for the live Studio: `http://localhost:3000`,
  `https://sanity-547.pages.dev`, `https://*.sanity-547.pages.dev`.

## Per-lead deploy script (TODO)

`scripts/deploy.mjs` should encapsulate the per-lead chain we ran by
hand for Ryser:

1. `gh repo create nilpage/sanity-<lead>` from the lead's directory.
2. `git push -u origin main`.
3. CF Pages: `POST /accounts/{id}/pages/projects` with `source.type:
   github`, build_config (pnpm/out/22), and the three Sanity env vars.
4. CF Pages: `POST /accounts/{id}/pages/projects/<name>/deploy_hooks` to
   register the webhook URL we hand back to Sanity.
5. Sanity: `POST https://<project>.api.sanity.io/v2025-02-19/hooks/projects/<project>`
   with `type=document`, `rule.on=[create,update,delete]`,
   `rule.filter` for the four schema types, `rule.projection="{}"`,
   `httpMethod=POST`, targeting the CF deploy hook URL.
6. Sanity CORS: `POST` `add-cors-origin` for the new pages.dev domain
   (and any custom domain). Done via `mcp__Sanity__add_cors_origin` in
   this conversation; the script equivalent is the management API call.
7. Trigger first build: `POST /accounts/{id}/pages/projects/<name>/deployments`.
8. Print the live URL.

The CF GitHub App must be installed on the `nilpage` org once
(`https://github.com/apps/cloudflare-pages` → Configure → All
repositories). One-time per org, not per lead.

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
