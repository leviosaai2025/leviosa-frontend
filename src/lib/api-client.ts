import { createClient } from "@/lib/supabase/client";
import type { ErrorResponse, ValidationErrorDetail } from "@/types/api";

const CS_API_URL = process.env.NEXT_PUBLIC_CS_API_URL ?? "http://localhost:8000";
const SOURCING_API_URL = process.env.NEXT_PUBLIC_SOURCING_API_URL ?? "http://localhost:8001";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

type ApiTarget = "cs" | "sourcing";

interface ApiRequestOptions {
  method?: HttpMethod;
  body?: unknown;
  headers?: HeadersInit;
  auth?: boolean;
  signal?: AbortSignal;
  target?: ApiTarget;
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

async function getSupabaseAccessToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const {
    method = "GET",
    body,
    headers,
    auth = true,
    signal,
    target = "cs",
  } = options;

  const baseUrl = target === "sourcing" ? SOURCING_API_URL : CS_API_URL;

  const requestHeaders = new Headers(headers);

  if (body !== undefined && !(body instanceof FormData) && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  if (auth) {
    const accessToken = await getSupabaseAccessToken();
    if (accessToken) {
      requestHeaders.set("Authorization", `Bearer ${accessToken}`);
    }
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: requestHeaders,
    body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
    signal,
  });

  if (auth && (response.status === 401 || response.status === 403)) {
    // Session might have expired — redirect to login
    if (typeof window !== "undefined") {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = "/login";
        throw new ReauthRequiredError();
      }
    }
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
