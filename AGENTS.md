<!-- CODEGRAPH_START -->
## CodeGraph

In repositories indexed by CodeGraph (a `.codegraph/` directory exists at the repo root), reach for it BEFORE grep/find or reading files when you need to understand or locate code:

- **MCP tool** (when available): `codegraph_explore` answers most code questions in one call — the relevant symbols' verbatim source plus the call paths between them, including dynamic-dispatch hops grep can't follow. Name a file or symbol in the query to read its current line-numbered source. If it's listed but deferred, load it by name via tool search.
- **Shell** (always works): `codegraph explore "<symbol names or question>"` prints the same output.

If there is no `.codegraph/` directory, skip CodeGraph entirely — indexing is the user's decision.
<!-- CODEGRAPH_END -->

## open-context-engine

When `open-context-engine` is available, use `search_code` when the task requires understanding code intent, locating an implementation from a natural-language description, tracing a feature's main entry points, or obtaining source evidence with file paths and line numbers, especially in a project large enough that a plain grep returns too many matches to judge which are relevant.

- Always pass the project's absolute `directory_path` and a focused natural-language `query`; use `budget` to bound how much evidence comes back.
- Prefer `search_code` for questions such as "what does this project do?", "where is the login flow?", and "what is the application entry point?".
- Prefer CodeGraph for known-symbol call paths and dependency/impact relationships; prefer FastCtx `grep` for exact text or regular expressions, and `inspect_local_file` for reading a known file or line range. Making changes is out of scope here — use the edit/apply_patch tooling instead.
- `search_code` searches saved working-tree content and may wait for indexing. If it reports an index update failure or HTTP 429, check `index_status`; do not infer that code is absent from a failed search. Use the appropriate local inspection tool as a fallback and state the limitation.
- Stop once the evidence answers the question; do not broaden the query or scan unrelated files.
