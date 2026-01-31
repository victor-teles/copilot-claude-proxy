import { env } from "@copilot-claude-proxy/env/server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

import { messagesRouter } from "@/routes/v1/messages";
import { modelsRouter } from "@/routes/v1/models";

const app = new Hono();

app.use(logger());
app.use(
  "/*",
  cors({
    origin: env.CORS_ORIGIN,
    allowMethods: ["GET", "POST", "OPTIONS"],
  })
);

app.get("/", (c) => {
  return c.text("OK");
});

app.route("/v1", modelsRouter);
app.route("/v1", messagesRouter);

export default app;
