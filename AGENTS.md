# AGENTS.md — rules for every coding agent in this repo

Four humans each drive their own agent (Claude Code, Codex/GPT, etc.) and push at
the same time. These rules exist so nobody's agent breaks anybody else's work.
Read this whole file before your first change in a session.

## 1. Know your lane

Each person owns one area. Work inside your owner's lane. If you must touch
another lane, keep the change minimal and say so in the PR title (`[cross-lane]`).

| Lane | Owner | Directories |
|------|-------|-------------|
| Frontend | _TBD_ | `web/` |
| Backend / API | _TBD_ | `api/` |
| AI / data | _TBD_ | `ai/` |
| Glue / infra / demo | _TBD_ | `scripts/`, `.github/`, deploy config, `README` |
| **Shared contracts** | everyone (see §3) | `shared/` |

(Fill in owners and adjust directories once the stack is picked. Edit this table
in its own tiny PR so it merges fast.)

## 2. Git workflow — always

1. Start from fresh main: `git fetch origin && git switch -c <you>/<topic> origin/main`
   - `<you>` = owner's first name, e.g. `jon/login-page`. One branch per task.
2. Keep branches **small and short-lived** (aim: merged within ~1 hour).
   Small PRs are what keep four parallel agents conflict-free.
3. Before pushing: `git fetch origin && git rebase origin/main`, then run
   `./scripts/check.sh`. Fix anything it reports. Do not push red.
4. Push and open a PR: `gh pr create --fill` (or via the GitHub UI). Then enable
   auto-merge: `gh pr merge --auto --squash`. It merges itself once CI is green.
5. After merge, start the next task from fresh `origin/main` — never keep
   building on a merged branch.

Never:
- push to `main` directly, force-push to `main`, or force-push someone else's branch
- rewrite history that's already in `main`
- commit secrets (`.env`, API keys). Use `.env.example` with placeholder values.
- run `git add -A` blindly — check `git status` first so you don't commit
  generated junk or another agent's half-finished files

If a person runs more than one agent at once, give each its own
`git worktree add ../hacktx2026-<topic> -b <you>/<topic> origin/main` so they
don't share a working tree.

## 3. Shared contracts (`shared/`)

API shapes, shared types, DB schema, and env var names live in `shared/`. This is
how lanes work in parallel without waiting on each other: agree on the contract,
then build both sides against it.

- Changing a contract = its own small PR, prefixed `[contract]`, merged before
  the code that depends on it.
- Prefer **additive** changes (new optional fields, new endpoints). Don't rename
  or remove things other lanes use without the owner's OK.
- Until the real backend exists, frontend uses mocks that match the contract.

## 4. Conflict hot-spots

- **Lockfiles** (`package-lock.json`, `pnpm-lock.yaml`, `uv.lock`, ...): on
  conflict, don't hand-merge. Take main's version and re-run the install command.
- **Dependency manifests**: adding a dependency is fine; don't bump or remove
  others' deps without asking.
- **Central registries** (route lists, nav menus, barrel `index` files): add
  your line, don't reorder or reformat existing lines.
- **Formatting**: don't reformat files you aren't otherwise changing. Mass
  reformat diffs cause conflicts for everyone.

If you hit a merge conflict in another lane's code, stop and tell your human
rather than guessing.

## 5. Tasks

Tasks live in GitHub Issues. Before starting, assign yourself
(`gh issue edit <n> --add-assignee @me`) so no two agents do the same thing.
Put `Closes #<n>` in the PR body.

## 6. Commands

- Check (lint + typecheck + tests): `./scripts/check.sh` — CI runs the same thing.
- _Add run/dev commands here once the stack exists._
