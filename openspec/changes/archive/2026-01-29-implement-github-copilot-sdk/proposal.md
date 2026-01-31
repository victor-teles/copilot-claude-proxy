## Why

GitHub Copilot is a widely used AI coding assistant that integrates with various IDEs and editors.
By implementing a proxy that shapes antropics api format but uses github copilot sdk as engine, we can allow users to benefit from Copilot's features while leveraging Anthropic's Claude as the underlying language model and api format to be used by clients.

## What Changes

- Add `@github/copilot-sdk` as a dependency and create a small integration surface in the server app.
- Implement new HTTP endpoints in the Hono server that accept requests `POST /v1/messages` as antrophic api format and translate them into Copilot SDK calls.
- Implement new HTTP endpoints in the Hono server that accept requests `GET /v1/models` as antrophic api format and translate them into Copilot SDK calls.
- Support both non-streaming and streaming responses (where feasible) so clients can receive incremental output.
- Add basic error handling and structured responses for common Anthropic API failures.

## Capabilities
- `copilot-to-claude-proxy`: Expose an HTTP interface on the Hono server that accepts a Claude-oriented request (messages, list models + options) and returns Claude output (including optional streaming) but implements the GitHub Copilot SDK behind the scenes.

### New Capabilities
- 
### Modified Capabilities
- (none)

## Impact

- apps/server
  - Add new routes/handlers for the proxy endpoints.
  - Add new dependencies: `@github/copilot-sdk` and any minimal supporting packages needed for streaming / HTTP handling.
- Documentation
  - Update README with local dev instructions (required env vars, example request, and how to run the proxy).
