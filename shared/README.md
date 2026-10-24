# shared/ — contracts between lanes

Put anything two lanes both depend on here, so each side can build against it in
parallel:

- API request/response shapes (e.g. `api.md`, OpenAPI, or TS/Pydantic types)
- shared enums and constants
- DB schema
- env var names (values go in `.env`, never committed)

Rules (see AGENTS.md §3): contract changes go in their own `[contract]` PR,
merged first; prefer additive changes.
