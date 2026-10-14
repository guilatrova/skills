---
name: code-quality
description: Gui's code-quality bar for every project and stack. Use when planning or designing a feature, milestone, module, screen, provider or integration, when a milestone is finished, and when asked to review a plan or a diff. It makes the agent inventory what already exists (design system, components, ports, adapters, helpers, config) before designing, keep the core free of vendors and environments, build UI from the design system, keep one owner per rule, degrade honestly, avoid speculative abstractions and parallel legacy paths, and have the quality-reviewer subagent check the plan and the finished milestone.
---

# Code quality

Working code is not the bar. Good code is adaptable and scalable: replaceable pieces that never
break the core (the domain), built from what the project already has.

This skill holds the global rules. A project adds its own in `QUALITY.md` at the repo root
(architecture map, extra rules, exceptions; template in
[references/quality-md-template.md](references/quality-md-template.md)). When a project rule
conflicts with this skill, the project wins.

## When to apply

- **Planning** a feature, milestone or new system: follow [Plan](#plan).
- **A milestone is finished:** follow [Milestone review](#milestone-review).
- **Asked to review** a plan or a diff: hand it to the quality-reviewer subagent (Claude Code:
  `quality-reviewer`; Codex: `quality_reviewer`). Without subagents, apply the
  [review standard](#review-standard) yourself.
- **Trivial changes** (copy, one config value, a few lines with no new file or concept) skip the
  reviewer. The rules still apply.

Keep committing and pushing increments as usual. Reviews happen at the two milestone points
(plan and milestone done), never per commit. A task without milestones is one milestone.

## Plan

1. **Read the project rules:** `QUALITY.md` at the repo root, or the quality parts of `AGENTS.md`
   when it does not exist. Use its architecture map instead of rediscovering the layout.
2. **Inventory before designing.** For every piece the feature needs, search for an existing
   owner by behavior, not only by name: design-system components and tokens, helpers and
   formatters, ports, adapters and registries, config entries, types, lists and mappings. Read
   the code paths you will touch.
3. **Write the plan** with these parts:
   - *Reuse:* the existing pieces it uses, with paths.
   - *Boundaries:* what changes in the core, in adapters, in the composition root, in the UI.
   - *New pieces:* each one, and why nothing existing fits.
   - *Swap and failure:* how a new external piece gets replaced later, and what the user sees
     when it fails.
4. **Hand the plan to the reviewer** before implementing. Fix every BLOCK, then implement.

## Milestone review

When the milestone's work is done, hand the reviewer the changes since the last review (for
example `git diff <last-reviewed-commit>...HEAD` plus uncommitted files) and the plan it
implemented. Fix every BLOCK inside this milestone; a BLOCK never becomes a follow-up task.
After fixing, confirm the fix yourself instead of running a second full review.

## Review standard

- **BLOCK only with evidence:** quote the new line and, for reuse or ownership findings, the
  existing owner it should use (`file:line`). Drop any claim you cannot quote.
- A pre-existing violation the change does not touch is not a finding. A change that extends
  one (a new copy, a new caller of a legacy path) is.
- Optional improvements are NOTES, at most three, and never block.
- Never demand abstractions, configurability, tests, docs or polish these rules do not require.
- One pass per review point. Investigate only what is needed to settle each new element.

## Rules

### CQ-01 Simple and in scope

Solve the task with the fewest concepts. No speculative abstractions (base classes, generic
frameworks, plugin managers, capability matrices, options nobody asked for), no new mechanism or
catalog when a local fix closes the issue, no reopening approved code because a more elegant design
exists, no unrelated refactors riding along, no dead code left in touched files.

- *Why:* Gui reacts to agents building layers ("lease kinds", catalogs, frameworks) around what
  should be a small change, and to reopened approved code.
- *Check:* for each new type, module or option, name the requirement that needs it today. Does
  the diff touch files the task does not need?
- *Block when:* an abstraction has one implementation and no external seam; a rename, move or
  refactor unrelated to the task ships with it; scaffolding exists for hypothetical futures.
- *Not a finding:* a small port in front of an external system (CQ-07); deleting dead code in
  files the change touches.

### CQ-02 UI comes from the design system

Screens are composed from the project's design-system components and tokens. No colors, sizes,
spacing, radii or font sizes outside the token files; no raw interactive elements (button,
select, input) where a design-system primitive exists; the same behavior uses the same component.
If the design system lacks a piece, add it there (with its story or docs) instead of building a
one-off in the screen. When you edit a legacy screen that bypasses the design system, migrate the
part you touch.

- *Why:* in dayvid-v2, code written after the design system existed stayed clean; the bypasses
  came from gaps in the design system (no Select, no page container) and from legacy screens
  nobody migrated.
- *Check:* before accepting a new component, grep the design system for one with the same role;
  grep the change for hex, rgb and pixel literals and for raw elements.
- *Block when:* a new component duplicates a design-system component's behavior; a style value
  is hardcoded; a one-off is built where the design system should be extended.
- *Not a finding:* data-driven style values (a progress width, a user-picked color); third-party
  brand colors inside a brand icon.

### CQ-03 Degrade honestly

Never hide a failure, and never let a recoverable problem kill the whole job.

- Required values exist or the code throws: no `?? default` or `|| fallback` on required data, no
  placeholder or phantom objects, no `catch` that swallows the error and continues as success, no
  ids or timestamps fabricated where the server or the source owns them.
- Optional steps and soft limits degrade in the open: the result records what was skipped or
  adjusted, and the user or operator can see it. A failed optional enrichment does not fail the
  job; a fixable overflow is fixed where the value is authored, not rejected at write time after
  paid work.
- Zero is a measured value; unknown is `null`.
- Missing required configuration fails at startup.

- *Why:* a fake local fallback once hid three broken RPCs in production; and Gui also wants
  resilience: do the best possible and move on, because failing the whole job is the worst
  outcome for the user.
- *Check:* for every catch, default and fallback: is the thing required or optional? Is the
  degradation recorded and visible? Does a throw abort paid or long work for something fixable?
- *Block when:* a failure looks like success; a required value gets a default; unknown is
  stored as 0; an optional step or a soft limit aborts the whole job.
- *Not a finding:* a declared degradation that is recorded on the result and shown.

### CQ-04 Investigate before changing

Read the code you touch and inventory what exists before proposing or changing anything. Fix
root causes, not symptoms. No guessing.

- *Why:* Gui repeatedly had to ask agents to look at everything that already exists instead of
  forgetting pieces and guessing.
- *Check:* the plan names the existing pieces it reuses with paths; the change does not
  re-implement something that exists; a fix addresses the cause the evidence points to.
- *Block when:* the plan or the change reinvents something that exists, or patches a symptom
  while the cause stays.

### CQ-05 One truth, one owner

Every rule, list, threshold, mapping, label, format and schema is defined once and reused
everywhere: UI, CLI, API, preview and render. Derive lists from their owner (for example the keys
of an existing map) instead of retyping them. A hand-written copy of something already owned is a
defect, and filing a follow-up instead of removing it is the failure mode.

- *Why:* in Vibe Videos a word-count rule copied into six modules failed silently in two of them.
- *Check:* for each new literal list, map, helper or constant, grep for an existing owner.
- *Block when:* a list, mapping, helper, formatter or constant duplicates an existing one, or a
  second implementation of the same behavior appears.
- *Not a finding:* two things that look alike but mean different things (say so in the code).

### CQ-06 Protect the core

Domain and core code (entities, use cases, policies) imports no vendor SDK, adapter, framework,
environment variable or IO. Vendor and platform concepts (a platform's limits and tags, vendor
ids, response shapes, model names) stay inside their adapter. Dependencies point inward, and each
stage or module knows only its own contract.

- *Why:* Gui's definition of good code: replaceable pieces that never break the core. He also
  rejects stages that know about other stages' concerns.
- *Check:* imports in core files; vendor or platform names, strings and rules inside the core.
- *Block when:* the core imports an adapter, an SDK or the config loader, reads the environment,
  or applies one platform's rule to every platform.

### CQ-07 Replaceable pieces

Each external capability (AI model, storage, database, payment, email, publishing platform, data
source) sits behind a small port owned by the core. Adding or swapping a provider is one adapter
plus one line in the registry or composition root. No `if` or `switch` on provider names outside
that registry. Environment differences (local vs production, fake vs real) are adapters chosen
at the composition root through configuration: one executor, no environment branches below the
root.

- *Why:* Gui wants to replace a provider "without breaking everything", and "one executor, two
  composition roots" became a rule after local and production paths drifted apart.
- *Check:* is a new provider an adapter of the existing port, registered at the root? Is there
  any branch on a provider name or on the environment below the root?
- *Block when:* a vendor call is wired into the core or a use case; provider or environment
  branching lives outside the root; a port is shaped after one vendor's API.
- *Not a finding:* a port with a single adapter when it fronts an external system.

### CQ-08 Configuration at the edges

Environment variables and secrets are read only in the configuration or composition layer and
passed in. Model names, prices, URLs, limits and per-environment values live in configuration,
not in code. No default secrets. Per-environment values are configuration, not if/else.

- *Check:* environment reads outside the config layer; model, price or URL literals in adapters
  or the core; `?? "some-key"`.
- *Block when:* a secret has a default; the environment is read outside the config layer; vendor
  settings are hardcoded where siblings take them from configuration.

### CQ-09 No parallel legacy

A migration ends in the same change: move every caller to the new path and delete the old one.
No "kept for backward compatibility", no deprecated duplicate waiting for later, no flag that
switches between old and new implementations.

- *Why:* Gui: an "old path" smells of laziness and tech debt; keeping two codes for the same
  purpose is what he wants to avoid. His projects are in beta, so breaking internal callers is
  fine.
- *Check:* `@deprecated`, "legacy" and "compat" markers; old functions still called; two
  implementations of one purpose.
- *Block when:* old and new paths coexist after the change.
- *Not a finding:* an external contract the project's `QUALITY.md` says must stay versioned.

### CQ-10 Single responsibility

One reason to change per module and function. Business logic lives in pure functions or
services, never inside UI components, routes, handlers or adapters; those stay thin. A field or
concern rippling through many unrelated files is a design smell. Size is a signal (about 60 lines
per function, 300 per file), not a block by itself.

- *Check:* business rules inside components, routes or adapters; functions doing several jobs;
  many files changed only to thread one value through.
- *Block when:* business rules live in UI, routes or adapters, or one module mixes unrelated
  responsibilities.

### CQ-11 Cost and performance on purpose

Run independent work in parallel. Never pay for work whose result is discarded. Do not add budget
gates that stop the core work after money was already spent. Track the cost of paid calls (usage
counters or integer micros) where the project meters cost.

- *Check:* sequential awaits over independent items; paid calls whose output is unused; cost
  reported as 0 when unknown (CQ-03).
- *Block when:* paid results are thrown away, or independent paid or slow calls run one by one
  on a hot path.

### CQ-12 Conventions

- Code is in English: identifiers, comments, logs, errors.
- One name per domain concept across code, data, UI and docs. If it is a "card", it is not a
  "graphic" in one table and an "animation" in a component. A rename happens everywhere.
- User-facing copy goes through the project's localization, never hardcoded.

## Stack notes

Load only when the project uses the stack:

- React: [references/react.md](references/react.md)
