## Context

This repo is a Bun + TypeScript monorepo using Turborepo. The server app is a lightweight Hono HTTP server (see `apps/server/src/index.ts`) with CORS configured via `@copilot-claude-proxy/env`.

The change adds an Anthropic-compatible HTTP surface:
- `POST /v1/messages` to generate a Claude-style response from a Claude-style request
- `GET /v1/models` to list available models

…but implements the backend by calling the GitHub Copilot SDK (`@github/copilot-sdk`).

Key constraints:
- Keep the server simple (single Hono app) but modular enough to evolve.
- Preserve API compatibility with common Anthropic clients (including optional streaming).
- Avoid leaking Copilot-specific errors/details; return Anthropic-shaped error responses.

## Goals / Non-Goals

**Goals:**
- Provide Anthropic-ish endpoints (`/v1/messages`, `/v1/models`) on the existing Hono server.
- Translate incoming Anthropic message payloads to Copilot SDK calls.
- Return responses in Anthropic message format for non-streaming.
- Provide streaming responses where feasible, using `text/event-stream` and Anthropic event shapes.
- Centralize Copilot SDK integration behind a small adapter module to contain SDK coupling.

**Non-Goals:**
- Full fidelity support for every Anthropic request field (e.g., advanced tool use, caching, prompt management) unless required by specs.
- Guarantee identical token accounting, latency characteristics, or deterministic model availability vs Anthropic.
- Build a multi-tenant auth system; initial scope assumes a single server configuration.

## Decisions

### 1) Route structure and module boundaries

**Decision:** Keep `apps/server/src/index.ts` as the app entry, but move v1 route logic into dedicated modules.

Proposed file layout:
- `apps/server/src/routes/v1/messages.ts` — `POST /v1/messages`
- `apps/server/src/routes/v1/models.ts` — `GET /v1/models`
- `apps/server/src/copilot/client.ts` — Copilot SDK initialization + typed wrapper
- `apps/server/src/anthropic/types.ts` — minimal request/response types + Zod schemas
- `apps/server/src/anthropic/errors.ts` — error mapping utilities

**Why:** Minimizes churn in the entrypoint, keeps handlers testable, and isolates vendor-specific logic.

Alternatives considered:
- Single-file implementation in `index.ts`: faster to start, but becomes hard to maintain as streaming/error handling expands.

### 2) Request validation with Zod

**Decision:** Use Zod schemas to validate/normalize the subset of the Anthropic Messages API we support.

**Why:** This repo already uses Zod, and it’s the simplest way to provide clear 4xx errors and safe type narrowing.

Alternatives considered:
- Ad-hoc runtime checks: faster initially, but more bug-prone and harder to evolve.

### 3) Streaming protocol: SSE with Anthropic-style events

**Decision:** For streaming responses, use `text/event-stream` (SSE) and emit Anthropic event names/structures (e.g., `message_start`, `content_block_delta`, `message_stop`) to match typical Anthropic client expectations.

**Why:** Many Anthropic clients expect SSE framing, event names, and `data:` JSON lines.

Alternatives considered:
- Chunked JSON without SSE: easier to implement, but less compatible.
- OpenAI-style streaming: mismatched for Anthropic clients.

Implementation note:
- If Copilot SDK streaming yields raw text deltas, map those to a single `content_block_delta` stream with `text_delta` payloads.
- If the SDK cannot stream, fall back to non-streaming behavior when `stream: true` is requested by returning a 400 with an Anthropic-shaped error explaining streaming is unsupported.

### 4) Copilot SDK adapter

**Decision:** Wrap the Copilot SDK behind a single adapter that accepts:
- normalized prompt/messages
- model identifier (if supported)
- temperature/max tokens (if supported)
- streaming callback/async iterator

…and returns either:
- full text result
- async stream of deltas

**Why:** Contains vendor-specific types, makes it easier to swap implementations, and gives one place to handle auth configuration.

Alternatives considered:
- Using the SDK directly inside route handlers: simpler initially, but spreads coupling and error handling.

### 5) Model listing behavior

**Decision:** Implement `GET /v1/models` as:
- Prefer calling the Copilot SDK to list models if it supports that.
- Otherwise return a small static list of “supported” models configured by env (or a single default model).

**Why:** Copilot model availability may vary; a safe default keeps clients working.

Alternatives considered:
- Always static list: simplest, but may mislead clients.

### 6) Error shape and HTTP status mapping

**Decision:** Normalize failures into Anthropic-style error objects and status codes:
- Validation errors: `400` + `{ type: "error", error: { type: "invalid_request_error", message } }`
- Auth/permission (Copilot SDK): `401`/`403` mapped to `authentication_error` / `permission_error`
- Rate limits: `429` mapped to `rate_limit_error`
- Unexpected: `500` mapped to `api_error`

**Why:** Prevents leaking internal details while letting Anthropic clients react correctly.

Alternatives considered:
- Returning raw SDK errors: faster, but breaks compatibility and may leak sensitive details.

## Risks / Trade-offs

- **[Anthropic compatibility gaps] →** Start with a clearly documented supported subset; reject unsupported fields with a precise `invalid_request_error`.
- **[Streaming mismatch] →** Implement an adapter that can degrade gracefully (either true SSE streaming or explicit “streaming unsupported” error).
- **[Auth complexity in Copilot SDK] →** Centralize configuration in env and the Copilot adapter; document required env vars.
- **[Model ID ambiguity] →** Introduce a stable external model id surface (what clients send) and map internally; document mapping.
- **[Operational debugging] →** Add structured logging (already enabled via Hono logger) and ensure errors include request ids if added later.

## Migration Plan

- Add `@github/copilot-sdk` dependency to `apps/server`.
- Extend `@copilot-claude-proxy/env` with any required Copilot auth/config variables and ensure defaults are safe.
- Implement the new routes in `apps/server` and mount them under `/v1/*`.
- Add README documentation:
  - required env vars (CORS + Copilot auth)
  - example `curl` requests for `/v1/models` and `/v1/messages`
  - how to enable streaming and what the response looks like
- Rollout/rollback:
  - Rollout is additive: new endpoints only.
  - Rollback is removing route mounts / reverting dependency.

## Open Questions

- What exact authentication mechanism does `@github/copilot-sdk` require for this project (device flow, PAT, GitHub App, or local token)? Which env vars should we standardize on?
- Does the Copilot SDK expose a model list API? If yes, what fields are available (id, display name, capabilities)?
- What subset of Anthropic Messages API fields do we support initially (e.g., `system`, `stop_sequences`, `metadata`, tools)?
- What is the minimal streaming event set we must support to satisfy target clients?
- How should we map Anthropic `max_tokens` to Copilot SDK parameters if they differ?
