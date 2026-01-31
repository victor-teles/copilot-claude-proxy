## 1. Setup & Dependencies

- [x] 1.1 Add `@github/copilot-sdk` dependency to `apps/server`
- [x] 1.2 Extend `@copilot-claude-proxy/env` server schema with required Copilot configuration variables
- [x] 1.3 Wire new env vars into server runtime (ensure safe defaults and clear startup failure on missing required config)

## 2. Anthropic Types & Validation

- [x] 2.1 Add minimal Anthropic Messages API request/response types (`messages`, `max_tokens`, `stream`, optional `system`)
- [x] 2.2 Implement Zod schemas to validate and normalize supported fields for `POST /v1/messages`
- [x] 2.3 Add validation behavior for unsupported fields (ignore safely or reject with `invalid_request_error`)

## 3. Error Normalization

- [x] 3.1 Implement Anthropic-compatible error response shape helper (e.g., `{ type: "error", error: { type, message } }`)
- [x] 3.2 Map SDK/auth/rate-limit/unknown errors to required HTTP statuses (400/401/403/429/500) without leaking vendor details
- [x] 3.3 Ensure request validation failures return `400` + `invalid_request_error`

## 4. Copilot SDK Adapter

- [x] 4.1 Implement Copilot SDK initialization in a dedicated module (single place for auth/config)
- [x] 4.2 Implement an adapter function that accepts normalized Anthropic input and returns full text for non-streaming requests
- [x] 4.3 Add optional streaming support surface (async iterator/callback) so routes can stream deltas when the SDK supports it

## 5. Routes: Models

- [x] 5.1 Add `GET /v1/models` route module and mount it in the Hono app
- [x] 5.2 Implement Anthropic-compatible models payload with at least one model entry
- [x] 5.3 Prefer SDK model listing when available; otherwise return deterministic configured fallback list

## 6. Routes: Messages (Non-Streaming)

- [x] 6.1 Add `POST /v1/messages` route module and mount it in the Hono app
- [x] 6.2 Translate Anthropic `system` + `messages` into the Copilot adapter input
- [x] 6.3 Return Anthropic-compatible non-streaming response (`type`, stable `id`, `role`, `content`)

## 7. Streaming (SSE)

- [x] 7.1 Implement SSE response for `stream: true` with `Content-Type: text/event-stream`
- [x] 7.2 Emit Anthropic-style events (`message_start`, `content_block_delta`, `message_stop`) with JSON `data:` frames
- [x] 7.3 If streaming isn’t supported by the backend, return a non-2xx Anthropic-compatible error explaining streaming is unsupported

## 8. Verification

- [x] 8.1 Add a minimal smoke check for `GET /v1/models` (manual curl or lightweight automated check)
- [x] 8.2 Add a minimal smoke check for non-streaming `POST /v1/messages`
- [x] 8.3 Add a minimal smoke check for streaming `POST /v1/messages` (or verify the explicit unsupported-streaming error path)
