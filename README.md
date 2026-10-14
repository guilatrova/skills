# skills

Skills I use every day with Claude Code and Codex, published as a Claude Code plugin marketplace.
Each skill is a plain `SKILL.md` folder, so it also works in Codex and any agent that reads the
[Agent Skills](https://agentskills.io) format.

| Plugin | What it does |
| --- | --- |
| [code-quality](#code-quality) | Makes the agent plan and review changes against a concrete quality bar, with a read-only reviewer subagent |
| [concise-replies](#concise-replies) | Makes the agent answer questions briefly, in plain language, starting with the literal answer |
| [cache-keeper](#cache-keeper) | A Claude Code mod that keeps the prompt cache warm while you are away and writes a handoff before it gives up |

## Install

### Claude Code

Add the marketplace once, then install the plugins you want:

```bash
claude plugin marketplace add guilatrova/skills
claude plugin install code-quality@guilatrova-skills
claude plugin install concise-replies@guilatrova-skills
claude plugin install cache-keeper@guilatrova-skills
```

Inside a session, `/plugin marketplace add guilatrova/skills` and `/plugin` do the same.
Start a new session (or run `/reload-plugins`) to load them. To get updates later:

```bash
claude plugin marketplace update guilatrova-skills
```

Plugin skills and agents are namespaced by the plugin name:

| Piece | Name in Claude Code |
| --- | --- |
| code-quality skill | `/code-quality:code-quality` |
| reviewer subagent | `code-quality:quality-reviewer` (or `@agent-code-quality:quality-reviewer`) |
| concise-replies skill | `/concise-replies:concise-replies` |
| cache-keeper command | `/keepalive on`, `/keepalive off`, `/keepalive status` |

You rarely type these: Claude picks the skill from its description when the task matches.

### Any agent, with the skills CLI

[skills](https://github.com/vercel-labs/skills) installs the skills (not the reviewer subagent)
into Claude Code, Codex and other agents:

```bash
npx skills add guilatrova/skills -g
```

### Codex (or any agent that reads `~/.agents/skills`)

Clone the repo and link the skills into your skills folder, so `git pull` keeps them current:

```bash
git clone https://github.com/guilatrova/skills.git ~/skills
mkdir -p ~/.agents/skills ~/.codex/agents
ln -s ~/skills/plugins/code-quality/skills/code-quality ~/.agents/skills/code-quality
ln -s ~/skills/plugins/concise-replies/skills/concise-replies ~/.agents/skills/concise-replies
ln -s ~/skills/codex/agents/quality_reviewer.toml ~/.codex/agents/quality_reviewer.toml
```

The Codex reviewer reads the skill from `~/.agents/skills/code-quality/SKILL.md`, so keep that
link in place. It runs on `gpt-6-astra`; change `model` in the `.toml` to use another one.

### Make them always on (optional)

Skills load when the agent judges the task matches. To make the behavior a standing rule, add a
short pointer to your global instructions (`~/.claude/CLAUDE.md` or `~/.codex/AGENTS.md`):

```markdown
## Code quality

Use the code-quality skill when planning. Run the quality-reviewer subagent twice per milestone:
on the plan before implementing it, and on the changes since the last review when the milestone
is done. A task without milestones is one milestone.

## Conversational replies

For questions, explanations, and discussion, apply the concise-replies skill.
```

## code-quality

**Why it exists.** Agents ship code that works but does not last: a new component next to the
design-system one, a vendor SDK called from the domain, a list copied into a sixth module, a
`catch` that turns a failure into a fake success, an "old path" kept around after a migration.
"It works" is not the bar. This skill sets one: adaptable code built from replaceable pieces that
never break the core, made from what the project already has.

The rules come from 1,337 corrections I gave agents across 5,938 messages, grouped into twelve
rules (CQ-01 to CQ-12):

| Rule | In one line |
| --- | --- |
| CQ-01 Simple and in scope | Fewest concepts; no speculative abstractions or unrelated refactors |
| CQ-02 UI from the design system | Compose screens from DS components and tokens; extend the DS instead of one-offs |
| CQ-03 Degrade honestly | Never hide a failure, and never let a recoverable problem kill the whole job |
| CQ-04 Investigate before changing | Inventory what exists and fix root causes |
| CQ-05 One truth, one owner | Every rule, list, mapping and format is defined once |
| CQ-06 Protect the core | The domain imports no vendor, adapter, framework or environment |
| CQ-07 Replaceable pieces | External capabilities sit behind small ports; swapping one is one adapter |
| CQ-08 Configuration at the edges | Env vars, secrets, model names and prices live in configuration |
| CQ-09 No parallel legacy | A migration moves every caller and deletes the old path |
| CQ-10 Single responsibility | Business logic in pure functions or services, not in UI, routes or adapters |
| CQ-11 Cost and performance on purpose | Parallel independent work; never pay for discarded results |
| CQ-12 Conventions | English code, one name per concept, localized copy |

**How it works.**

1. **Plan.** Before designing, the agent reads the project's `QUALITY.md`, inventories what
   already exists (components, helpers, ports, adapters, config), and writes a plan with four
   parts: *Reuse*, *Boundaries*, *New pieces*, *Swap and failure*.
2. **Review the plan.** The `quality-reviewer` subagent checks it. It is read-only, searches the
   repo for existing owners, and blocks only with quoted evidence (`file:line`), at most three
   non-blocking notes.
3. **Review the milestone.** When the work is done, the reviewer checks the diff since the last
   review. Blockers are fixed inside the milestone, never turned into follow-up tasks.

Reviews happen at those two points only, never per commit, so they cost little time.

The reviewer replies in a fixed format:

```text
VERDICT: PASS | BLOCK
BLOCKERS:
1. CQ-05 One truth, one owner: src/stats/format.ts:12 duplicates the duration formatter
   Evidence: src/lib/format.ts:40 "export function formatDuration("
   Fix: import formatDuration from src/lib/format.ts and delete the copy
NOTES: (optional, at most 3, never blocking)
REUSED WELL: <existing pieces the change already uses correctly>
```

**Project rules.** Each repo can add its own rules, architecture map and exceptions in a
`QUALITY.md` at its root. Project rules win over the global ones. Start from
[the template](plugins/code-quality/skills/code-quality/references/quality-md-template.md).

**Stack notes.** React projects also get [react.md](plugins/code-quality/skills/code-quality/references/react.md)
(no `useEffect` for derived values or fetching, no server data mirrored into state).

## concise-replies

**Why it exists.** Ask an agent a yes/no question and you often get an architecture tour, three
options, a table and an offer to keep going. This skill makes it answer what was asked, then stop.

**What changes.**

- The first sentence answers the literal question.
- Familiar words; a technical term is explained with one concrete example, not more jargon.
- When you say you did not understand, it explains differently instead of repeating itself.
- No unsolicited tours, adjacent recommendations, process narration or closing offers.
- Tables, sections and long lists only when you ask for them.
- It replies in your language.

It governs conversation only: when you ask for a task (implement, investigate, review), the agent
still does the full job and just reports it briefly.

**Before / after**

> Do source preferences already work? Answer simply: is it done?

Before: a page on the preference parser, the storage layer and three possible next steps.

After: "Yes. Simple preferences such as 'prefer YouTube' already work. Arbitrary conditions such
as 'use AI whenever the scene is conceptual' are not implemented."

## cache-keeper

**Why it exists.** Claude Code caches the conversation prefix for an hour. Step away longer and
the next prompt pays to re-read the whole context, and on a long session that is slow and eats
usage. This mod keeps the cache warm for a bounded time, and before it stops it saves a handoff,
so you can resume in a fresh session instead of paying for the old one.

It is a [mod](https://code.claude.com/docs/en/plugins/mods/overview): it runs inside Claude Code
(not Codex), with no tokens spent until it fires.

**How it works.**

- Off by default. Turn it on per session with `/keepalive on`; `/keepalive status` shows the
  state and the last handoff.
- After each turn it schedules a refresh 50 minutes later (10 minutes before the cache expires).
  Any new prompt cancels it, because your own activity already refreshes the cache.
- At most 2 refreshes per idle stretch. The first one sends a tiny "ok" request. The last one
  asks the model for a short handoff (goal, done so far, current state, next steps, gotchas) and
  saves it to `/tmp/claude-handoffs/<project>-<session>.md`.
- It skips sessions under 30k tokens of context, where re-caching is cheap anyway.
- When the context reaches 90%, it writes a handoff once, so you have one before compaction.
- The status line shows `keep-alive 1/2 · handoff: <path>` while it is on.

**Assumptions.** The 1-hour TTL is what a Claude subscription gets within plan usage; on the API
or in overage the cache lasts 5 minutes, and the mod does not help there. Mods need Claude Code
v2.1.287 or later; it was built and tested on v2.1.300. Run its tests with `claude plugin test`
from `plugins/cache-keeper`.

## Repository layout

```text
.claude-plugin/marketplace.json     # the marketplace: lists the plugins
plugins/
  code-quality/
    .claude-plugin/plugin.json
    skills/code-quality/            # SKILL.md + references/
    agents/quality-reviewer.md      # Claude Code reviewer subagent
  concise-replies/
    .claude-plugin/plugin.json
    skills/concise-replies/SKILL.md
  cache-keeper/                     # Claude Code mod
    .claude-plugin/plugin.json
    hooks/hooks.json, register.ts, keepalive.test.ts
codex/agents/quality_reviewer.toml  # Codex reviewer subagent
```

Validate after any change:

```bash
claude plugin validate .
```

## License

[MIT](LICENSE)
