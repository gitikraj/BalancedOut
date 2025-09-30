"use client";

import React, { useRef, useState } from "react";
import { UploadCloud } from "lucide-react";
import { toast } from "sonner";

// ---------- helpers ----------
async function fileToDataURLCompressed(file, { maxDim = 1600, mime = "image/jpeg", quality = 0.82 } = {}) {
  const bmp = await createImageBitmap(file).catch(async () => {
    const src = URL.createObjectURL(file);
    const img = await new Promise((res, rej) => {
      const el = new Image();
      el.onload = () => res(el);
      el.onerror = rej;
      el.src = src;
    });
    URL.revokeObjectURL(src);
    return img;
  });

  const { width, height } = bmp;
  const scale = Math.min(1, maxDim / Math.max(width, height));
  const outW = Math.max(1, Math.round(width * scale));
  const outH = Math.max(1, Math.round(height * scale));

  const canvas = typeof OffscreenCanvas !== "undefined"
    ? new OffscreenCanvas(outW, outH)
    : Object.assign(document.createElement("canvas"), { width: outW, height: outH });
  if (!(canvas instanceof OffscreenCanvas)) { canvas.width = outW; canvas.height = outH; }

  const ctx = canvas.getContext("2d", { alpha: false });
  ctx.drawImage(bmp, 0, 0, outW, outH);

  const blob = await (canvas instanceof OffscreenCanvas
    ? canvas.convertToBlob({ type: mime, quality })
    : new Promise((res) => canvas.toBlob(res, mime, quality)));

  return await new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onerror = () => rej(new Error("toDataURL failed"));
    fr.onload = () => res(fr.result); // data:image/jpeg;base64,...
    fr.readAsDataURL(blob);
  });
}

async function sha256Hex(file) {
  const buf = await file.arrayBuffer();
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, "0")).join("");
}

function setReactInput(el, value) {
  if (!el) return false;
  const proto = Object.getPrototypeOf(el);
  const desc = Object.getOwnPropertyDescriptor(proto, "value")
    || Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
  if (desc?.set) desc.set.call(el, value); else el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}
function fillByIdOrName(key, value) {
  const el = document.getElementById(key) || document.querySelector(`input[name="${key}"]`);
  return setReactInput(el, value);
}

// ---------- component ----------
export default function UploadImage() {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [ocrText, setOcrText] = useState("");
  const inputRef = useRef(null);

  async function handleFile(file) {
    try {
      setLoading(true);
      setAnalysis(null);
      setOcrText("");

      // cache per image
      const key = await sha256Hex(file);
      const cached = localStorage.getItem(`receipt:${key}`);
      if (cached) {
        const { text, analysis } = JSON.parse(cached);
        setOcrText(text);
        setAnalysis(analysis);
        if (analysis?.total_amount != null) fillByIdOrName("amount", String(analysis.total_amount));
        if (analysis?.place || analysis?.items) {
          const parts = [];
          if (analysis.place) parts.push(`Bill from ${analysis.place}`);
          if (analysis.items) parts.push(`Items: ${analysis.items}`);
          fillByIdOrName("description", parts.join(". "));
        }
        toast.success("Loaded from cache.");
        return;
      }

      // compress before sending
      const base64Image = await fileToDataURLCompressed(file);

      // 1) OCR
      const ocrRes = await fetch("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64Image, language: "eng" }),
      });
      const ocrData = await ocrRes.json();
      if (!ocrRes.ok || ocrData?.error) throw new Error(ocrData?.error || "OCR failed");

      const text = String(ocrData.text || "");
      setOcrText(text);

      // 2) AI analysis
      const aiRes = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ocrText: text }),
      });
      const aiData = await aiRes.json();
      if (!aiRes.ok || aiData?.error) throw new Error(aiData?.error || "AI analysis failed");
      setAnalysis(aiData.analysis);

      // autofill form
      if (aiData.analysis?.total_amount != null) {
        fillByIdOrName("amount", String(aiData.analysis.total_amount));
      }
      if (aiData.analysis?.place || aiData.analysis?.items) {
        const parts = [];
        if (aiData.analysis.place) parts.push(`Bill from ${aiData.analysis.place}`);
        if (aiData.analysis.items) parts.push(`Items: ${aiData.analysis.items}`);
        fillByIdOrName("description", parts.join(". "));
      }

      // cache
      localStorage.setItem(`receipt:${key}`, JSON.stringify({ text, analysis: aiData.analysis }));
      toast.success("Receipt analyzed and fields filled.");
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Upload/analysis failed.");
    } finally {
      setLoading(false);
    }
  }

  function onInputChange(e) {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  }
  function onDrop(e) {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }
  function onPaste(e) {
    const f = [...e.clipboardData.files][0];
    if (f) handleFile(f);
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onInputChange}
      />
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        onPaste={onPaste}
        className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition
          ${loading ? "opacity-60" : "hover:border-emerald-500 hover:shadow-[0_0_0_3px_rgba(16,185,129,0.15)]"}
          border-slate-300 cursor-pointer`}
        aria-busy={loading}
      >
        <UploadCloud className="mb-2" size={40} style={{ color: "#059669"}} />
        <p className="font-medium">Click to choose / drag & drop / paste an image</p>
        <p className="text-sm text-slate-600">We’ll OCR and auto-fill Amount & Description</p>
      </div>

      {analysis && (
        <div className="rounded-xl border p-3 bg-slate-50">
          <p><strong>Place:</strong> {analysis.place ?? "—"}</p>
          <p><strong>Items:</strong> {analysis.items ?? "—"}</p>
          <p><strong>Total:</strong> {analysis.total_amount ?? "—"}</p>
        </div>
      )}

      {ocrText && (
        <details className="rounded-xl border p-3">
          <summary className="cursor-pointer select-none">Raw OCR</summary>
          {/* scrollable OCR block */}
          <pre className="whitespace-pre-wrap break-words text-sm mt-2 max-h-[60vh] overflow-auto p-3 rounded-md border bg-white">
            {ocrText}
          </pre>
        </details>
      )}
    </div>
  );
}
