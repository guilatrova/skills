# QUALITY.md template

Copy to the repo root as `QUALITY.md` and keep it short: it holds only what is specific to this
project. Global rules live in the code-quality skill; do not repeat them here. Point to this file
from `AGENTS.md` with one line: "Code quality rules: QUALITY.md (extends the global code-quality
skill)."

```markdown
# Quality

## Architecture map

- Core (domain, use cases): `<path>`
- Ports: `<path>`
- Adapters: `<path>` (one folder per capability)
- Composition root(s): `<path>` (the only place that picks adapters)
- Design system and tokens: `<path>`
- Shared helpers: `<path>`

## Recipes

- Add a provider: `<steps or a link to the repo skill>`
- Add a screen: `<steps>`

## Project rules

Rules this project adds on top of the global skill, one line each, with the incident or reason.

- `<rule>` (`<why>`)

## Exceptions

Global rules that do not apply here, and why.

- `<CQ-xx>`: `<reason>`
```
