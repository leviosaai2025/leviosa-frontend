import type { SupabaseClient } from "@supabase/supabase-js";

export type UsageFeature = "cover_generation" | "name_optimization";

export interface UsageCheckResult {
  allowed: boolean;
  used: number;
  limit: number;
  error?: string;
}

export async function checkAndIncrementUsage(
  supabase: SupabaseClient,
  userId: string,
  feature: UsageFeature,
): Promise<UsageCheckResult> {
  const { data, error } = await supabase.rpc("check_and_increment_usage", {
    p_user_id: userId,
    p_feature: feature,
  });

  if (error) {
    return { allowed: false, used: 0, limit: 0, error: error.message };
  }

  const result = data as {
    allowed: boolean;
    used?: number;
    limit?: number;
    error?: string;
  };

  return {
    allowed: result.allowed,
    used: result.used ?? 0,
    limit: result.limit ?? 0,
    error: result.error,
  };
}
