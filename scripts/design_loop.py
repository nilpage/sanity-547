#!/usr/bin/env python3
"""Per-lead orchestrator for the sanity-generator track.

Mirrors `generator/scripts/design_loop.py`:

- Picks leads from `../scan/data/registry.db`'s `demos` table that have a
  `/generator` demo built (so the App.tsx + audit + harvested assets
  exist) and don't yet have a sanity deployment recorded in
  `data/sanity-state.json`.
- Spawns one fresh `claude -p "design lead <id> via sanity"` per lead.
  Each spawn reads `CLAUDE.md`, walks the per-lead procedure, and exits
  when the lead's live URL is up.
- Watches stdout for rate-limit signals; exits the loop gracefully if
  hit, leaving `in_flight` in the state file so a `--resume` run picks
  up where it left off.
- Per-lead log appended to `data/design_loop.log`. Loop state at
  `data/design_loop.state.json`.

Stdlib only, no `uv` or `pyproject.toml` needed.

Usage:
  python3 scripts/design_loop.py --max-leads 5
  python3 scripts/design_loop.py --leads 547,568,612
  python3 scripts/design_loop.py --resume
  python3 scripts/design_loop.py --dry-run

Pre-flight (one-time per shell session):
  export CF_API_TOKEN=cfat_...
  export CF_ACCOUNT_ID=9af9dd6feb9e75d20059b1b815178adb
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import sqlite3
import subprocess
import sys
import time
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
REGISTRY_DB = REPO_ROOT.parent / "scan" / "data" / "registry.db"
SANITY_STATE_FILE = REPO_ROOT / "data" / "sanity-state.json"
LOOP_STATE_FILE = REPO_ROOT / "data" / "design_loop.state.json"
LOOP_LOG_FILE = REPO_ROOT / "data" / "design_loop.log"
LOCKFILE = REPO_ROOT / "data" / "design_loop.lock"

PROMPT_TEMPLATE = (
    "Design lead {lead_id} via the sanity track. Read "
    "/home/pi/projects/nopage/sanity-generator/CLAUDE.md and follow the "
    "per-lead procedure end to end. Author the content brief at "
    "data/leads/{lead_id}.json from /generator's facts.json + App.tsx, "
    "then run scripts/deploy.mjs --lead={lead_id}, then "
    "scripts/validate-visual.mjs against the live URL. Exit when the "
    "live URL is reachable and the visual validator is clean. Do NOT "
    "ask for confirmation; the loop runs autonomously."
)

# Substring matches that signal the loop should stop and resume later.
RATE_LIMIT_PATTERNS = ("rate limit", "rate-limit", "usage limit reached", "429")


# ─── state ────────────────────────────────────────────────────────────


def load_sanity_state() -> dict:
    if not SANITY_STATE_FILE.exists():
        return {"leads": {}}
    return json.loads(SANITY_STATE_FILE.read_text())


def load_loop_state() -> dict:
    if not LOOP_STATE_FILE.exists():
        return {"completed": [], "failed": [], "in_flight": None}
    s = json.loads(LOOP_STATE_FILE.read_text())
    s.setdefault("completed", [])
    s.setdefault("failed", [])
    s.setdefault("in_flight", None)
    return s


def save_loop_state(state: dict) -> None:
    LOOP_STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    LOOP_STATE_FILE.write_text(json.dumps(state, indent=2) + "\n")


def append_log(text: str) -> None:
    LOOP_LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
    with LOOP_LOG_FILE.open("a", encoding="utf-8") as f:
        f.write(text)
        if not text.endswith("\n"):
            f.write("\n")


# ─── lockfile ────────────────────────────────────────────────────────


def acquire_lock() -> None:
    if LOCKFILE.exists():
        held_pid = LOCKFILE.read_text().strip()
        try:
            os.kill(int(held_pid), 0)
            raise SystemExit(
                f"Another design_loop is running (PID {held_pid}). "
                f"Wait or `kill {held_pid}` and retry."
            )
        except (ProcessLookupError, ValueError):
            print(f"Stale lockfile from PID {held_pid}, superseding.")
    LOCKFILE.parent.mkdir(parents=True, exist_ok=True)
    LOCKFILE.write_text(str(os.getpid()))


def release_lock() -> None:
    if LOCKFILE.exists():
        try:
            LOCKFILE.unlink()
        except OSError:
            pass


# ─── candidate selection ─────────────────────────────────────────────


def candidates_from_registry() -> list[int]:
    if not REGISTRY_DB.exists():
        raise SystemExit(f"Registry DB not found: {REGISTRY_DB}")
    con = sqlite3.connect(str(REGISTRY_DB))
    try:
        rows = con.execute(
            "SELECT business_id FROM demos "
            "WHERE status='built' "
            "ORDER BY business_id"
        ).fetchall()
    finally:
        con.close()
    return [r[0] for r in rows]


def deployed_lead_ids(sanity_state: dict) -> set[int]:
    return {int(k) for k in sanity_state.get("leads", {}).keys()}


def pick_leads(args, sanity_state: dict, loop_state: dict) -> list[int]:
    if args.leads:
        return [int(x) for x in args.leads.split(",") if x.strip()]
    deployed = deployed_lead_ids(sanity_state)
    completed = set(loop_state["completed"])
    failed = set(loop_state["failed"])
    skip = deployed | completed | failed
    available = [c for c in candidates_from_registry() if c not in skip]
    if args.resume and loop_state["in_flight"]:
        in_flight = loop_state["in_flight"]
        available = [in_flight] + [l for l in available if l != in_flight]
    return available[: args.max_leads]


# ─── per-lead spawn ──────────────────────────────────────────────────


def preflight() -> None:
    missing = [k for k in ("CF_API_TOKEN", "CF_ACCOUNT_ID") if not os.environ.get(k)]
    if missing:
        raise SystemExit(
            f"Missing env vars: {', '.join(missing)}. "
            f"Set them before running the loop."
        )


def run_lead(lead_id: int) -> tuple[int, bool]:
    """Spawn a fresh `claude -p` for the lead. Returns (exit_code, rate_limited)."""
    prompt = PROMPT_TEMPLATE.format(lead_id=lead_id)
    started = dt.datetime.now(dt.timezone.utc).isoformat()
    append_log(f"\n=== {lead_id} starting at {started} ===")

    cmd = [
        "claude",
        "-p",
        prompt,
        "--output-format",
        "text",
    ]
    proc = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        cwd=str(REPO_ROOT),
        env={**os.environ},
        bufsize=1,
        text=True,
    )

    rate_limited = False
    assert proc.stdout is not None
    for raw in proc.stdout:
        line = raw.rstrip("\n")
        print(f"  [lead {lead_id}] {line}")
        append_log(line)
        low = line.lower()
        if any(p in low for p in RATE_LIMIT_PATTERNS):
            rate_limited = True
            append_log(f"=== [rate-limit] detected on lead {lead_id} ===")

    code = proc.wait()
    finished = dt.datetime.now(dt.timezone.utc).isoformat()
    append_log(f"=== {lead_id} exit {code} at {finished} ===")
    return code, rate_limited


# ─── main ────────────────────────────────────────────────────────────


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--max-leads", type=int, default=5, help="how many candidates to process (default: 5)")
    ap.add_argument("--leads", type=str, default=None, help="explicit comma-separated list, e.g. 547,568,612")
    ap.add_argument("--resume", action="store_true", help="if a lead is in_flight from a prior run, do it first")
    ap.add_argument("--dry-run", action="store_true", help="print the candidate list and exit")
    args = ap.parse_args()

    if not args.dry_run:
        preflight()
    acquire_lock()
    try:
        sanity_state = load_sanity_state()
        loop_state = load_loop_state()
        leads = pick_leads(args, sanity_state, loop_state)

        if not leads:
            print("No candidates to process. (All deployed or already attempted.)")
            return

        print(f"Candidates: {leads}")
        if args.dry_run:
            return

        for lead_id in leads:
            loop_state["in_flight"] = lead_id
            save_loop_state(loop_state)
            print(f"\n=== lead {lead_id} ===")
            t0 = time.time()
            code, rate_limited = run_lead(lead_id)
            dur = time.time() - t0

            sanity_state = load_sanity_state()
            deployed = lead_id in deployed_lead_ids(sanity_state)

            if rate_limited:
                print(f"=== [rate-limit] hit on lead {lead_id} after {dur:.0f}s. Stopping loop. ===")
                break

            if deployed:
                loop_state["completed"].append(lead_id)
                print(f"  -> deployed in {dur:.0f}s")
            else:
                loop_state["failed"].append(lead_id)
                print(f"  -> failed (exit {code}) after {dur:.0f}s")

            loop_state["in_flight"] = None
            save_loop_state(loop_state)

        print(
            f"\nLoop done. completed={len(loop_state['completed'])} "
            f"failed={len(loop_state['failed'])} "
            f"in_flight={loop_state['in_flight']}"
        )
    finally:
        release_lock()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        release_lock()
        print("\nInterrupted; lock released.")
        sys.exit(130)
