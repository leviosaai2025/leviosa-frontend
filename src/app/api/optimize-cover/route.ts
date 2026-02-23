import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY not configured" },
      { status: 500 },
    );
  }

  const body = (await request.json()) as {
    imageUrl: string;
    name?: string;
  };

  if (!body.imageUrl) {
    return NextResponse.json(
      { error: "Image URL is required" },
      { status: 400 },
    );
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    // Fetch the original image
    const imgResponse = await fetch(body.imageUrl);
    if (!imgResponse.ok) {
      return NextResponse.json(
        { error: "Failed to fetch original image" },
        { status: 400 },
      );
    }

    const arrayBuffer = await imgResponse.arrayBuffer();
    const base64Image = Buffer.from(arrayBuffer).toString("base64");
    const mimeType =
      imgResponse.headers.get("content-type") || "image/jpeg";

    const prompt = `이 상품 이미지를 참고하여, 네이버 스마트스토어에 적합한 전문적인 e-commerce 커버 이미지를 생성해주세요.

요구사항:
- 깔끔한 흰색 또는 밝은 배경
- 상품을 중앙에 배치하고 크게 표시
- 전문적인 스튜디오 촬영 느낌
- 텍스트나 워터마크 없이 상품 이미지만
${body.name ? `- 상품명: ${body.name}` : ""}

고품질 상품 이미지를 생성해주세요.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType,
                data: base64Image,
              },
            },
            { text: prompt },
          ],
        },
      ],
    });

    // Extract generated image from response parts
    const parts = response.candidates?.[0]?.content?.parts;
    if (!parts) {
      return NextResponse.json(
        { error: "No response from Gemini" },
        { status: 500 },
      );
    }

    for (const part of parts) {
      if (part.inlineData?.data) {
        return NextResponse.json({
          image: part.inlineData.data,
          mimeType: part.inlineData.mimeType || "image/png",
        });
      }
    }

    // If no image was generated, return an explanation
    const textPart = parts.find((p) => p.text);
    return NextResponse.json(
      {
        error:
          textPart?.text ||
          "Image generation not available for this model configuration",
      },
      { status: 422 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gemini API error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
