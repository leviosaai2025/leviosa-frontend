import { apiRequest } from "@/lib/api-client";
import type {
  ActivityItem,
  AiResponseDetail,
  AutomationConfigResponse,
  AutomationConfigUpdate,
  AutomationToggle,
  InquiryDetail,
  InquiryEditRequest,
  InquiryListParams,
  InquiryResponse,
  ListResponse,
  NaverConnectRequest,
  NaverConnectionResponse,
  NaverConnectionStatus,
  SellerLogin,
  SellerRegister,
  SellerResponse,
  SuccessResponse,
  TalkTalkConnectRequest,
  TalkTalkConnectResponse,
  TalkTalkStatus,
  TokenPair,
  TokenRefresh,
  DashboardPeriod,
  DashboardStats,
} from "@/types/api";

function buildQueryString(params: Record<string, string | number | undefined>): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    searchParams.set(key, String(value));
  }

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

export const authApi = {
  register(payload: SellerRegister) {
    return apiRequest<SuccessResponse<SellerResponse>>("/api/v1/auth/register", {
      method: "POST",
      body: payload,
      auth: false,
    });
  },

  login(payload: SellerLogin) {
    return apiRequest<SuccessResponse<TokenPair>>("/api/v1/auth/login", {
      method: "POST",
      body: payload,
      auth: false,
    });
  },

  refresh(payload: TokenRefresh) {
    return apiRequest<SuccessResponse<TokenPair>>("/api/v1/auth/refresh", {
      method: "POST",
      body: payload,
      auth: false,
    });
  },

  me() {
    return apiRequest<SuccessResponse<SellerResponse>>("/api/v1/auth/me");
  },
};

export const naverApi = {
  connect(payload: NaverConnectRequest) {
    return apiRequest<SuccessResponse<NaverConnectionResponse>>("/api/v1/naver/connect", {
      method: "POST",
      body: payload,
    });
  },

  status() {
    return apiRequest<SuccessResponse<NaverConnectionStatus>>("/api/v1/naver/status");
  },

  disconnect() {
    return apiRequest<void>("/api/v1/naver/disconnect", {
      method: "DELETE",
    });
  },
};

export const talktalkApi = {
  connect(payload: TalkTalkConnectRequest) {
    return apiRequest<SuccessResponse<TalkTalkConnectResponse>>("/api/v1/talktalk/connect", {
      method: "POST",
      body: payload,
    });
  },

  status() {
    return apiRequest<SuccessResponse<TalkTalkStatus>>("/api/v1/talktalk/status");
  },

  disconnect() {
    return apiRequest<void>("/api/v1/talktalk/disconnect", {
      method: "DELETE",
    });
  },
};

export const automationApi = {
  getConfig() {
    return apiRequest<SuccessResponse<AutomationConfigResponse>>("/api/v1/automation/config");
  },

  updateConfig(payload: AutomationConfigUpdate) {
    return apiRequest<SuccessResponse<AutomationConfigResponse>>("/api/v1/automation/config", {
      method: "PUT",
      body: payload,
    });
  },

  toggle(payload: AutomationToggle) {
    return apiRequest<SuccessResponse<AutomationConfigResponse>>("/api/v1/automation/toggle", {
      method: "POST",
      body: payload,
    });
  },
};

export const inquiriesApi = {
  list(params: InquiryListParams) {
    return apiRequest<ListResponse<InquiryResponse>>(
      `/api/v1/inquiries${buildQueryString({
        status: params.status,
        inquiry_type: params.inquiry_type,
        page: params.page,
        page_size: params.page_size,
      })}`,
    );
  },

  detail(inquiryId: string) {
    return apiRequest<SuccessResponse<InquiryDetail>>(`/api/v1/inquiries/${inquiryId}`);
  },

  approve(inquiryId: string) {
    return apiRequest<SuccessResponse<{ posted_answer_id: string }>>(
      `/api/v1/inquiries/${inquiryId}/approve`,
      {
        method: "POST",
      },
    );
  },

  reject(inquiryId: string) {
    return apiRequest<SuccessResponse<InquiryResponse>>(`/api/v1/inquiries/${inquiryId}/reject`, {
      method: "POST",
    });
  },

  edit(inquiryId: string, payload: InquiryEditRequest) {
    return apiRequest<SuccessResponse<AiResponseDetail>>(`/api/v1/inquiries/${inquiryId}/edit`, {
      method: "PUT",
      body: payload,
    });
  },
};

export const dashboardApi = {
  stats(period?: DashboardPeriod) {
    return apiRequest<SuccessResponse<DashboardStats>>(
      `/api/v1/dashboard/stats${buildQueryString({ period })}`,
    );
  },

  activity(limit = 20) {
    return apiRequest<SuccessResponse<ActivityItem[]>>(
      `/api/v1/dashboard/activity${buildQueryString({ limit })}`,
    );
  },
};
