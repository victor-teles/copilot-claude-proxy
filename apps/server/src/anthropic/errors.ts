import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

export type AnthropicErrorType =
  | "invalid_request_error"
  | "authentication_error"
  | "permission_error"
  | "rate_limit_error"
  | "api_error";

export interface AnthropicErrorBody {
  type: "error";
  error: {
    type: AnthropicErrorType;
    message: string;
  };
}

export const createAnthropicErrorBody = (
  type: AnthropicErrorType,
  message: string
): AnthropicErrorBody => {
  return {
    type: "error",
    error: {
      type,
      message,
    },
  };
};

export const respondWithAnthropicError = (
  context: Context,
  status: ContentfulStatusCode,
  type: AnthropicErrorType,
  message: string
) => {
  return context.json(createAnthropicErrorBody(type, message), status);
};

const getNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
};

export const mapErrorToAnthropic = (
  error: unknown
): {
  status: ContentfulStatusCode;
  type: AnthropicErrorType;
  message: string;
} => {
  if (error instanceof Error) {
    const message = error.message || "Unexpected error";

    const maybeStatus = getNumber(
      (error as unknown as { status?: unknown }).status
    );
    if (maybeStatus) {
      const mapped = mapStatusToAnthropicError(maybeStatus);
      return {
        status: mapped.status,
        type: mapped.type,
        message,
      };
    }

    return {
      status: 500,
      type: "api_error",
      message,
    };
  }

  return {
    status: 500,
    type: "api_error",
    message: "Unexpected error",
  };
};

export const mapStatusToAnthropicError = (
  status: number
): { status: ContentfulStatusCode; type: AnthropicErrorType } => {
  switch (status) {
    case 400:
      return { status, type: "invalid_request_error" };
    case 401:
      return { status, type: "authentication_error" };
    case 403:
      return { status, type: "permission_error" };
    case 429:
      return { status, type: "rate_limit_error" };
    default:
      return { status: 500, type: "api_error" };
  }
};
