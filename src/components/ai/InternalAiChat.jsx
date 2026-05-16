"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Loader2, MessageCircle, Send, X } from "lucide-react";

function metaValue(value) {
  return value === undefined || value === null || value === "" ? "-" : String(value);
}

function createConversationId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function DebugPanel({ debug }) {
  if (!debug) return null;
  const rows = [
    ["Original message", debug.original_message],
    ["Parsed intent", debug.parsed_intent],
    ["Extracted entities", debug.extracted_entities],
    ["Fuzzy candidates", debug.fuzzy_candidates],
    ["Selected candidate", debug.selected_candidate],
    ["Confidence score", debug.confidence_score],
    ["Tool result", debug.tool_result],
    ["Final answer", debug.final_answer]
  ];

  return (
    <details className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
      <summary className="cursor-pointer select-none font-extrabold text-slate-700">Debug</summary>
      <div className="mt-2 space-y-2">
        {rows.map(([label, value]) => (
          <div key={label}>
            <p className="font-bold text-slate-500">{label}</p>
            <pre className="mt-1 max-h-36 overflow-auto whitespace-pre-wrap break-words rounded-md bg-white p-2 font-mono text-[10px] leading-4 text-slate-700 ring-1 ring-slate-100">
              {typeof value === "string" ? value : JSON.stringify(value ?? "-", null, 2)}
            </pre>
          </div>
        ))}
      </div>
    </details>
  );
}

function MetaBadges({ item }) {
  if (item.direction !== "outbound") return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-500">
      <span>Source: {metaValue(item.source)}</span>
      <span>Intent: {metaValue(item.intent)}</span>
      <span>Tool: {metaValue(item.tool)}</span>
      <span>Verification: {metaValue(item.verification)}</span>
    </div>
  );
}

export default function InternalAiChat({ variant = "page" }) {
  const floating = variant === "floating";
  const [open, setOpen] = useState(!floating);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const conversationIdRef = useRef(createConversationId());
  const panelRef = useRef(null);
  const scrollRef = useRef(null);
  const [items, setItems] = useState([
    {
      direction: "outbound",
      body: "Halo, saya AI SI SDMK berbasis n8n. Semua jawaban internal hanya berasal dari tool database resmi."
    }
  ]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [items, loading, open]);

  useEffect(() => {
    if (!floating || !open) return undefined;
    function handlePointerDown(event) {
      if (panelRef.current && !panelRef.current.contains(event.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [floating, open]);

  async function readApiPayload(response) {
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      return response.json();
    }

    const body = await response.text().catch(() => "");
    const looksLikeHtml = body.trim().startsWith("<!DOCTYPE") || body.trim().startsWith("<html");
    if (looksLikeHtml) {
      throw new Error(
        `Endpoint /api/ai/chat mengembalikan HTML (status ${response.status}). Pastikan session login aktif dan reverse proxy mengarah ke aplikasi port 8091.`
      );
    }

    throw new Error(`Endpoint /api/ai/chat tidak mengembalikan JSON valid (status ${response.status}).`);
  }

  async function sendText(text) {
    const trimmed = String(text || "").trim();
    if (!trimmed || loading) return;
    setItems((current) => [...current, { direction: "inbound", body: trimmed }]);
    setMessage("");
    setLoading(true);
    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, conversation_id: conversationIdRef.current })
      });
      const payload = await readApiPayload(response);
      if (!response.ok || !payload.success) throw new Error(payload.message || "Workflow n8n gagal diproses.");
      const data = payload.data || {};
      setItems((current) => [...current, {
        direction: "outbound",
        body: data.answer || "Maaf, data tidak ditemukan atau belum dapat diverifikasi.",
        source: data.source,
        intent: data.intent,
        tool: data.tool,
        verification: data.verification,
        debug: data.debug
      }]);
    } catch (error) {
      setItems((current) => [...current, {
        direction: "outbound",
        body: error.message || "AI n8n belum dapat memproses pesan.",
        source: "client_guard",
        verification: "failed"
      }]);
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(event) {
    event.preventDefault();
    await sendText(message);
  }

  const chatPanel = (
    <section className={`${floating ? "mb-3 h-[520px] w-[min(420px,calc(100vw-2rem))]" : "min-h-[640px]"} flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm`}>
      <header className="flex items-center justify-between bg-dinkes-800 px-4 py-3 text-white">
        <div className="flex items-center gap-3">
          <span className="rounded-lg bg-white/10 p-2"><Bot className="h-4 w-4" /></span>
          <div>
            <p className="text-sm font-extrabold">AI SI SDMK</p>
            <p className="text-xs text-white/75">n8n workflow agent</p>
          </div>
        </div>
        {floating ? (
          <button className="rounded-lg p-2 hover:bg-white/10" type="button" onClick={() => setOpen(false)} aria-label="Tutup AI SI SDMK">
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </header>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
        {items.map((item, index) => (
          <div key={`${item.direction}-${index}`} className={`flex ${item.direction === "inbound" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[88%] rounded-lg px-4 py-3 text-sm leading-6 ${item.direction === "inbound" ? "bg-dinkes-700 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200"}`}>
              <p className="whitespace-pre-line">{item.body}</p>
              <MetaBadges item={item} />
              <DebugPanel debug={item.debug} />
            </div>
          </div>
        ))}
        {loading ? <p className="text-xs font-semibold text-slate-400">Menjalankan workflow n8n...</p> : null}
      </div>

      <form className="flex gap-2 border-t border-slate-200 bg-white p-3" onSubmit={onSubmit}>
        <input className="input min-w-0 flex-1" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Tulis pertanyaan internal..." />
        <button className="btn-primary px-3" type="submit" disabled={loading || !message.trim()} aria-label="Kirim pesan">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </form>
    </section>
  );

  if (!floating) return chatPanel;

  return (
    <div ref={panelRef} className="fixed bottom-20 right-4 z-40 md:bottom-5 print:hidden">
      {open ? chatPanel : null}
      <button className="btn-primary rounded-full px-5 py-3 shadow-xl" type="button" onClick={(event) => { event.stopPropagation(); setOpen((current) => !current); }}>
        <MessageCircle className="h-5 w-5" />
        AI SI SDMK
      </button>
    </div>
  );
}
