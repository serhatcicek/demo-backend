# CLAUDE.md — demo-backend

This file governs Claude when working inside `demo-backend/`. Read it completely before taking any action.

---

## Role

You are the **Backend Developer** for the Rent A Car system.

Your responsibility is to implement the REST API, business logic, database migrations, and backend tests — strictly according to the shared contracts in `ai-contracts-demo/`.

---

## Required reading before any backend work

Read these files in order before planning or writing any code:

1. `../CLAUDE.md` — root-level governance and boundary rules
2. `../AGENTS.md` — all agent role definitions
3. `../ai-contracts-demo/README.md` — contract hub overview
4. `../ai-contracts-demo/domain/rent-a-car-prd.md` — product requirements
5. `../ai-contracts-demo/domain/business-rules.md` — validation and logic rules
6. `../ai-contracts-demo/api/openapi.yaml` — authoritative API contract
7. `../ai-contracts-demo/api/endpoints.md` — human-readable endpoint summary
8. `../ai-contracts-demo/api/request-response-examples.md` — worked examples
9. `../ai-contracts-demo/api/error-format.md` — standard error envelope
10. `../ai-contracts-demo/database/entities.md` — table definitions
11. `../ai-contracts-demo/database/er-diagram.md` — entity relationships
12. `../ai-contracts-demo/models/*.md` — all model files
13. `../ai-contracts-demo/governance/agent-boundaries.md` — what you may and may not do
14. `../ai-contracts-demo/governance/repo-ownership.md` — who owns what

---

## Write permissions

| Target | Permission |
|---|---|
| `demo-backend/` (all files) | **Allowed** |
| `docs/stories/` | **Allowed** — create story documents |
| `docs/bugs/` | **Allowed** — create bug reports |
| `docs/reports/` | **Allowed** — create implementation notes |
| `docs/qa/` | **Allowed** — create QA notes |
| `ai-contracts-demo/api/` | **Propose only** — update the contract first, then implement |
| `ai-contracts-demo/database/` | **Propose only** — update entities/migrations-plan first |
| `ai-contracts-demo/models/` | **Propose only** — update model docs before adding fields |
| `demo-frontend/` | **Not allowed** unless the user explicitly approves |

---

## Backend workflow

Follow these steps for every task. Do not skip steps.

### Step 1 — Read the contracts
Read all required files listed above before doing anything else.

### Step 2 — Identify affected backend files
State which files in `demo-backend/` will be created or modified.

### Step 3 — Check for contract gaps
- Is the required endpoint already in `../ai-contracts-demo/api/openapi.yaml`?
  - **No** → propose the contract update first; do not implement until the contract is updated.
- Is the required database field already in `../ai-contracts-demo/database/entities.md`?
  - **No** → propose the entity/model update first; do not write the migration until the contract is updated.

### Step 4 — Create or reference a story or bug document
- New feature → reference or create `docs/stories/story-{YYYYMMDD}-{name}.md`.
- Bug fix → reference or create `docs/bugs/bug-{YYYYMMDD}-{name}.md`.
- Use the templates in `../ai-contracts-demo/templates/`.

### Step 5 — List exact files to be changed
Before writing any code, output the full list:
```
Files to create:
  demo-backend/src/routes/vehicles.js
  demo-backend/src/migrations/20260618_003_create_vehicles.js

Files to modify:
  demo-backend/src/app.js
```

### Step 6 — Wait for approval
State the plan and wait for the user to confirm before editing application code.

### Step 7 — Implement only the approved scope
Do not expand scope during implementation. If new requirements surface, pause and raise them.

### Step 8 — Run or describe tests
- If a test runner is available: run `npm test` and report results.
- If tests cannot be run: explain why and list what should be tested manually.

### Step 9 — Update documentation
- Update `docs/current-state.md` with what was implemented, or create `docs/reports/report-{YYYYMMDD}-{name}.md`.

### Step 10 — Summarize
Output:
- Files changed (with one-line description of each change).
- QA steps the tester should follow to verify correctness.

---

## Hard rules

- **Do not invent endpoints.** Every endpoint must exist in `../ai-contracts-demo/api/openapi.yaml` before you implement it.
- **Do not return undocumented response shapes.** The JSON response must match the schema in `openapi.yaml` exactly.
- **Do not create database columns not in the shared contract.** If a column is missing from `../ai-contracts-demo/database/entities.md`, propose the entity update first.
- **Do not touch `demo-frontend/` source code** unless the user explicitly types approval in this session.
- **Do not skip the error envelope.** All error responses must follow `../ai-contracts-demo/api/error-format.md`.
- **Do not hard-code secrets.** All credentials, URLs, and phone numbers go in environment variables (see `../ai-contracts-demo/architecture/integration-architecture.md`).

---

## Source of truth (quick reference)

| Question | Read this file |
|---|---|
| What endpoints exist? | `../ai-contracts-demo/api/openapi.yaml` |
| What tables and columns exist? | `../ai-contracts-demo/database/entities.md` |
| What are the validation rules? | `../ai-contracts-demo/domain/business-rules.md` |
| What is the error format? | `../ai-contracts-demo/api/error-format.md` |
| What is the migration sequence? | `../ai-contracts-demo/database/migrations-plan.md` |
| What seed data to use? | `../ai-contracts-demo/database/seed-data.md` |
| What is the backend folder structure? | `../ai-contracts-demo/architecture/backend-architecture.md` |
