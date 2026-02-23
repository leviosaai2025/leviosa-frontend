import type {
  ProductSearchRequest,
  ProductSearchResponse,
} from "@/types/sourcing";

const configuredSourcingApiUrl =
  process.env.NEXT_PUBLIC_SOURCING_API_URL?.trim() || "";

const shouldUseRelativeSourcingUrl =
  typeof window !== "undefined" &&
  window.location.protocol === "https:" &&
  configuredSourcingApiUrl.startsWith("http://");

const SOURCING_API_URL = shouldUseRelativeSourcingUrl
  ? ""
  : configuredSourcingApiUrl ||
    (typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:5001");

export class SourcingApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "SourcingApiError";
    this.status = status;
  }
}

export async function searchProducts(
  params: ProductSearchRequest,
  signal?: AbortSignal,
): Promise<ProductSearchResponse> {
  const response = await fetch(`${SOURCING_API_URL}/api/domeggook/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(params),
    signal,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "Request failed");
    throw new SourcingApiError(text, response.status);
  }

  return response.json() as Promise<ProductSearchResponse>;
}

export interface UploadToNaverRequest {
  products_data: Record<string, unknown>[];
  include_details: boolean;
  naver_fee_rate: number;
  min_margin_rate: number;
}

export interface UploadResult {
  product_no: string;
  success: boolean;
  origin_product_no: number | null;
  error: string | null;
}

export interface UploadToNaverResponse {
  success: boolean;
  message: string;
  results: UploadResult[];
  error: string | null;
  status_code: number | null;
}

export async function uploadToNaver(
  request: UploadToNaverRequest,
  signal?: AbortSignal,
): Promise<UploadToNaverResponse> {
  const response = await fetch(
    `${SOURCING_API_URL}/api/domeggook/products/upload-to-naver`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal,
    },
  );

  if (!response.ok) {
    const data = await response
      .json()
      .catch(() => ({ error: "Upload failed" }));
    throw new SourcingApiError(
      (data as { error?: string }).error || "Upload to Naver failed",
      response.status,
    );
  }

  return response.json() as Promise<UploadToNaverResponse>;
}

// ---------- Optimization APIs ----------

export interface OptimizeNameResponse {
  optimizedName: string;
}

export async function optimizeName(
  name: string,
  category?: string,
  signal?: AbortSignal,
): Promise<string> {
  const response = await fetch("/api/optimize-name", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, category }),
    signal,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({ error: "Request failed" }));
    throw new SourcingApiError(
      (data as { error?: string }).error || "Name optimization failed",
      response.status,
    );
  }

  const data = (await response.json()) as OptimizeNameResponse;
  return data.optimizedName;
}

export interface OptimizeCoverResponse {
  image: string;
  mimeType: string;
}

export async function optimizeCover(
  imageUrl: string,
  name?: string,
  signal?: AbortSignal,
): Promise<{ dataUrl: string }> {
  const response = await fetch("/api/optimize-cover", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageUrl, name }),
    signal,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({ error: "Request failed" }));
    throw new SourcingApiError(
      (data as { error?: string }).error || "Cover optimization failed",
      response.status,
    );
  }

  const data = (await response.json()) as OptimizeCoverResponse;
  return { dataUrl: `data:${data.mimeType};base64,${data.image}` };
}
