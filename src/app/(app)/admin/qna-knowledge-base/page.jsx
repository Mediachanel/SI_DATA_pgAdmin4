"use client";

import { useEffect, useState } from "react";
import { BookOpen, LoaderCircle, Plus, RefreshCw } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";

export default function QnaKnowledgeBasePage() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ question: "", answer: "", keywords: "", category: "Umum" });
  const [saving, setSaving] = useState(false);

  async function loadItems() {
    const response = await fetch("/api/admin/qna-knowledge-base", { cache: "no-store" });
    const payload = await response.json();
    setItems(payload.data || []);
  }

  useEffect(() => { loadItems(); }, []);

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    await fetch("/api/admin/qna-knowledge-base", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });
    setForm({ question: "", answer: "", keywords: "", category: "Umum" });
    await loadItems();
    setSaving(false);
  }

  return (
    <>
      <PageHeader
        title="QnA Knowledge Base"
        description="Kelola jawaban publik yang boleh dibaca chat tanpa login."
        breadcrumbs={[{ label: "Admin" }, { label: "QnA Knowledge Base" }]}
        action={<button className="btn-secondary" type="button" onClick={loadItems}><RefreshCw className="h-4 w-4" />Refresh</button>}
      />
      <section className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <form className="surface space-y-4 p-5" onSubmit={submit}>
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-dinkes-700" />
            <h2 className="text-lg font-bold text-slate-950">Tambah QnA</h2>
          </div>
          <input className="input" value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} placeholder="Kategori" />
          <textarea className="input min-h-20" value={form.question} onChange={(event) => setForm((current) => ({ ...current, question: event.target.value }))} placeholder="Pertanyaan" required />
          <textarea className="input min-h-28" value={form.answer} onChange={(event) => setForm((current) => ({ ...current, answer: event.target.value }))} placeholder="Jawaban publik" required />
          <input className="input" value={form.keywords} onChange={(event) => setForm((current) => ({ ...current, keywords: event.target.value }))} placeholder="keyword, dipisah, koma" />
          <button className="btn-primary w-full" disabled={saving}>{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}Simpan</button>
        </form>
        <main className="surface p-5">
          <h2 className="text-lg font-bold text-slate-950">Daftar Knowledge Base</h2>
          <div className="mt-4 space-y-3">
            {items.map((item) => (
              <article key={item.id} className="rounded-lg border border-slate-200 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-dinkes-700">{item.category}</p>
                <h3 className="mt-2 font-bold text-slate-950">{item.question}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.answer}</p>
              </article>
            ))}
          </div>
        </main>
      </section>
    </>
  );
}
