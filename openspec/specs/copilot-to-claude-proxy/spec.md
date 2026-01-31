## ADDED Requirements

### Requirement: Expose Anthropic-compatible HTTP endpoints
The server SHALL expose Anthropic-compatible endpoints to clients:
- `POST /v1/messages`
- `GET /v1/models`

#### Scenario: Routes exist
- **WHEN** a client sends `GET /v1/models`
- **THEN** the server responds with an Anthropic-compatible models payload and a `200` status code

#### Scenario: Messages route exists
- **WHEN** a client sends `POST /v1/messages` with a valid request body
- **THEN** the server responds with an Anthropic-compatible message payload and a `200` status code

### Requirement: List available models
The server SHALL implement `GET /v1/models`.

The response MUST be compatible with the Anthropic models listing shape and MUST contain at least one model entry.

If the underlying Copilot SDK supports model listing, the server SHOULD reflect those models. If not, the server MUST return a deterministic configured list (e.g., a single default model).

#### Scenario: Successful model listing
- **WHEN** a client sends `GET /v1/models`
- **THEN** the server returns `200` and a JSON body containing a list of models

#### Scenario: Deterministic list when SDK cannot list
- **WHEN** the server cannot retrieve a model list from the Copilot SDK
- **THEN** the server returns `200` and a JSON body containing the configured fallback model list

### Requirement: Accept Anthropic Messages requests
The server SHALL implement `POST /v1/messages` with a request body compatible with the Anthropic Messages API.

At minimum, the server MUST accept:
- `messages`: an array of message objects
- `max_tokens`: a positive integer
- `stream`: an optional boolean

If `system` is provided, the server MUST incorporate it into the generated response context.

#### Scenario: Non-streaming request succeeds
- **WHEN** a client sends `POST /v1/messages` with `stream` omitted or `false`
- **THEN** the server returns `200` and a complete message response in a single JSON payload

#### Scenario: System prompt is respected
- **WHEN** a client sends `POST /v1/messages` including a `system` field and user messages
- **THEN** the generated assistant output reflects the system instruction

### Requirement: Return Anthropic-compatible non-streaming responses
For non-streaming requests (`stream: false` or omitted), the server MUST return a response compatible with the Anthropic message response format.

The response MUST include:
- `type: "message"`
- a stable `id`
- `role: "assistant"`
- `content` containing the assistant output

#### Scenario: Response contains required fields
- **WHEN** a non-streaming `POST /v1/messages` request succeeds
- **THEN** the response JSON includes `type`, `id`, `role`, and `content`

### Requirement: Support streaming via Server-Sent Events (SSE)
If the client requests streaming (`stream: true`) and the backend supports incremental output, the server MUST stream using `text/event-stream`.

The SSE stream MUST be compatible with Anthropic-style events (e.g., `message_start`, `content_block_delta`, `message_stop`) and MUST send data frames as JSON objects.

If streaming is not supported by the backend, the server MUST return an error response indicating streaming is unsupported.

#### Scenario: Streaming success
- **WHEN** a client sends `POST /v1/messages` with `stream: true` and the backend supports streaming
- **THEN** the server responds with `Content-Type: text/event-stream` and emits Anthropic-style events until completion

#### Scenario: Streaming unsupported
- **WHEN** a client sends `POST /v1/messages` with `stream: true` and the backend cannot stream
- **THEN** the server returns a non-2xx response with an Anthropic-compatible error object explaining that streaming is unsupported

### Requirement: Validate requests and reject unsupported inputs
The server MUST validate `POST /v1/messages` requests.

If required fields are missing or invalid, the server MUST reject the request with `400` and an Anthropic-compatible error object.

If fields are provided that are not supported by this proxy, the server MUST either:
- ignore them safely, OR
- reject the request with `400` and an `invalid_request_error` describing the unsupported fields.

#### Scenario: Invalid request yields invalid_request_error
- **WHEN** a client sends `POST /v1/messages` with an invalid body (e.g., missing `messages`)
- **THEN** the server returns `400` with an error object of type `invalid_request_error`

#### Scenario: Unsupported field is rejected
- **WHEN** a client sends `POST /v1/messages` containing an unsupported field that cannot be safely ignored
- **THEN** the server returns `400` with an `invalid_request_error` describing the unsupported field

### Requirement: Normalize errors to Anthropic-compatible responses
The server MUST normalize failures from the Copilot SDK into Anthropic-compatible error responses.

At minimum, the server MUST map errors to the following HTTP statuses and error types:
- `400` → `invalid_request_error`
- `401` → `authentication_error`
- `403` → `permission_error`
- `429` → `rate_limit_error`
- `500` → `api_error`

The server MUST NOT leak internal SDK stack traces or raw vendor error payloads in responses.

#### Scenario: Authentication error mapping
- **WHEN** the backend indicates an authentication failure
- **THEN** the server returns `401` with an Anthropic-compatible error object of type `authentication_error`

#### Scenario: Rate limit error mapping
- **WHEN** the backend indicates a rate limit condition
- **THEN** the server returns `429` with an Anthropic-compatible error object of type `rate_limit_error`

#### Scenario: Internal errors do not leak vendor details
- **WHEN** an unexpected exception occurs while handling a request
- **THEN** the server returns `500` with an `api_error` and does not include internal stack traces
