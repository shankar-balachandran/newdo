# newdo

Read `SPEC.md` before changing anything. It is the source of truth for product
decisions; if code and spec disagree, fix one and say which.

Principles that shape code here:
- The user never fills a field. Anything structured is inferred, then confirmable.
- Every surfaced item carries a reason line derived from structured fields.
- `priority`, `project`, `tags`, `due_date` are derived views, never stored user fields.
- No LLM in the render path. Extraction and correction go through `src/lib/llm/adapter.ts`.
- The store is behind `src/lib/store/store.ts`. UI never touches an implementation directly.


