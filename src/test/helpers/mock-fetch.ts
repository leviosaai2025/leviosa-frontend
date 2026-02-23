import { vi } from "vitest";

interface MockResponseInit {
  status?: number;
  headers?: Record<string, string>;
}

export function jsonResponse(body: unknown, init: MockResponseInit = {}): Response {
  const { status = 200, headers = {} } = init;
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

export function emptyResponse(status = 204): Response {
  return new Response(null, { status });
}

export function errorResponse(detail: unknown, status = 400): Response {
  return jsonResponse({ detail }, { status });
}

export function mockFetch(...responses: Response[]) {
  const fn = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>();
  for (const res of responses) {
    fn.mockResolvedValueOnce(res);
  }
  vi.stubGlobal("fetch", fn);
  return fn;
}
