import { clearStoredTokens, getAccessToken, getRefreshToken, setStoredTokens } from "@/lib/auth-storage";
import type { ErrorResponse, SuccessResponse, TokenPair, ValidationErrorDetail } from "@/types/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface ApiRequestOptions {
  method?: HttpMethod;
  body?: unknown;
  headers?: HeadersInit;
  auth?: boolean;
  retryOnAuthFailure?: boolean;
  signal?: AbortSignal;
}

export class ApiError extends Error {
  status: number;
  detail: unknown;

  constructor(message: string, status: number, detail: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

export class ReauthRequiredError extends ApiError {
  constructor(message = "Session expired. Please log in again.", status = 401, detail: unknown = null) {
    super(message, status, detail);
    this.name = "ReauthRequiredError";
  }
}

let refreshPromise: Promise<TokenPair | null> | null = null;

async function safeParseJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function detailToMessage(detail: unknown): string {
  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail)) {
    const validationErrors = detail as ValidationErrorDetail[];
    return validationErrors
      .map((item) => {
        const location = item.loc.join(".");
        return `${location}: ${item.msg}`;
      })
      .join(" | ");
  }

  return "Request failed";
}

async function buildApiError(response: Response): Promise<ApiError> {
  const parsed = await safeParseJson<ErrorResponse>(response);
  const detail = parsed?.detail;
  const message = detailToMessage(detail) || `Request failed with status ${response.status}`;
  return new ApiError(message, response.status, detail);
}

async function refreshTokens(): Promise<TokenPair | null> {
  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    return null;
  }

  if (!refreshPromise) {
    refreshPromise = fetch(`${API_URL}/api/v1/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })
      .then(async (response) => {
        if (!response.ok) {
          return null;
        }

        const payload = await safeParseJson<SuccessResponse<TokenPair>>(response);
        if (!payload?.data) {
          return null;
        }

        setStoredTokens(payload.data);
        return payload.data;
      })
      .catch(() => null)
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const {
    method = "GET",
    body,
    headers,
    auth = true,
    retryOnAuthFailure = true,
    signal,
  } = options;

  const requestHeaders = new Headers(headers);

  if (body !== undefined && !(body instanceof FormData) && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  if (auth) {
    const accessToken = getAccessToken();
    if (accessToken) {
      requestHeaders.set("Authorization", `Bearer ${accessToken}`);
    }
  }

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: requestHeaders,
    body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
    signal,
  });

  if (auth && response.status === 401) {
    if (retryOnAuthFailure) {
      const refreshed = await refreshTokens();
      if (refreshed) {
        return apiRequest<T>(path, {
          ...options,
          retryOnAuthFailure: false,
        });
      }
    }

    clearStoredTokens();

    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }

    throw new ReauthRequiredError();
  }

  if (!response.ok) {
    throw await buildApiError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = await safeParseJson<T>(response);
  if (payload === null) {
    throw new ApiError("Response parsing failed", response.status, null);
  }

  return payload;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unexpected error";
}
