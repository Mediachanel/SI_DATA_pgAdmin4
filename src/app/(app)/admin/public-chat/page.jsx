"use client";

import { useEffect, useState } from "react";
import { LoaderCircle, MessagesSquare, RefreshCw } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import EmptyState from "@/components/ui/EmptyState";

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function AdminPublicChatPage() {
  const [sessions, setSessions] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadSessions() {
    setLoading(true);
    const response = await fetch("/api/admin/public-chat?limit=100", { cache: "no-store" });
    const payload = await response.json();
    setSessions(payload.data || []);
    setSelectedId((current) => current || payload.data?.[0]?.id || null);
    setLoading(false);
  }

  async function loadMessages(id) {
    if (!id) return;
    const response = await fetch(`/api/admin/public-chat?sessionId=${id}`, { cache: "no-store" });
    const payload = await response.json();
    setMessages(payload.data || []);
  }

  useEffect(() => { loadSessions(); }, []);
  useEffect(() => { loadMessages(selectedId); }, [selectedId]);

  return (
    <>
      <PageHeader
        title="Public Chat"
        description="Monitoring percakapan bantuan publik dari halaman login."
        breadcrumbs={[{ label: "Admin" }, { label: "Public Chat" }]}
        action={<button className="btn-secondary" type="button" onClick={loadSessions}>{loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}Refresh</button>}
      />
      <section className="grid gap-5 lg:grid-cols-[360px_1fr]">
        <aside className="surface p-4">
          <h2 className="text-base font-bold text-slate-950">Sesi</h2>
          <div className="mt-4 space-y-2">
            {sessions.length ? sessions.map((item) => (
              <button key={item.id} className={`w-full rounded-lg border p-3 text-left ${selectedId === item.id ? "border-dinkes-300 bg-dinkes-50" : "border-slate-200 bg-white"}`} type="button" onClick={() => setSelectedId(item.id)}>
                <p className="text-sm font-bold text-slate-800">{item.visitor_id}</p>
                <p className="mt-1 line-clamp-2 text-xs text-slate-500">{item.last_inbound_message || "-"}</p>
                <p className="mt-2 text-xs text-slate-400">{formatDate(item.updated_at)}</p>
              </button>
            )) : <EmptyState title="Belum ada sesi" description="Percakapan publik akan tampil di sini." />}
          </div>
        </aside>
        <main className="surface p-5">
          <div className="mb-4 flex items-center gap-2">
            <MessagesSquare className="h-5 w-5 text-dinkes-700" />
            <h2 className="text-base font-bold text-slate-950">Percakapan</h2>
          </div>
          <div className="space-y-3">
            {messages.length ? messages.map((item) => (
              <div key={item.id} className={`flex ${item.direction === "inbound" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[76%] rounded-2xl px-4 py-3 text-sm leading-6 ${item.direction === "inbound" ? "bg-dinkes-700 text-white" : "bg-slate-100 text-slate-700"}`}>
                  <p>{item.redacted_body || item.body}</p>
                  <p className="mt-2 text-[11px] opacity-70">{formatDate(item.created_at)}</p>
                </div>
              </div>
            )) : <EmptyState title="Pilih sesi" description="Detail pesan public chat akan tampil di sini." />}
          </div>
        </main>
      </section>
    </>
  );
}
