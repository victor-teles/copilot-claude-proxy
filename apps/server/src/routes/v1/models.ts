import { Hono } from "hono";
import {
  mapErrorToAnthropic,
  respondWithAnthropicError,
} from "@/anthropic/errors";
import { listCopilotModels } from "@/copilot/client";

export const modelsRouter = new Hono();

modelsRouter.get("/models", async (c) => {
  try {
    const models = await listCopilotModels();

    return c.json({
      data: models.map((model) => ({
        id: model.id,
        display_name: model.name,
        type: "model",
      })),
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
