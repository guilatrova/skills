# React notes

Rules Gui applies in every React codebase (Dayvid, Vibe Videos, app-template, dayvid-v2), on top of
the global rules.

- No `useEffect` for derived values, data fetching or reacting to events. Derive values during
  render (or `useMemo`), fetch through the project's data hook (SWR or equivalent), and put side
  effects in the event handler that causes them. A project may allow one named wrapper for real
  mount effects.
- Never mirror server data or props into local state. Read from the canonical hook that owns the
  data; derived state is a pure function, never stored.
- Business logic lives in pure functions or services, not in components or hooks (CQ-10).
- Components receive strings and data; they do not fetch, call SDKs or query storage directly.
- Async numeric reads expose `number | null`; display gates check `!== null`, not `> 0` (CQ-03).
