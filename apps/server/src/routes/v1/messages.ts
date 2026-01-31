import { getServerEnv } from "@copilot-claude-proxy/env/server";
import { Hono } from "hono";
import {
  mapErrorToAnthropic,
  respondWithAnthropicError,
} from "@/anthropic/errors";
import {
  anthropicMessagesRequestSchema,
  buildPromptFromAnthropicRequest,
  getUnsupportedMessagesFields,
} from "@/anthropic/types";
import { getCopilotClient, runCopilotPrompt } from "@/copilot/client";

const encodeSseEvent = (input: { event: string; data: unknown }): string => {
  return `event: ${input.event}\ndata: ${JSON.stringify(input.data)}\n\n`;
};

const STREAMING_UNSUPPORTED_REGEX = /stream/i;

interface CopilotSessionLike {
  on: (eventType: string, handler: (event: unknown) => void) => () => void;
  send: (options: { prompt: string }) => Promise<unknown>;
  destroy: () => Promise<void>;
}

export const messagesRouter = new Hono();

messagesRouter.post("/messages", async (c) => {
  try {
    const rawBody = await c.req.json();

    const unsupported = getUnsupportedMessagesFields(rawBody);
    if (unsupported.length > 0) {
      return respondWithAnthropicError(
        c,
        400,
        "invalid_request_error",
        `Unsupported fields: ${unsupported.join(", ")}`
      );
    }

    const parsed = anthropicMessagesRequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return respondWithAnthropicError(
        c,
        400,
        "invalid_request_error",
        "Invalid request body"
      );
    }

    const request = parsed.data;

    const env = getServerEnv();

    const model = request.model ?? env.COPILOT_MODEL;
    const prompt = buildPromptFromAnthropicRequest(request);

    const messageId = `msg_${crypto.randomUUID()}`;

    if (request.stream) {
      let session: CopilotSessionLike | undefined;

      try {
        const client = await getCopilotClient();
        session = (await client.createSession({
          model,
          streaming: true,
          systemMessage: request.system
            ? {
                content: request.system,
              }
            : undefined,
        })) as unknown as CopilotSessionLike;
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (STREAMING_UNSUPPORTED_REGEX.test(message)) {
          return respondWithAnthropicError(
            c,
            400,
            "invalid_request_error",
            "Streaming is unsupported by the backend"
          );
        }

        const mapped = mapErrorToAnthropic(error);
        return respondWithAnthropicError(
          c,
          mapped.status,
          mapped.type,
          mapped.message
        );
      }

      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          const encoder = new TextEncoder();

          const write = (chunk: string) => {
            controller.enqueue(encoder.encode(chunk));
          };

          write(
            encodeSseEvent({
              event: "message_start",
              data: {
                type: "message_start",
                message: {
                  id: messageId,
                  type: "message",
                  role: "assistant",
                  content: [],
                  model,
                },
              },
            })
          );

          const run = async (): Promise<void> => {
            try {
              const unsubscribe = session.on(
                "assistant.message_delta",
                (event) => {
                  const delta = (
                    event as unknown as { data?: { deltaContent?: unknown } }
                  ).data?.deltaContent;

                  if (typeof delta !== "string" || delta.length === 0) {
                    return;
                  }

                  write(
                    encodeSseEvent({
                      event: "content_block_delta",
                      data: {
                        type: "content_block_delta",
                        index: 0,
                        delta: {
                          type: "text_delta",
                          text: delta,
                        },
                      },
                    })
                  );
                }
              );

              await session.send({ prompt });

              await new Promise<void>((resolve) => {
                session.on("session.idle", () => {
                  resolve();
                });
              });

              unsubscribe();
              await session.destroy();

              write(
                encodeSseEvent({
                  event: "message_stop",
                  data: {
                    type: "message_stop",
                  },
                })
              );

              controller.close();
            } catch (error) {
              try {
                await session.destroy();
              } catch {
                // ignore
              }

              const mapped = mapErrorToAnthropic(error);
              write(
                encodeSseEvent({
                  event: "error",
                  data: {
                    type: "error",
                    error: {
                      type: mapped.type,
                      message: mapped.message,
                    },
                  },
                })
              );
              controller.close();
            }
          };

          run().catch(() => {
            controller.close();
          });
        },
      });

      return c.body(stream, 200, {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });
    }

    const text = await runCopilotPrompt({
      prompt,
      model,
      system: request.system,
    });

    return c.json({
      id: messageId,
      type: "message",
      role: "assistant",
      model,
      content: [
        {
          type: "text",
          text,
        },
      ],
    });
  } catch (error) {
    const mapped = mapErrorToAnthropic(error);
    return respondWithAnthropicError(
      c,
      mapped.status,
      mapped.type,
      mapped.message
    );
  }
});
