"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Download,
  FileSearch,
  LoaderCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  UploadCloud,
  XCircle
} from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import StatusBadge from "@/components/ui/StatusBadge";

const STATUS_OPTIONS = [
  { value: "", label: "Semua" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "corrected", label: "Corrected" }
];

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function formatBytes(value) {
  const bytes = Number(value || 0);
  if (bytes < 1024) return `${bytes.toLocaleString("id-ID")} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024).toLocaleString("id-ID")} KB`;
  return `${(bytes / (1024 * 1024)).toLocaleString("id-ID", { maximumFractionDigits: 1 })} MB`;
}

function statusLabel(status) {
  const map = {
    pending: "Diajukan",
    approved: "Selesai",
    rejected: "Ditolak",
    corrected: "Dikembalikan"
  };
  return map[status] || status || "-";
}

function getCandidateFields(item) {
  return item?.result?.candidateFields || item?.classification?.extracted?.candidateFields || {};
}

export default function AiDocumentsPage() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("pending");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [reviewing, setReviewing] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [notes, setNotes] = useState("");
  const [correction, setCorrection] = useState("{}");

  async function loadItems() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      params.set("limit", "100");
      const response = await fetch(`/api/ai-documents?${params}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.message || "Data dokumen AI gagal dimuat.");
      setItems(payload.data || []);
      setSelectedId((current) => {
        if (payload.data?.some((item) => item.id === current)) return current;
        return payload.data?.[0]?.id || null;
      });
    } catch (err) {
      setError(err.message || "Data dokumen AI gagal dimuat.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadItems();
  }, [status]);

  const filteredItems = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return items;
    return items.filter((item) => [
      item.original_filename,
      item.classification_label,
      item.uploaded_by_username,
      item.queue_status
    ].join(" ").toLowerCase().includes(keyword));
  }, [items, query]);

  const selected = filteredItems.find((item) => item.id === selectedId) || filteredItems[0] || null;
  const pendingCount = items.filter((item) => item.queue_status === "pending").length;
  const reviewedCount = items.filter((item) => item.queue_status && item.queue_status !== "pending").length;

  async function handleUpload(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(true);
    setError("");
    setNotice("");
    try {
      const formData = new FormData();
      formData.set("file", file);
      const response = await fetch("/api/ai-documents", {
        method: "POST",
        body: formData
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.message || "Upload dokumen AI gagal.");
      setNotice(payload.message);
      setStatus("pending");
      await loadItems();
      setSelectedId(payload.data?.id || null);
    } catch (err) {
      setError(err.message || "Upload dokumen AI gagal.");
    } finally {
      setUploading(false);
    }
  }

  function parseCorrection() {
    const trimmed = correction.trim();
    if (!trimmed) return {};
    return JSON.parse(trimmed);
  }

  async function submitReview(decision) {
    if (!selected) return;
    setReviewing(decision);
    setError("");
    setNotice("");
    try {
      const body = {
        decision,
        notes,
        correction: decision === "correct" ? parseCorrection() : {}
      };
      const response = await fetch(`/api/ai-documents/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.message || "Review dokumen AI gagal disimpan.");
      setNotice(payload.message);
      setNotes("");
      setCorrection("{}");
      await loadItems();
      setSelectedId(payload.data?.id || selected.id);
    } catch (err) {
      setError(err.message || "Review dokumen AI gagal disimpan.");
    } finally {
      setReviewing("");
    }
  }

  return (
    <>
      <PageHeader
        title="Review AI Dokumen"
        description="Validasi upload, klasifikasi, dan draft extraction sebelum data dipakai oleh proses HRIS."
        breadcrumbs={[{ label: "Review AI Dokumen" }]}
        action={(
          <div className="flex flex-wrap gap-2">
            <label className="btn-primary cursor-pointer">
              {uploading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
              {uploading ? "Mengunggah..." : "Upload Dokumen"}
              <input className="sr-only" type="file" accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx,.csv" onChange={handleUpload} disabled={uploading} />
            </label>
            <button className="btn-secondary" type="button" onClick={loadItems} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        )}
      />

      <div className="mb-5 grid gap-4 md:grid-cols-3">
        <section className="surface p-4">
          <p className="section-label">Total Queue</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">{items.length.toLocaleString("id-ID")}</p>
        </section>
        <section className="surface p-4">
          <p className="section-label">Menunggu Review</p>
          <p className="mt-2 text-2xl font-bold text-amber-700">{pendingCount.toLocaleString("id-ID")}</p>
        </section>
        <section className="surface p-4">
          <p className="section-label">Sudah Direview</p>
          <p className="mt-2 text-2xl font-bold text-emerald-700">{reviewedCount.toLocaleString("id-ID")}</p>
        </section>
      </div>

      {error ? <section className="mb-5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</section> : null}
      {notice ? <section className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</section> : null}

      <section className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <aside className="surface p-4">
          <div className="flex flex-col gap-3">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input className="input pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari file, label, uploader" />
            </label>
            <select className="input" value={status} onChange={(event) => setStatus(event.target.value)}>
              {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>

          <div className="mt-4 space-y-3">
            {loading ? (
              Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-28 animate-pulse rounded-lg bg-slate-100" />)
            ) : filteredItems.length ? (
              filteredItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`w-full rounded-lg border p-4 text-left transition ${selected?.id === item.id ? "border-dinkes-300 bg-dinkes-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}
                  onClick={() => setSelectedId(item.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900">{item.original_filename}</p>
                      <p className="mt-1 text-xs text-slate-500">{formatDate(item.created_at)}</p>
                    </div>
                    <StatusBadge status={statusLabel(item.queue_status)} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1">{item.classification_label || "-"}</span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1">{formatBytes(item.size_bytes)}</span>
                  </div>
                </button>
              ))
            ) : (
              <EmptyState title="Queue kosong" description="Belum ada dokumen yang sesuai filter." />
            )}
          </div>
        </aside>

        <main className="space-y-5">
          {selected ? (
            <>
              <section className="surface p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="rounded-lg bg-dinkes-50 p-3 text-dinkes-700">
                        <FileSearch className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <h2 className="truncate text-xl font-bold text-slate-950">{selected.original_filename}</h2>
                        <p className="text-sm text-slate-500">{selected.content_type} | {formatBytes(selected.size_bytes)}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <a className="btn-secondary" href={`/api/ai-documents/${selected.id}/file`} target="_blank" rel="noreferrer">
                      <FileSearch className="h-4 w-4" />
                      Preview
                    </a>
                    <a className="btn-secondary" href={`/api/ai-documents/${selected.id}/file?download=1`}>
                      <Download className="h-4 w-4" />
                      Download
                    </a>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <p className="section-label">Label</p>
                    <p className="mt-2 text-sm font-bold text-slate-900">{selected.classification_label || "-"}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <p className="section-label">Confidence</p>
                    <p className="mt-2 text-sm font-bold text-slate-900">{selected.classification_confidence ? `${Math.round(selected.classification_confidence * 100)}%` : "-"}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <p className="section-label">Provider</p>
                    <p className="mt-2 text-sm font-bold text-slate-900">{selected.classification?.provider || "mock"}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <p className="section-label">Status</p>
                    <div className="mt-2"><StatusBadge status={statusLabel(selected.queue_status)} /></div>
                  </div>
                </div>
              </section>

              <section className="surface p-5">
                <h3 className="inline-flex items-center gap-2 text-base font-semibold text-slate-950">
                  <ShieldCheck className="h-5 w-5 text-dinkes-700" />
                  Draft Extraction
                </h3>
                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  {Object.entries(getCandidateFields(selected)).map(([key, value]) => (
                    <div key={key} className="rounded-lg border border-slate-200 p-4">
                      <p className="section-label">{key}</p>
                      <p className="mt-2 break-words text-sm font-semibold text-slate-900">{value || "-"}</p>
                    </div>
                  ))}
                </div>
                <pre className="mt-4 max-h-72 overflow-auto rounded-lg bg-slate-950 p-4 text-xs leading-6 text-slate-100">
                  {JSON.stringify(selected.result || selected.classification?.extracted || {}, null, 2)}
                </pre>
              </section>

              <section className="surface p-5">
                <h3 className="text-base font-semibold text-slate-950">Keputusan Review</h3>
                <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr]">
                  <label className="space-y-2">
                    <span className="label">Catatan Reviewer</span>
                    <textarea className="input min-h-32" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Tambahkan catatan review" />
                  </label>
                  <label className="space-y-2">
                    <span className="label">Correction JSON</span>
                    <textarea className="input min-h-32 font-mono text-xs" value={correction} onChange={(event) => setCorrection(event.target.value)} />
                  </label>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button className="btn-primary" type="button" onClick={() => submitReview("approve")} disabled={Boolean(reviewing)}>
                    {reviewing === "approve" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Approve
                  </button>
                  <button className="btn-secondary" type="button" onClick={() => submitReview("correct")} disabled={Boolean(reviewing)}>
                    {reviewing === "correct" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                    Simpan Koreksi
                  </button>
                  <button className="btn-secondary" type="button" onClick={() => submitReview("reject")} disabled={Boolean(reviewing)}>
                    {reviewing === "reject" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                    Reject
                  </button>
                </div>
              </section>
            </>
          ) : (
            <EmptyState title="Pilih dokumen" description="Pilih dokumen dari daftar queue untuk melihat detail klasifikasi dan draft extraction." />
          )}
        </main>
      </section>
    </>
  );
}
