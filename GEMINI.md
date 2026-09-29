# Codebase exploration rules

## Code exploration

Use CodeGraph as the primary tool for understanding the codebase.

For questions involving:
- symbol relationships
- callers / callees
- dependencies
- request flows
- change impact
- locating implementations

use CodeGraph before reading source files.

When investigating the codebase:

1. Search before reading.
   Always use CodeGraph, grep_search, find_by_name, or symbol search
   to locate relevant definitions and references before opening files.
   - Use grep_search for exact string searches.
   - Avoid using view_file for repository exploration.

2. Never sequentially scan large files with view_file.

3. After CodeGraph or search identifies the relevant symbols and files:
   - For files larger than 300 lines, determine the approximate line range and read only the minimum source range necessary for the task.

4. Prefer shell range extraction over view_file for large files.
   Examples:
   - Linux/macOS: `sed -n '120,200p' path/to/file`
   - Use `grep_search` with line matching to locate line numbers

5. Do not read an entire large file merely to understand its structure.
   First inspect:
   - imports
   - class/function names
   - references/call sites
   - relevant symbols

6. When enough context has been collected to make the requested change,
   stop exploring unrelated files.

## Language

- 除非另有明确指示，与用户的交互、解释、方案说明和最终回复一律默认使用中文。
