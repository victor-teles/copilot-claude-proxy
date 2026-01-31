import { z } from "zod";

const roleSchema = z.enum(["user", "assistant"]);

const textBlockSchema = z.object({
  type: z.literal("text"),
  text: z.string(),
});

type TextBlock = z.infer<typeof textBlockSchema>;

const messageContentSchema = z.union([z.string(), z.array(textBlockSchema)]);

const messageSchema = z.object({
  role: roleSchema,
  content: messageContentSchema,
});

export const anthropicMessagesRequestSchema = z
  .object({
    messages: z.array(messageSchema).min(1),
    max_tokens: z.number().int().positive(),
    stream: z.boolean().optional(),
    system: z.string().optional(),
    model: z.string().optional(),
  })
  .passthrough();

export type AnthropicMessagesRequest = z.infer<
  typeof anthropicMessagesRequestSchema
>;
export type AnthropicMessageRole = z.infer<typeof roleSchema>;
export type AnthropicTextBlock = TextBlock;

export const getUnsupportedMessagesFields = (rawBody: unknown): string[] => {
  if (!rawBody || typeof rawBody !== "object") {
    return [];
  }

  const body = rawBody as Record<string, unknown>;
  const unsupported: string[] = [];

  const hardUnsupported = [
    "tools",
    "tool_choice",
    "tool",
    "tool_results",
  ] as const;
  for (const key of hardUnsupported) {
    if (key in body) {
      unsupported.push(key);
    }
  }

  return unsupported;
};

export const contentToText = (content: string | TextBlock[]): string => {
  if (typeof content === "string") {
    return content;
  }

  const parts: string[] = [];
  for (const block of content) {
    if (block.type === "text" && block.text.trim().length > 0) {
      parts.push(block.text);
    }
  }

  return parts.join("");
};

export const buildPromptFromAnthropicRequest = (
  request: AnthropicMessagesRequest
): string => {
  const lines: string[] = [];

  if (request.system && request.system.trim().length > 0) {
    lines.push(`System: ${request.system.trim()}`);
  }

  for (const message of request.messages) {
    const text = contentToText(message.content).trim();
    if (text.length === 0) {
      continue;
    }

    lines.push(`${message.role === "user" ? "User" : "Assistant"}: ${text}`);
  }

  return lines.join("\n\n");
};
