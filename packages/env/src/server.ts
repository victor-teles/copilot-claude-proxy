import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    COPILOT_CLI_PATH: z.string().optional(),
    COPILOT_CLI_URL: z.string().optional(),
    COPILOT_GITHUB_TOKEN: z.string().optional(),
    COPILOT_MODEL: z.string().default("claude-sonnet-4.5"),
    COPILOT_USE_LOGGED_IN_USER: z
      .enum(["true", "false"])
      .default("true")
      .transform((value) => value === "true"),
    CORS_ORIGIN: z.url(),
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
