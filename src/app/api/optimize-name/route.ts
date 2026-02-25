import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@/lib/supabase/server";
import { checkAndIncrementUsage } from "@/lib/supabase/usage";

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY not configured" },
      { status: 500 },
    );
  }

  // Auth check
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    );
  }

  // Usage limit check
  const usage = await checkAndIncrementUsage(
    supabase,
    user.id,
    "name_optimization",
  );

  if (!usage.allowed) {
    return NextResponse.json(
      {
        error: usage.error || "Usage limit reached",
        used: usage.used,
        limit: usage.limit,
      },
      { status: 429 },
    );
  }

  const body = (await request.json()) as {
    name: string;
    category?: string;
  };

  if (!body.name) {
    return NextResponse.json(
      { error: "Product name is required" },
      { status: 400 },
    );
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `당신은 네이버 스마트스토어 상품명 SEO 전문가입니다.

아래 원본 상품명을 네이버 쇼핑 검색에 최적화된 한국어 상품명으로 변환해주세요.

규칙:
- 50자 이내로 작성
- 핵심 키워드를 앞쪽에 배치
- 불필요한 특수문자, 영문 브랜드명(한국어 대체 가능한 경우) 제거
- 소비자가 자주 검색하는 자연스러운 키워드 조합 사용
- 카테고리가 주어지면 관련 검색 키워드 포함

원본 상품명: ${body.name}
${body.category ? `카테고리: ${body.category}` : ""}

최적화된 상품명만 출력하세요. 다른 설명은 불필요합니다.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const optimizedName = response.text?.trim();
    if (!optimizedName) {
      return NextResponse.json(
        { error: "Failed to generate optimized name" },
        { status: 500 },
      );
    }

    return NextResponse.json({ optimizedName });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gemini API error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
