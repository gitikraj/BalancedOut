import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const { base64Image, language = "eng" } = await req.json();

    if (
      !base64Image ||
      typeof base64Image !== "string" ||
      !base64Image.startsWith("data:image/")
    ) {
      return NextResponse.json(
        { error: "Invalid base64 image (must include data URL prefix like data:image/png;base64,)" },
        { status: 400 }
      );
    }

    const apiKey = process.env.OCR_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OCR API key missing on server" },
        { status: 500 }
      );
    }

    // Build multipart/form-data for OCR.space
    const form = new FormData();
    form.append("base64Image", base64Image);
    form.append("language", String(language));
    form.append("OCREngine", "2"); // ✅ Use OCR Engine 2
    // Optional:
    // form.append("detectOrientation", "true");
    // form.append("isOverlayRequired", "false");

    const ocrRes = await fetch("https://api.ocr.space/parse/image", {
      method: "POST",
      headers: { apikey: apiKey },
      body: form,
    });

    const data = await ocrRes.json();

    // OCR.space may return 200 with error flags inside JSON
    if (!ocrRes.ok || data?.IsErroredOnProcessing) {
      const errMsg =
        (Array.isArray(data?.ErrorMessage) ? data.ErrorMessage.join(", ") : data?.ErrorMessage) ||
        data?.ErrorDetails ||
        `OCR.space error (status ${ocrRes.status})`;
      return NextResponse.json({ error: errMsg, details: data }, { status: 502 });
    }

    const text = data?.ParsedResults?.[0]?.ParsedText || "";
    return NextResponse.json({ text, raw: data }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: err?.message || "Unexpected error" },
      { status: 500 }
    );
  }
}
