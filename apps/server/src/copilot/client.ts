import { env } from "@copilot-claude-proxy/env/server";
import { CopilotClient } from "@github/copilot-sdk";

export interface CopilotModel {
  id: string;
  name: string;
}

let clientPromise: Promise<CopilotClient> | undefined;

const createClient = async (): Promise<CopilotClient> => {
  const client = new CopilotClient({
    cliPath: env.COPILOT_CLI_PATH,
    cliUrl: env.COPILOT_CLI_URL,
    githubToken: env.COPILOT_GITHUB_TOKEN,
    useLoggedInUser: env.COPILOT_USE_LOGGED_IN_USER,
  });

  await client.start();
  return client;
};

export const getCopilotClient = (): Promise<CopilotClient> => {
  clientPromise ??= createClient();
  return clientPromise;
};

export const listCopilotModels = async (): Promise<CopilotModel[]> => {
  const client = await getCopilotClient();

  if (typeof client.listModels === "function") {
    const result = await client.listModels();

    return result.map((model) => ({ id: model.id, name: model.name }));
  }

  return [{ id: env.COPILOT_MODEL, name: "generic" }];
};

export const runCopilotPrompt = async (input: {
  prompt: string;
  model?: string;
  system?: string;
}): Promise<string> => {
  const client = await getCopilotClient();

  const session = await client.createSession({
    model: input.model ?? env.COPILOT_MODEL,
    systemMessage: input.system
      ? {
          content: input.system,
        }
      : undefined,
  });

  try {
    const message = await session.sendAndWait({
      prompt: input.prompt,
    });

    const content = (
      message as unknown as { data?: { content?: unknown } } | undefined
    )?.data?.content;
    if (typeof content === "string") {
      return content;
    }

    return "";
  } finally {
    await session.destroy();
  }
};

export const streamCopilotPrompt = async (input: {
  prompt: string;
  model?: string;
  system?: string;
  onDelta: (deltaText: string) => void;
}): Promise<string> => {
  const client = await getCopilotClient();

  const session = await client.createSession({
    model: input.model ?? env.COPILOT_MODEL,
    streaming: true,
    systemMessage: input.system
      ? {
          content: input.system,
        }
      : undefined,
  });

  let fullText = "";

  const unsubscribe = session.on("assistant.message_delta", (event) => {
    const delta = (event as unknown as { data?: { deltaContent?: unknown } })
      .data?.deltaContent;
    if (typeof delta === "string" && delta.length > 0) {
      fullText += delta;
      input.onDelta(delta);
    }
  });

  try {
    await session.send({ prompt: input.prompt });

    await new Promise<void>((resolve) => {
      session.on("session.idle", () => {
        resolve();
      });
    });

    return fullText;
  } finally {
    unsubscribe();
    await session.destroy();
  }
};
