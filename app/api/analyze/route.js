import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const { ocrText } = await req.json();
    if (!ocrText || typeof ocrText !== "string") {
      return NextResponse.json(
        { error: "Invalid or missing OCR text" },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing OPENROUTER_API_KEY environment variable" },
        { status: 500 }
      );
    }

    // System + user prompt to extract place, items and total
    const messages = [
      {
        role: "system",
        content:
          "You are an assistant that extracts structured data from receipt text. " +
          "Given OCR text from a purchase receipt, return a JSON object with these keys: " +
          "place (store or restaurant name), items (comma-separated list of purchased items), " +
          "and total_amount (a number). If a field is missing, use null.",
      },
      {
        role: "user",
        content: `Receipt OCR text:\n${ocrText}\n\n` +
          "Please respond ONLY with JSON as described.",
      },
    ];

    const body = {
      model: "openai/gpt-3.5-turbo",  // or any model available on OpenRouter
      temperature: 0,
      messages,
    };

    const res = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          // Optional headers recommended by OpenRouter docs:contentReference[oaicite:2]{index=2}:
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "ExpenseOCR",
        },
        body: JSON.stringify(body),
      }
    );

    const data = await res.json();
    if (!res.ok) {
      // bubble up API error
      return NextResponse.json(
        { error: data?.error?.message || "OpenRouter API error", details: data },
        { status: res.status }
      );
    }

    const content = data?.choices?.[0]?.message?.content?.trim();
    let analysis;
    try {
      analysis = JSON.parse(content);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse AI response", raw: content },
        { status: 500 }
      );
    }

    return NextResponse.json({ analysis });
  } catch (err) {
    return NextResponse.json(
      { error: err?.message || "Unexpected server error" },
      { status: 500 }
    );
  }
}
