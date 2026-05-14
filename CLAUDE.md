# CLAUDE.md, sanity-generator

The brief for the fresh Claude session that designs each per-lead demo. Read
it once at the start of the lead. Trust your own judgment for the rest.

## What this project is

Sister to `../generator/` (React static demos) and `../wp-generator/`
(WordPress demos). Same lead source (`../scan/data/registry.db`), same
quality bar, different substrate: each lead gets a Next.js + Sanity
site they can edit themselves in a German Studio at `/studio` after the
demo converts.

The umbrella `nopage/` is not a git repo. This directory is its own git
repo with its own remote.

## What you're selling

A demo that converts because it is, in this order:

1. **Editable.** The owner can change words, swap photos, add news, tweak
   hours. They feel ownership when they log into `/studio`. Field names
   and labels in their world, not ours.
2. **Beautiful.** Hits the bar in `../generator/docs/agent/design.md`.
   No template tells. No filler. No AI register.
3. **Informative.** A real replacement, not a teaser. Every meaningful
   thing on their current site is on the demo, in better form.

A demo that fails on any of those three doesn't sell. Most "good
enough" demos fail on (3) by skipping the audit, or on (1) by leaving
Studio in a state where the owner sees Café-Informationen while
running a hair salon.

## Read before designing

- `../generator/docs/agent/design.md` — design quality bar, soul-read,
  customer-target audience, anti-patterns, type pairings. Same rules
  as /generator. Read it once.
- `../generator/docs/agent/audit.md` — site-audit protocol. The audit
  output `../generator/data/copy/<id>.audit.md` is the source of truth
  for content. If it exists, read it. If it doesn't, you walk audit.md
  and write it yourself; the protocol is the same as /generator's,
  because the underlying lead is the same.

This file deliberately doesn't repeat those. It only covers what's
specific to the Sanity substrate.

## How to think about a lead

You are not filling a template. You are designing a demo for one
specific small business.

The schemas in `sanity/schemaTypes/` were shaped for Café Konditorei
Ryser, the first lead. They are a **starting point**, not a template
of what every lead must contain. Most fields are optional. For a
copyshop, you'll keep `business name + intro + services + hours +
contact` and drop the team / menuSection / specialHours machinery
entirely. For a hairdresser, the `menuSection` + `menuHighlight`
structure works for treatments, but the labels say "Menü-Abschnitt"
and "Hausspezialität" — which is wrong in a salon's Studio. **Rename
them in the schema files** for that lead before deploying, so the
salon owner sees their own world.

Editing schemas per-lead is fine. The shared template
(`nilpage/sanity-547`, kept name) is just where the working copy
lives. If your lead's schemas diverge enough from Ryser's, that's the
right outcome — the owner's Studio is the product.

Authoring the demo is a design exercise, not a data-entry exercise.
Walk the audit deeply; pick sections that fit the lead's content;
strip what doesn't apply; build a brief; deploy; review the rendered
result.

## Non-negotiables

The few rules that exist because breaking them ends the sale:

- **Contact email is `deine-app@proton.me`.** Always. Never the
  operator's real address. Never the lead's published address in a
  form's `mailto:` target — that's a contact link only, not a submit
  endpoint.
- **No em dashes (—) or en dashes (–) in rendered content.** Use
  commas, periods, semicolons, parens, hyphen-minus, or "bis" for
  ranges. Applies to schema labels, helper text, content briefs, and
  anything that ends up in the rendered HTML. Does NOT apply to this
  file or the agent docs.
- **No invented content.** Hours, prices, owner names, awards,
  suppliers — only what the audit found. If the lead's site doesn't
  say their hours, the demo doesn't either.
- **No AI register, no Unsplash, no AI imagery.** Voice fidelity
  from the audit's verbatim quotes. Photos from the lead's own site
  or typography-only fallback.
- **EU data residency on every Sanity project.** Swiss DSG / GDPR.
  Already wired in `deploy.mjs`; don't bypass it.
- **Publish-target org is `nilpage`.** Never autodetected from `git
  config` or env.
- **Sanity Studio chrome in the lead's primary language.** German
  default for Swiss leads. Romandie leads need French; add the locale
  plugin for that project.

## Per-lead procedure

1. **Audit.** Read `../generator/data/copy/<id>.audit.md` if it
   exists. If not, walk `../generator/docs/agent/audit.md`. The pre-
   design checklist in audit.md is the same here.
2. **Shape the schema** to fit this lead. Rename labels and helper
   text so the owner's Studio reads naturally. Drop fields that don't
   apply; add fields the lead clearly needs (e.g. a `gallery` for a
   photo-heavy lead, a `services` array for a service business).
3. **Author the brief** at `data/leads/<id>.json` matching whatever
   shape the page expects. The Ryser brief at `data/leads/547.json`
   is one example, not the contract.
4. **Update `app/page.tsx`** if the section set diverges from Ryser's.
   The current page renders Hero → Intro → Handwerke → Team → Menus
   → Features → Hours → Visit; change the order or set as the lead
   demands. The render is yours to shape.
5. **Deploy:**
   ```bash
   node scripts/deploy.mjs --lead=<id>
   ```
6. **Open the live URL** and look at it. Run
   `node scripts/validate-visual.mjs --url=<live url>` for an
   automated review. If something is off at the template level (CSS
   bug, missing render branch), push the fix to
   `nilpage/sanity-547`'s `main` — every active lead rebuilds on next
   webhook, so make the fix general.
7. **Done** when the live URL renders, the visual review is clean,
   and the owner's Studio reads in their own world.

## Batch loop

`scripts/design_loop.py` runs the procedure across multiple leads,
one fresh `claude -p` per lead so context never carries.

```bash
export CF_API_TOKEN=...
export CF_ACCOUNT_ID=9af9dd6feb9e75d20059b1b815178adb

python3 scripts/design_loop.py --max-leads 5
python3 scripts/design_loop.py --leads 547,568
python3 scripts/design_loop.py --resume
python3 scripts/design_loop.py --dry-run
```

State at `data/design_loop.state.json`, log at `data/design_loop.log`,
PID lockfile at `data/design_loop.lock`. Failures don't cascade.
Re-running on already-deployed leads is a fast no-op.

## What lives where

- `sanity/schemaTypes/` — TypeScript schemas. Starting point only;
  reshape per-lead.
- `sanity/structure.ts` — Studio nav.
- `sanity/lib/{client,image,queries}.ts` — read-only client + GROQ
  queries used by the front-end.
- `sanity.config.ts` — Studio config, basePath `/studio`, singleton
  templates filter.
- `app/page.tsx` — homepage renderer. Reshape per-lead when needed.
- `app/studio/[[...tool]]/{page,StudioClient}.tsx` — Studio mount
  with `next/dynamic` ssr-false.
- `scripts/deploy.mjs` — per-lead deploy chain (Sanity project + CF
  Pages + webhook wiring).
- `scripts/validate-visual.mjs` — Playwright + claude -p visual review.
- `scripts/design_loop.py` — batch orchestrator.
- `scripts/import-from-generator.mjs` — content import from the brief.
- `data/leads/<id>.json` — per-lead brief.
- `data/sanity-state.json` — per-lead deployment artefacts (project
  IDs, hook IDs, live URLs).

## Sanity asset handling

Assets upload via `@sanity/client`'s write API
(`client.assets.upload(kind, buffer, { filename, contentType })`).
Auth token from `~/.config/sanity/config.json` (set by `pnpm sanity
login`). The MCP `create_documents_from_json` tool can't upload
binaries and ignores explicit `_id` on document creation; don't rely
on it for asset paths or deterministic IDs.

## Production wiring

### URL naming

Cloudflare Pages project name = the lead's `url_hash` from
`scan/data/registry.db` (`HMAC-SHA256(NOPAGE_DEMO_SECRET,
str(business_id))[:8]`). For Ryser (547): hash `a1d44df0` →
`https://a1d44df0.pages.dev/`.

Rationale: the hash matches /generator's `nilpage.github.io/nopage/d/<hash>/`
URL, so leads who saw the /generator demo recognise the trust
already built. Never use `sanity-<id>`, `<framework>-<id>`, or any
prefix.

### Ryser (lead 547) artifacts

- GitHub repo: `nilpage/sanity-547` (public, shared template). Push
  to `main` rebuilds every active lead.
- CF Pages project: `a1d44df0`, account
  `9af9dd6feb9e75d20059b1b815178adb`. Live at
  `https://a1d44df0.pages.dev/`. Production env vars:
  `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET`,
  `NEXT_PUBLIC_SANITY_API_VERSION`.
- CF deploy hook id: `1b76eae3-aff8-477f-ac4f-9bb709063ab1`.
- Sanity project: `p16k3ee6`, dataset `production`, EU residency.
- Sanity webhook id: `tyFQ1spsE6yYtpbn` (fires on create/update/delete
  of `cafe`, `menuSection`, `menuHighlight`, `aktuell`).
- Sanity CORS: `http://localhost:3000`, `https://a1d44df0.pages.dev`,
  `https://*.a1d44df0.pages.dev`.

Publish-to-live round-trip: ~60–120s (Sanity webhook + CF Pages
build).

## Multi-tenant architecture

One shared template repo (`nilpage/sanity-547`) serves N CF Pages
projects, one per lead. Per lead:

- One Sanity project (EU, free tier).
- One CF Pages project named `<hash>`, sourcing the shared repo, env
  vars pointing at the lead's Sanity project.
- One CF deploy hook + one Sanity webhook tying them together.
- One row in `data/sanity-state.json`.

A template fix pushed to `main` rebuilds every active lead. Visual-
review at least one lead before pushing breaking changes — the live
URLs are in `data/sanity-state.json`.

## One-time setup (done for the current account)

- Cloudflare Pages GitHub App installed on `nilpage` org, all-repos
  access.
- `pnpm sanity login` once; auth token cached.
- `CF_API_TOKEN` + `CF_ACCOUNT_ID` env vars set in your shell when
  running `deploy.mjs` or `design_loop.py`.

## Failure modes already seen

| Symptom | Cause | Fix |
|---------|-------|-----|
| Studio blank on `/studio` SSR | `NextStudio` touches `window` at module load | `next/dynamic` with `ssr: false` (already done) |
| `_id` env duplicated / empty | `.env.local` declared `NEXT_PUBLIC_SANITY_PROJECT_ID=` twice | `deploy.mjs` writes the file fresh on each run |
| Sanity Studio chrome in English | i18n locale plugin missing | Add `@sanity/locale-de-DE` (or fr-FR / it-IT) to the per-lead Studio |
| MCP `create_documents_from_json` returns UUIDs even with explicit `_id` | MCP limitation | Use `@sanity/client` directly |
| Visual misalignment (dotted leaders, baseline drift) | CSS math without a render check | Run `validate-visual.mjs` before declaring done |

Add to the table when you find something new. The point of the table
is to short-circuit the second occurrence.
