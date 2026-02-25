import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkAndIncrementUsage } from "@/lib/supabase/usage";

const REPLICATE_API_URL = "https://api.replicate.com/v1/models/prunaai/p-image-edit/predictions";

export async function POST(request: NextRequest) {
  const apiToken = process.env.REPLICATE_API_TOKEN;
  if (!apiToken) {
    return NextResponse.json(
      { error: "REPLICATE_API_TOKEN not configured" },
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
    "cover_generation",
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
    imageUrl: string;
    name?: string;
  };

  if (!body.imageUrl) {
    return NextResponse.json(
      { error: "Image URL is required" },
      { status: 400 },
    );
  }

  const prompt = `Edit this product image to create a professional e-commerce cover photo. Requirements:
- Clean white or bright background
- Center the product prominently
- Professional studio photography feel
- No text or watermarks, product image only
${body.name ? `- Product: ${body.name}` : ""}

Generate a high-quality product image.`;

  try {
    // Create prediction
    const createRes = await fetch(REPLICATE_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
        Prefer: "wait",
      },
      body: JSON.stringify({
        input: {
          prompt,
          images: [body.imageUrl],
          turbo: false,
          aspect_ratio: "1:1",
        },
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.text().catch(() => "Replicate API error");
      return NextResponse.json(
        { error: `Replicate error: ${err}` },
        { status: createRes.status },
      );
    }

    let prediction = (await createRes.json()) as {
      id: string;
      status: string;
      output: string | null;
      error: string | null;
      urls: { get: string };
    };

    // If not completed yet, poll until done
    while (prediction.status !== "succeeded" && prediction.status !== "failed" && prediction.status !== "canceled") {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const pollRes = await fetch(prediction.urls.get, {
        headers: { Authorization: `Bearer ${apiToken}` },
      });

      if (!pollRes.ok) {
        return NextResponse.json(
          { error: "Failed to poll prediction status" },
          { status: 500 },
        );
      }

      prediction = (await pollRes.json()) as typeof prediction;
    }

    if (prediction.status === "failed") {
      return NextResponse.json(
        { error: prediction.error || "Image generation failed" },
        { status: 500 },
      );
    }

    if (prediction.status === "canceled") {
      return NextResponse.json(
        { error: "Image generation was canceled" },
        { status: 500 },
      );
    }

    if (!prediction.output) {
      return NextResponse.json(
        { error: "No image generated" },
        { status: 500 },
      );
    }

    // Fetch the output image and convert to base64
    const imageRes = await fetch(prediction.output);
    if (!imageRes.ok) {
      return NextResponse.json(
        { error: "Failed to fetch generated image" },
        { status: 500 },
      );
    }

    const imageBuffer = await imageRes.arrayBuffer();
    const base64 = Buffer.from(imageBuffer).toString("base64");
    const mimeType = imageRes.headers.get("content-type") || "image/webp";

    return NextResponse.json({ image: base64, mimeType });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Replicate API error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
