export interface SuccessResponse<T> {
  data: T;
  message: string;
}

export interface ListResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface ValidationErrorDetail {
  loc: Array<string | number>;
  msg: string;
  type: string;
}

export interface ErrorResponse {
  detail: string | ValidationErrorDetail[];
}

// === Auth / User ===
export interface SellerResponse {
  id: string;
  email: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

// === Naver Connection ===
export interface NaverConnectRequest {
  naver_client_id: string;
  client_secret: string;
  store_id: string;
}

export interface NaverConnectionResponse {
  id: string;
  seller_id: string;
  naver_client_id: string;
  store_id: string;
  is_connected: boolean;
  created_at: string;
}

export interface NaverConnectionStatus {
  is_connected: boolean;
  naver_client_id: string | null;
  store_id: string | null;
}

// === Automation ===
export interface AutomationConfigResponse {
  id: string;
  seller_id: string;
  is_enabled: boolean;
  auto_post_enabled: boolean;
  confidence_threshold: number;
  poll_interval_minutes: number;
  max_auto_posts_per_cycle: number;
  policy_text: string | null;
  faq_json: string | null;
  test_mode: boolean;
  naver_fee_rate: number;
  min_margin_rate: number;
  created_at: string;
  updated_at: string;
}

export interface AutomationConfigUpdate {
  auto_post_enabled?: boolean;
  confidence_threshold?: number;
  poll_interval_minutes?: number;
  max_auto_posts_per_cycle?: number;
  policy_text?: string | null;
  faq_json?: string | null;
  test_mode?: boolean;
  naver_fee_rate?: number;
  min_margin_rate?: number;
}

export interface AutomationToggle {
  is_enabled: boolean;
}

// === Inquiries ===
export type InquiryStatus =
  | "pending"
  | "processing"
  | "needs_review"
  | "auto_posted"
  | "auto_posted_risky"
  | "manually_posted"
  | "rejected"
  | "failed";

export type InquiryType = "customer_inquiry" | "product_qna" | "talktalk";

export type RiskLevel = "low" | "medium" | "high";

export type AiCategory = "배송" | "교환/환불" | "상품문의" | "주문/결제" | "기타";

export interface InquiryResponse {
  id: string;
  seller_id: string;
  naver_id: string;
  inquiry_type: InquiryType;
  title: string | null;
  message_text: string;
  product_info: string | null;
  naver_created_at: string | null;
  talktalk_user_id: string | null;
  status: InquiryStatus;
  created_at: string;
  updated_at: string;
}

export interface AiResponseDetail {
  id: string;
  category: AiCategory | null;
  risk_level: RiskLevel | null;
  confidence: number | null;
  should_auto_post: boolean;
  answer: string;
  needs: Record<string, unknown> | null;
  reasoning: string | null;
  safety_overridden: boolean;
  safety_note: string | null;
  model_name: string | null;
}

export interface InquiryDetail {
  inquiry: InquiryResponse;
  ai_response: AiResponseDetail | null;
}

export interface InquiryEditRequest {
  answer: string;
}

export interface InquiryListParams {
  status?: InquiryStatus;
  inquiry_type?: InquiryType;
  page?: number;
  page_size?: number;
}

// === TalkTalk ===
export interface TalkTalkConnectRequest {
  talktalk_token: string;
}

export interface TalkTalkConnectResponse {
  talktalk_enabled: boolean;
  webhook_url: string;
}

export interface TalkTalkStatus {
  talktalk_enabled: boolean;
  webhook_url: string | null;
}

// === Dashboard ===
export type DashboardPeriod = "today" | "7d" | "30d" | "all";

export interface DashboardStats {
  total_inquiries: number;
  auto_posted: number;
  needs_review: number;
  rejected: number;
  manually_posted: number;
  failed: number;
}

export interface ActivityItem {
  event_type: string;
  event_data: Record<string, unknown> | null;
  created_at: string;
}

// === Health ===
export interface HealthResponse {
  status: "healthy";
  timestamp: string;
  service: string;
}

export interface ReadinessResponse {
  status: "ready" | "degraded";
  checks: Record<string, string>;
  timestamp: string;
}
