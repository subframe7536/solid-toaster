# AGENTS.md

## Project intent

- This repository is a **SolidJS port of Sonner**.
- Upstream React reference implementation lives in the `sonner/` git submodule.
- Prefer behavior/API parity with upstream unless there is a Solid-specific reason to diverge.

## Source of truth

- Read from `sonner/src/*` to understand expected behavior.
- Implement new work in `src/*` (do not edit upstream files in `sonner/`).
- Keep public API aligned with Sonner naming where practical (`Toaster`, `toast.*`, options shape).

## Working rules

- Keep changes scoped to the user request.
- Fix root causes, avoid one-off hacks.
- Preserve TypeScript strictness.
- Avoid adding extra dependencies unless clearly needed.
- Do not add inline comments unless requested.

## SolidJS porting guidance

[Guide](./PORT_GUIDE.md)

## Validation checklist

Run these after meaningful changes:

```bash
bun run qa
bun run build
```

## Repo map

- `src/types.ts`: public/internal toast types
- `src/state.ts`: toast store + API
- `src/toaster.tsx`: renderer component
- `src/styles.css`: default styles
- `playground/`: local demo app

## Playground expectations

- Keep `playground/index.tsx` updated when API/behavior changes.
- Ensure examples cover common toast variants and options.

## Out of scope by default

- Do not refactor unrelated files.
- Do not "fix" issues inside `sonner/` unless explicitly requested.
- Do not commit, tag, or release unless explicitly requested.
