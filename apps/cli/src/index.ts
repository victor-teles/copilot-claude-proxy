#!/usr/bin/env bun

import { cac } from "cac";
import { startServer } from "server";

const parsePort = (value: unknown): number | undefined => {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  if (value.trim().length === 0) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  return parsed;
};

const isValidPort = (port: number): boolean => port >= 1 && port <= 65_535;

const main = async (): Promise<void> => {
  const cli = cac("copilot-claude-proxy");

  cli
    .command("start", "Inicia o servidor HTTP do proxy")
    .option("--host <host>", "Host (env: HOST, default: localhost)")
    .option("--port <port>", "Porta (env: PORT, default: 3000)")
    .option("--cors-origin <origin>", "Origem do CORS (env: CORS_ORIGIN)")
    .action((options) => {
      const host = options.host ?? process.env.HOST ?? "localhost";

      const portCandidate = options.port ?? process.env.PORT ?? "3000";
      const port = parsePort(portCandidate);

      if (port === undefined || !isValidPort(port)) {
        process.stderr.write(
          "Erro: porta inválida. Informe um número entre 1 e 65535 (via --port ou PORT).\n"
        );
        process.exitCode = 1;
        return;
      }

      const corsOrigin = options.corsOrigin ?? process.env.CORS_ORIGIN;

      try {
        process.env.HOST = host;
        process.env.PORT = String(port);
        process.env.CORS_ORIGIN = corsOrigin || "http://localhost:3000";

        startServer();
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        process.stderr.write(`Erro ao iniciar o servidor: ${message}\n`);
        process.exitCode = 1;
      }
    });

  cli.help();

  cli.parse(process.argv, { run: false });
  await cli.runMatchedCommand();
};

await main();
