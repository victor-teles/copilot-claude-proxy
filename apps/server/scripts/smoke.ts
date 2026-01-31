export {};

const baseUrl = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";

const print = (label: string, value: unknown) => {
  process.stdout.write(
    `${label}: ${typeof value === "string" ? value : JSON.stringify(value, null, 2)}\n`
  );
};

const main = async (): Promise<void> => {
  print("baseUrl", baseUrl);

  {
    const response = await fetch(`${baseUrl}/v1/models`);
    print("GET /v1/models status", response.status);
    print("GET /v1/models content-type", response.headers.get("content-type"));
    print("GET /v1/models body", await response.text());
  }

  {
    const response = await fetch(`${baseUrl}/v1/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        max_tokens: 128,
        stream: false,
        messages: [{ role: "user", content: "Say hello in one sentence." }],
      }),
    });

    print("POST /v1/messages (non-stream) status", response.status);
    print(
      "POST /v1/messages (non-stream) content-type",
      response.headers.get("content-type")
    );
    print("POST /v1/messages (non-stream) body", await response.text());
  }

  {
    const response = await fetch(`${baseUrl}/v1/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        max_tokens: 128,
        stream: true,
        messages: [{ role: "user", content: "Stream a short greeting." }],
      }),
    });

    print("POST /v1/messages (stream) status", response.status);
    print(
      "POST /v1/messages (stream) content-type",
      response.headers.get("content-type")
    );

    if (!response.body) {
      print("POST /v1/messages (stream) body", "<no body>");
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let seenBytes = 0;

    while (seenBytes < 4096) {
      const { value, done } = await reader.read();
      if (done || !value) {
        break;
      }

      seenBytes += value.byteLength;
      process.stdout.write(decoder.decode(value));
    }

    process.stdout.write("\n<stream output truncated>\n");
  }
};

await main();
