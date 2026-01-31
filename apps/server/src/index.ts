import { createServerEnv } from "@copilot-claude-proxy/env/server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

import { messagesRouter } from "./routes/v1/messages";
import { modelsRouter } from "./routes/v1/models";

export const createApp = (options: { corsOrigin: string }): Hono => {
  const app = new Hono();

  app.use(logger());
  app.use(
    "/*",
    cors({
      origin: options.corsOrigin,
      allowMethods: ["GET", "POST", "OPTIONS"],
    })
  );

  app.get("/", (c) => {
    return c.text("OK");
  });

  app.route("/v1", modelsRouter);
  app.route("/v1", messagesRouter);

  return app;
};

export const startServer = (): Bun.Server<undefined> => {
  const env = createServerEnv(process.env);

  const app = createApp({ corsOrigin: env.CORS_ORIGIN });
  const server = Bun.serve({
    fetch: app.fetch,
    hostname: env.HOST,
    port: env.PORT,
  });

  process.stdout.write(
    `Servidor escutando em http://${server.hostname}:${server.port}\n`
  );
  process.stdout.write(`CORS_ORIGIN: ${env.CORS_ORIGIN}\n`);

  return server;
};

if (import.meta.main) {
  startServer();
}
