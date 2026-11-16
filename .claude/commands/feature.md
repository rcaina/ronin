---
name: feature
description: Plan a whole feature, split it into vertical slices, then build each slice end to end (stubs, then implementation, then self-verification). Two modes - co-work pauses for the user's review between tasks; autonomous stops at plan approval or a plan deviation, commits each task locally, and runs through finish in its own worktree. Tracked in a per-branch manifest that survives /clear, with a handoff written between tasks so each task starts from a fresh context.
argument-hint: "start [--auto] <description> | resume [<branch>] | checkpoint | pause | finish | clean-manifests | mode co-work|auto"
---

Plan the whole feature, then build it task by task. Inside a task, work
without asking: stub, implement, verify. The goal is small reviews where it is
obvious what is new. One task is one diff, whichever mode runs it.

Arguments: $ARGUMENTS

## Modes

- **Co-work** (default). The user works alongside in their editor on this
  checkout. Stop after every task for review; the user commits.
- **Autonomous** (`start --auto`). The user hands the feature off. Stop once,
  at plan approval; after that, commit each task locally and run straight
  through `finish`. Each task is still one commit, reviewed afterwards.

The mode is the manifest's `Mode:` line. `/feature mode co-work|auto` switches
it at any stop. Switching to auto needs the commit authorization (see Commits)
and a worktree: refuse it in the main checkout.

## Location and database

Record the manifest's `Location:` at `start` and check it at every `resume`:

- **Main checkout**: `git rev-parse --show-toplevel` is the first entry of
  `git worktree list`. Co-work only.
- **Worktree**: any other entry. Run `pnpm install` once if `node_modules` is
  missing. Auto mode is allowed here.

Every checkout reads the same `DATABASE_URL`, so a migration applied from a
worktree lands in the database the user's main checkout uses. Never read or
edit `.env` files to find out which database that is. When the Plan has
migrations, ask at the plan stop whether `DATABASE_URL` points at a local
database it is fine to migrate, and record the answer under Decisions. No task
runs `pnpm db:generate` without that recorded yes.

## Shape

Co-work:

```
plan ─► STOP: user approves plan
task 1: stubs ─► implement ─► verify ─► STOP: user reviews, commits ─► handoff, clear
task 2: (/feature resume) stubs ─► implement ─► verify ─► STOP: ... ─► handoff, clear
...
finish: full checks ─► reviewers ─► hand-test list, deploy steps ─► STOP: user tests, pushes, merges
```

Autonomous:

```
plan ─► STOP: user approves plan, authorizes task commits
task n (fresh subagent): stubs ─► implement ─► verify ─► review notes, handoff ─► commit
...
finish: full checks ─► reviewers ─► commit fixes ─► STOP: user reviews commits, tests, pushes, merges
```

The plan covers the entire feature so tasks fit together. Each task is a thin
vertical slice (schema, API, hook, UI together) that ends in something
reachable in the running app. Built in layers (schema → service → route → hook
→ page), nothing is reachable until the last task, so a wrong turn is found
when it is most expensive.

The only stops are the ones marked STOP. Do not ask for input inside a task.
When a real ambiguity comes up, take the reading that fits the Goal and
`CLAUDE.md`/`DESIGN.md` best, note it under Decisions, and raise it at the next
stop. Stop early only for: a destructive migration (see Implement), a
`db:reset`, anything touching a non-local database, or a design change the Plan
didn't cover.

Autonomous mode adds two early stops: a task's verify step stays red after a
real attempt to fix it (never commit a red task or build on one), or a test
goes red because the requirement looks changed (a design question).

## Testing in this repo

Vitest, run with `pnpm test`. Tests live beside pure helpers in `lib/utils/`
(`spending.test.ts`, `recurring.test.ts`, `reports.test.ts` are the shape).
There are no route, hook or component tests; do not add a new kind.

A task gets tests **only when its rule is a pure function**: money math, date
windows, rollover, allocation, eligibility. Put the rule in `lib/utils/`, not
inside a component or route, and test it there. Extend the existing test file
for that domain before creating one. Keep to the fewest tests that pin the
rule: one per outcome plus one at each boundary. Before keeping a new test,
break the code on purpose and confirm it goes red.

Never edit an existing test's expectation to make it pass. If the code is
wrong, fix the code. If the requirement seems changed, leave it red, log it
under Decisions, and raise it at the next stop.

Do not verify with Playwright or a headless browser. UI is verified by
`pnpm check`, `pnpm test`, the `design-review` agent at finish, and the user's
hand test.

## The manifest

One file per branch, gitignored, so several features can be in flight at once
and each survives branch switches and `/clear`:

```
.claude/features/<branch name with "/" replaced by "--">.md
```

The `Branch:` line is authoritative, not the filename. The path is relative to
the folder the feature runs in; to find all manifests, read
`<path>/.claude/features/*.md` for every `<path>` in `git worktree list
--porcelain`.

It is the only memory that crosses a context reset, so update it at every step
transition. Nothing loads it automatically: after `/clear`, run
`/feature resume`. Keep personal financial data out of it (no real amounts,
names or account ids); describe the rows instead.

Template:

```markdown
# <feature name>

Branch: <branch> · Started: <YYYY-MM-DD> · Mode: co-work | auto · PR: <url, once opened>
Deploy: none | pending | done <YYYY-MM-DD>
Location: main checkout | worktree <absolute path>

## Goal

<2-4 sentences: what the user can do when this is done, and what is out of scope.>

## Plan

<The whole feature: schema changes, services in lib/api-services, routes,
hooks, components and pages. Enough that any task can be built without
re-deciding the design.>

Rules read: <the CLAUDE.md, DESIGN.md and brief rules this feature must
respect, one line each, so a fresh context works from this digest.>

Reuse: <existing helpers, services, hooks and components used instead of new
ones, and for each new helper why the closest existing one didn't fit.>

Data model: <models reused, extended (new field, enum value) and created. For
each new model, the closest existing model and why it can't hold these rows.
"No schema change" is an answer.>

Existing files touched: <each one, and why.>

Deploy order: <migrations and any one-off scripts the user must run, and in
which order relative to the merge. "None" is an answer.>

## Tasks

- [x] 1. <name> — <what it delivers> · ~<est> lines · <sha>
     Hand test: <what the user can do in the app once it is done>
     Review notes (auto mode): <lines, modified files and why, what was
     verified, where to read closely, doubts>
- [ ] 2. <name> — <what it delivers> · ~<est> lines · **awaiting review**
     Hand test: <...>

## Current task: <n>. <name>

Step: stubs | implement | verify | review
Files (N new, M modified):

- new prisma/migrations/<ts>\_<name>/migration.sql — <what>
- mod lib/utils/spending.ts — <what>

## Decisions

<Dated log of every call made without the user: the question, the choice, why.
Mark each confirmed or reversed once the user answers.>

## Open questions

## Handoff

<Rewritten (not appended) at the end of every task and on pause, for a context
that has seen nothing else:

- Next step: one concrete action, doable without asking.
- Builds on: files, services, routes, hooks the next task uses, with paths.
- Learned: surprises a fresh context would hit again.
- DB: migrations applied beyond main; dev server running and on which port.>

## Deploy

<Written at finish: one checkbox per item with the exact command, in run order.>
```

## Handoff and context reset

The conversation is thrown away between tasks; the manifest carries what the
next task needs. If a task has to scroll back to an earlier transcript, the
Handoff missed something: add it there.

- **Co-work.** Once the user has committed a task, record its sha, rewrite
  Handoff, and end the turn with: "Run `/clear`, then `/feature resume`."
  Clear after the commit, not at the review stop.
- **Autonomous.** Run each task in a fresh `general-purpose` subagent (Sonnet,
  per the model-tiering rule) and keep the main context to the manifest and the
  subagents' short reports. See Per task.

## Sizing

- A **task** is the smallest addition that ends in something reachable: a page
  or a visible change on one. A task whose only output is functions nobody
  calls is not a task; fold it into the slice that first uses it.
- A slice too big to review in one sitting is split into two thinner slices,
  never into layers.
- Each task carries a rough line estimate. If it lands well past it, say where
  the extra lines came from at the review stop.

## Code

**Short and simple.** Before adding a type, helper, option or layer, ask
whether the task works without it.

**Reuse before you write.** Check `lib/types/`, `lib/utils/`,
`lib/api-services/`, `lib/data-hooks/` and the shared primitives (`Button`,
`StatsCard`, `PageHeader`, `DeleteConfirmationModal`, `Modal`) first. Money
math goes through `roundToCents`/`formatCurrency` and spending math through
`lib/utils/spending.ts`; never re-derive spent/remaining inline. Chart colors
come from `components/recharts/theme.tsx`.

**The repo's rules are the code rules.** `CLAUDE.md` and `DESIGN.md` bind
every task: mobile first at 375px with the bottom tab bar, 44px tap targets,
16px inputs, toasts on every mutation, mutations invalidate their domain's
query keys, comments rare and one line, no em dashes in copy. Read them during
the plan; do not restate them here.

## Commits, pushing and prod

**Co-work: the user commits; Claude never does.** Leave each task uncommitted
on top of the previous task's commit so `git diff` shows exactly one task.
Give the suggested message. Do not start a task while the previous one is
uncommitted.

**Autonomous: Claude commits each green task locally**, under the
authorization given at the plan stop, on this branch only: no merge, amend or
push. Stage files by name (never `git add -A`; the manifest and `.env` files
stay out), message `<task name>` plus the attribution trailer.

**The user pushes**, once, after the finish stop. Never push, amend or use
`--no-verify`.

**Shared databases are the user's.** Branches merge into `dev`, and
`migrate-dev.yml` applies migrations to the dev database; `dev` merges into
`main`, and `migrate-production.yml` runs `pnpm db:migrate` against prod. Never
run `pnpm db:migrate`, `pnpm db:push`, `pnpm db:reset` or a data script
against a non-local database; ask before `pnpm db:reset` even locally. Record
what must run, and where, in Deploy order.

## /feature start [--auto] <description>

1. Must be on a feature branch. If on `main` or `dev`, propose a branch name
   and create it from `dev` once the user agrees. `--auto` sets `Mode: auto`
   and must run in a worktree (stop and say so in the main checkout). Record
   `Location:`.
2. Read `CLAUDE.md`, `DESIGN.md`, any brief the description points to, and the
   code the feature touches.
3. Write the Goal and the Plan. Fill in Data model before the task list:
   search `prisma/schema.prisma` for the feature's nouns first, and flag every
   new model at the stop so the user approves it on purpose.
4. Break it into vertical slices, each with a name, one line on what it
   delivers, a rough line estimate, and a **Hand test** line. Task 1 is the
   thinnest path that works end to end; each later task deepens it.
5. Create the manifest (and `.claude/features/` if needed).
6. **STOP.** Get agreement on the Goal, Plan and task list. This is the one
   design review. In the same message: if the Plan has migrations, ask whether
   `DATABASE_URL` is safe to migrate (see Location and database); in auto
   mode, ask for authorization to commit each green task locally. Record the
   answers under Decisions. Without the commit answer, auto mode does not
   start.

## Per task

Steps 1-3 run without stopping. The only break inside a task is the completed
task (step 4).

**Autonomous: one fresh subagent per task.** Spawn a `general-purpose` agent
with: the manifest path, "read `.claude/commands/feature.md` (Testing, Code,
Per task steps 1-3) and the manifest's Plan, Rules read and Handoff; build
task n; update the manifest's Current task, Decisions, Review notes and
Handoff; do not commit, push or ask the user anything; report in 15 lines or
fewer: green or red, files, line count, decisions". When it returns, check its
claim against `git status` and `git diff --stat`, re-run `pnpm check`, then
commit or take the early stop. Never pass it a previous task's transcript.

### 1. Stubs

- **Schema.** Edit `prisma/schema.prisma` and follow `.claude/commands/db-migrate.md`
  (`pnpm db:generate --name <snake_case>`, then read the SQL). Regenerate the
  client before writing call sites that use new fields.
- **Stubs.** Typed signatures for every new function, each with a 1-2 sentence
  comment saying what it will do, and a body that throws. Write the new call
  sites against the stubs. A component stub is its props type and a JSX
  skeleton using existing primitives. Rules go in a pure function in
  `lib/utils/`, not in the component.
- Run `pnpm typecheck`. Types that don't fit together are a planning problem:
  fix the stubs, or note under Decisions that the Plan was wrong and adjust.
- If the task gets tests, write them now from the Goal and the Plan, not from
  the code, and confirm they fail for the expected reason.
- Go straight to Implement. Update the manifest's `Step:` line.

### 2. Implement

Fill one stub at a time. Delete a stub's comment once the code says the same
thing.

For a migration: if the generated SQL drops a column or table, changes a type
lossily, or rewrites data, STOP and show it before applying (prod applies it
automatically on merge to `main`). Prefer expand, backfill, contract: add the
new shape, move the data, and drop the old shape in a later task.

Data backfills are a `scripts/<name>.ts` run with `tsx`, with a `--dry-run`
flag that prints what would change, idempotent so a second run is a no-op.
Add the run to Deploy order.

### 3. Verify

Everything must pass before the review stop. Fix failures and re-run.

- `pnpm check` and `pnpm test`
- `pnpm format:check` if lint complains about class order (`pnpm format:write`
  fixes it)
- Exercise what the task delivers through the same entry point production
  uses: call the route with `curl` against `pnpm dev` when it has no UI yet,
  or run the backfill script with `--dry-run`. Cover the happy path, each
  boundary, and one case that should be refused. Note what was exercised.

### 4. Review

**Co-work: STOP.** Update the manifest, then give the user:

- what the task delivers, and lines against the estimate
- files split into **new** and **modified**, one line per modified file on
  what changed and why
- what was verified and how
- the Decisions made during the task, for confirmation
- the one or two places in the diff most worth reading closely
- anything you are unsure about
- the suggested commit message

If the user asks for changes, make them, re-run step 3, and stop again. Once
they commit, record the sha, rewrite Handoff and end with the clear line.

**Autonomous: no stop.** The subagent writes that list into Review notes; the
main context commits, records the sha, and spawns the next task.

## /feature checkpoint

Report where the task stands, the current diff size, and whether it should be
split. Update the manifest.

## /feature resume

Find the manifest: with `<branch>`, the one whose `Branch:` line names it,
across every worktree; without, the one for this folder's branch; if none,
list every in-flight manifest and ask which. Move to its `Location:` (run
commands as `cd <Location> && ...`) after confirming
`git -C <Location> branch --show-current` matches.

Check the manifest against `git status` and `git log --oneline dev..HEAD`,
report any drift, and state the Handoff's next step. Work from the manifest;
do not re-read earlier diffs unless Handoff points at one. If the user says
they committed, record the sha first. If there is drift, stop and report it
before touching anything.

## /feature pause

Finish or abandon the current step cleanly, rewrite Handoff, stop any dev
server this feature started, and report that `/feature resume` picks it up.

## /feature finish

Runs after the last task is committed, without stopping until step 5.

1. All tasks have commits and Open questions is empty, or what remains is
   listed for the user.
2. Run `pnpm check`, `pnpm test` and `pnpm build`.
3. Run the reviewers on `git diff dev...HEAD` in parallel: `code-reviewer`
   always, `design-review` if `components/` or `src/app/` changed,
   `security-reviewer` if `src/app/api/`, `lib/api-services/`, auth or
   `prisma/` changed. Fix their findings and re-run step 2 until clean. Fixes
   are one final diff: uncommitted in co-work, committed as
   `<feature name>: finish fixes` in auto mode.
4. Build the Deploy section from Deploy order and the branch itself
   (`git diff --name-only $(git merge-base origin/dev HEAD)`): migrations under
   `prisma/migrations/`, backfill scripts and the database each must run
   against (dev first, then prod), and new env vars by name only (added to
   `.env.example`).
5. **STOP.** Hand over:

   - the combined hand-test list: each task's Hand test with **Setup** (data
     it needs), **Steps** and **Expect**, including one case that should be
     refused, checked at 375px
   - the reviewers' verdicts and any uncommitted fixes
   - the deploy steps, each in its own `bash` block, printed only: push and
     open a PR into `dev`; merge (migrations apply to dev); run backfills
     against dev with `--dry-run` then for real; hand test on dev; PR `dev`
     into `main` (migrations apply to prod); backfills against prod
   - the Decisions log, with anything unconfirmed called out
   - auto mode: one line per task commit (sha, name, lines, where to read)

   Write the deploy items into the manifest's `## Deploy` and set `Deploy:
pending` (or `none`). Once every box is ticked, ask before deleting the
   manifest.

## /feature clean-manifests

Read every manifest in every worktree. For each, check whether its branch is
merged into `main` (`gh pr list --head <branch> --state merged`, falling back
to `git merge-base --is-ancestor <branch> origin/main`). Report one table:
branch, location, merged, deploy state, current task. Ask once whether to
delete the manifests that are merged with nothing left to deploy; delete only
those, only on a yes.

## When not to use /feature

A bug fix or small change that touches a handful of lines does not need a plan
or a manifest: make the change and run `pnpm check` and `pnpm test`.
