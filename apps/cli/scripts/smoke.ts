import { createServer } from "node:net";
import { fileURLToPath } from "node:url";

const cliCwd = fileURLToPath(new URL("..", import.meta.url));

const getFreePort = async (): Promise<number> => {
  const server = createServer();

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    server.close();
    throw new Error("Não foi possível obter uma porta livre");
  }

  const { port } = address;

  await new Promise<void>((resolve) => server.close(() => resolve()));

  return port;
};

const runCli = async (
  args: string[],
  env?: Record<string, string>
): Promise<number> => {
  const child = Bun.spawn({
    cmd: ["bun", "run", "src/index.ts", ...args],
    cwd: cliCwd,
    env: env ? { ...process.env, ...env } : process.env,
    stdout: "pipe",
    stderr: "pipe",
  });

  const stdout = await new Response(child.stdout).text();
  const stderr = await new Response(child.stderr).text();

  if (stdout.length > 0) {
    process.stdout.write(stdout);
  }
  if (stderr.length > 0) {
    process.stderr.write(stderr);
  }

  const exitCode = await child.exited;
  return exitCode;
};

const waitForHealth = async (baseUrl: string): Promise<void> => {
  const timeoutMs = 5000;
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(`${baseUrl}/`);
      if (response.ok) {
        return;
      }
    } catch {
      // ignore and retry
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error("Servidor não respondeu a tempo");
};

const main = async (): Promise<void> => {
  // --help deve retornar 0
  {
    const exitCode = await runCli(["--help"]);
    if (exitCode !== 0) {
      throw new Error(`--help retornou exit code ${exitCode}`);
    }
  }

  // start sem CORS_ORIGIN deve falhar
  {
    const exitCode = await runCli(["start", "--port", "3000"], {
      CORS_ORIGIN: "",
    });
    if (exitCode === 0) {
      throw new Error("start sem CORS_ORIGIN deveria falhar");
    }
  }

  // start com CORS_ORIGIN deve iniciar
  {
    const port = await getFreePort();
    const host = "127.0.0.1";
    const baseUrl = `http://${host}:${port}`;

    const child = Bun.spawn({
      cmd: [
        "bun",
        "run",
        "src/index.ts",
        "start",
        "--host",
        host,
        "--port",
        String(port),
        "--cors-origin",
        "http://localhost",
      ],
      cwd: cliCwd,
      env: process.env,
      stdout: "ignore",
      stderr: "pipe",
    });

    try {
      await waitForHealth(baseUrl);
    } finally {
      child.kill();
      await child.exited;
    }
  }
};

await main();
