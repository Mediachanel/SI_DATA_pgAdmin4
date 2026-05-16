"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, MessageCircle, Send, X } from "lucide-react";

function createConversationId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function PublicAiChat() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const conversationIdRef = useRef(createConversationId());
  const panelRef = useRef(null);
  const scrollRef = useRef(null);
  const [items, setItems] = useState([
    { direction: "outbound", body: "Halo, saya bisa bantu informasi umum SI SDMK berdasarkan QnA publik." }
  ]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [items, loading, open]);

  useEffect(() => {
    if (!open) return undefined;
    function handlePointerDown(event) {
      if (panelRef.current && !panelRef.current.contains(event.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  async function readApiPayload(response) {
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      return response.json();
    }

    const body = await response.text().catch(() => "");
    const looksLikeHtml = body.trim().startsWith("<!DOCTYPE") || body.trim().startsWith("<html");
    if (looksLikeHtml) {
      throw new Error(
        `Endpoint /api/ai/public-chat mengembalikan HTML (status ${response.status}). Pastikan container memakai branch feature/ai-agent-roadmap dan reverse proxy mengarah ke port aplikasi 8091.`
      );
    }

    throw new Error(`Endpoint /api/ai/public-chat tidak mengembalikan JSON valid (status ${response.status}).`);
  }

  async function sendText(text) {
    const trimmed = String(text || "").trim();
    if (!trimmed || loading) return;
    setItems((current) => [...current, { direction: "inbound", body: trimmed }]);
    setMessage("");
    setLoading(true);
    try {
      const response = await fetch("/api/ai/public-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, conversation_id: conversationIdRef.current })
      });
      const payload = await readApiPayload(response);
      if (!response.ok || !payload.success) throw new Error(payload.message || "Workflow n8n public gagal diproses.");
      const data = payload.data || {};
      setItems((current) => [...current, {
        direction: "outbound",
        body: data.answer || "Maaf, informasi tersebut belum tersedia pada QnA publik SI SDMK. Silakan login atau hubungi admin.",
        source: data.source,
        intent: data.intent,
        tool: data.tool,
        verification: data.verification
      }]);
    } catch (error) {
      setItems((current) => [...current, {
        direction: "outbound",
        body: error.message || "Public chat belum dapat diproses.",
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

  return (
    <div ref={panelRef} className="fixed bottom-4 right-4 z-40">
      {open ? (
        <section className="mb-3 flex h-[520px] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl">
          <header className="flex items-center justify-between bg-dinkes-800 px-4 py-3 text-white">
            <div>
              <p className="text-sm font-extrabold">Butuh Bantuan?</p>
              <p className="text-xs text-white/75">QnA publik via n8n</p>
            </div>
            <button className="rounded-lg p-2 hover:bg-white/10" type="button" onClick={() => setOpen(false)} aria-label="Tutup chat publik">
              <X className="h-4 w-4" />
            </button>
          </header>
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
            {items.map((item, index) => (
              <div key={`${item.direction}-${index}`} className={`flex ${item.direction === "inbound" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[84%] rounded-lg px-4 py-3 text-sm leading-6 ${item.direction === "inbound" ? "bg-dinkes-700 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200"}`}>
                  <p className="whitespace-pre-line">{item.body}</p>
                  {item.direction === "outbound" ? (
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold text-slate-500">
                      <span>Source: {item.source || "-"}</span>
                      <span>Intent: {item.intent || "-"}</span>
                      <span>Tool: {item.tool || "-"}</span>
                      <span>Verification: {item.verification || "-"}</span>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
            {loading ? <p className="text-xs font-semibold text-slate-400">Menjalankan workflow n8n...</p> : null}
          </div>
          <form className="flex gap-2 border-t border-slate-200 bg-white p-3" onSubmit={onSubmit}>
            <input className="input min-w-0 flex-1" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Tulis pertanyaan umum..." />
            <button className="btn-primary px-3" type="submit" disabled={loading || !message.trim()} aria-label="Kirim pesan">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </form>
        </section>
      ) : null}
      <button className="btn-primary rounded-full px-5 py-3 shadow-xl" type="button" onClick={(event) => { event.stopPropagation(); setOpen((current) => !current); }}>
        <MessageCircle className="h-5 w-5" />
        Butuh Bantuan?
      </button>
    </div>
  );
}
