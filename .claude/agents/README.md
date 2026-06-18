# Backend Subagents — Rent A Car System

This directory contains Claude Code subagent definitions for the `demo-backend` repository. Each agent has a focused responsibility, a required reading list, and explicit scope boundaries derived from the shared contracts in `../ai-contracts-demo/`.

---

## Agent index

| Agent file | Purpose | Invoke when... |
|---|---|---|
| `backend-developer.md` | Implement features | Adding or changing routes, controllers, models, middleware |
| `api-contract-sync.md` | Audit contract compliance | Verifying backend matches openapi.yaml, before merging |
| `database-migration-planner.md` | Plan schema migrations | Adding tables, columns, indexes, FKs, or seed data |
| `backend-qa-tester.md` | Test and verify behavior | After a feature lands, investigating bugs, pre-merge QA |
| `security-reviewer.md` | Security audit | Before merging auth/upload/session changes, periodic audits |

---

## When to use each agent

### `backend-developer`

Use this when the task involves writing or changing application logic:

- Implementing a new endpoint from `openapi.yaml`
- Adding validation logic for a business rule
- Updating a controller, route, or Knex model helper
- Wiring up middleware
- Writing Jest/supertest tests for new features

This agent will read the contracts, list the exact files it plans to touch, and wait for approval before writing any code.

### `api-contract-sync`

Use this when you want to verify that the backend implementation is still aligned with the contract:

- Before merging a backend feature branch
- After a batch of changes that touched multiple routes
- When a frontend agent reports unexpected API behavior
- As a periodic health check to catch schema drift

This agent produces a structured audit report but does not modify any source files.

### `database-migration-planner`

Use this when the task involves database schema work:

- Creating a new table defined in `entities.md`
- Adding or modifying columns
- Creating foreign key relationships
- Generating seed data from `seed-data.md`
- Planning the migration sequence against `migrations-plan.md`

This agent will flag any contract gap (column not in `entities.md`) and stop rather than inventing schema.

### `backend-qa-tester`

Use this after any feature is implemented, or when investigating a reported bug:

- Running `npm test` and interpreting results
- Reviewing test coverage for a specific endpoint
- Verifying edge cases (missing fields, boundary values, business rule violations)
- Checking error envelope compliance
- Filing bug reports for confirmed defects

This agent reads source files and runs tests but does not modify application code.

### `security-reviewer`

Use this before merging anything that touches:

- Session configuration or login/logout
- Password hashing or credential handling
- File upload handling
- Input validation
- Error handling middleware

Also use for periodic security audits. This agent produces a severity-ranked findings report and files bug reports — it does not apply fixes.

---

## Shared governance rules (all agents)

All agents in this directory follow the boundary rules from `../ai-contracts-demo/governance/agent-boundaries.md`:

1. **Read contracts first.** Every agent must read the relevant files in `../ai-contracts-demo/` before planning or writing anything.
2. **No frontend edits.** No backend agent may modify `demo-frontend/` source code.
3. **No undocumented endpoints.** Only implement endpoints defined in `openapi.yaml`.
4. **No undocumented schema.** Only create columns and tables defined in `entities.md`.
5. **Plan before coding.** Every code-writing agent must list the exact files to change and wait for user approval.
6. **Standard error envelope.** All error responses must follow `api/error-format.md`.
7. **No hardcoded secrets.** Credentials and environment-specific values go in `.env` / `process.env`.

---

## How backend agents coordinate with the frontend through ai-contracts-demo

The backend and frontend never touch each other's source code directly. All coordination flows through the shared contracts:

```
Frontend needs a new endpoint
       ↓
  Frontend agent creates docs/stories/story-{date}-{name}.md
       ↓
  Backend developer agent reads the story, checks openapi.yaml
       ↓
  API Contract Owner updates openapi.yaml (if needed)
       ↓
  Backend developer agent implements the endpoint
       ↓
  API Contract Sync agent verifies implementation matches openapi.yaml
       ↓
  Backend QA Tester agent validates behavior
       ↓
  Frontend agent consumes the endpoint per openapi.yaml
```

The rule: **openapi.yaml is the only interface between frontend and backend.** Both sides implement against the contract, not against each other's code.

---

## Contract files each agent must read

| Agent | Must read |
|---|---|
| backend-developer | `api/openapi.yaml`, `api/endpoints.md`, `api/request-response-examples.md`, `api/error-format.md`, `database/entities.md`, `database/er-diagram.md`, `models/*.md`, `domain/business-rules.md`, `architecture/backend-architecture.md` |
| api-contract-sync | `api/openapi.yaml`, `api/endpoints.md`, `api/request-response-examples.md`, `api/error-format.md` |
| database-migration-planner | `database/entities.md`, `database/er-diagram.md`, `database/migrations-plan.md`, `database/seed-data.md`, `models/*.md`, `architecture/backend-architecture.md` |
| backend-qa-tester | `domain/business-rules.md`, `api/openapi.yaml`, `api/endpoints.md`, `api/request-response-examples.md`, `api/error-format.md`, `database/entities.md` |
| security-reviewer | `architecture/backend-architecture.md`, `architecture/integration-architecture.md`, `api/openapi.yaml`, `api/error-format.md`, `domain/business-rules.md` |

All paths are relative to `../ai-contracts-demo/`.
