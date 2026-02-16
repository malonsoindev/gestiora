# Rules From SonarQube Fixes

## String Handling
- Prefer `String#replaceAll()` over `String#replace()`.
- Use `String.raw` for regex strings to avoid escaping `\`.
- Replace simple regex character replacements with string literals (e.g., `replaceAll('_', '/')`).

## Readability and Complexity
- Refactor functions to keep Cognitive Complexity within limits (extract helpers for validation, lookups, and orchestration).
- Prefer optional chaining over explicit checks (e.g., `if (value?.prop)` instead of `if (value && value.prop)`).
- Avoid negated conditions in object spreads; use direct checks (`value === undefined ? {} : { ... }`).
- Remove unused variables and assignments.
- Do not swallow exceptions; if caught, return a typed error or propagate.
- Use `.includes()` instead of `.some()` for simple existence checks.
- Avoid using the `void` operator to silence unused parameters; prefix with `_` instead.

## Imports
- Avoid duplicate imports from the same module; consolidate them into a single import.

## Types
- Replace repeated inline union types with type aliases for reuse and readability.
- Avoid stringifying unknown objects; only convert to string after checking for `string | number`.

## Security
- Avoid `Math.random()` for IDs; prefer `crypto.randomUUID()` or `randomBytes`.

## Human Supervision
- All code changes must be approved by a human before being applied.
- Agents must propose changes and wait for explicit approval before executing.
- No commits are made without explicit human request.
