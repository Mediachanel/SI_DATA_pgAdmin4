"use client";

import { useEffect, useMemo, useState } from "react";
import { Filter, LoaderCircle, RefreshCw, ScrollText } from "lucide-react";
import PageHeader from "@/components/layout/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import StatusBadge from "@/components/ui/StatusBadge";
import { ROLES } from "@/lib/constants/roles";

const MODULE_OPTIONS = ["", "ai_agent", "ai_documents", "chatbot", "auth", "system"];
const STATUS_OPTIONS = ["", "completed", "pending_approval", "approved", "rejected", "corrected"];
const ROLE_OPTIONS = ["", ROLES.SUPER_ADMIN, ROLES.ADMIN_WILAYAH, ROLES.ADMIN_UKPD];

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function buildQuery(filters) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  params.set("limit", "150");
  return params.toString();
}

export default function AiAuditLogPage() {
  const [filters, setFilters] = useState({
    user: "",
    role: "",
    action: "",
    status: "",
    module: "",
    dateFrom: "",
    dateTo: ""
  });
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const query = useMemo(() => buildQuery(filters), [filters]);

  async function loadLogs() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/audit-logs?${query}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.message || "Audit log gagal dimuat.");
      setLogs(payload.data || []);
    } catch (err) {
      setError(err.message || "Audit log gagal dimuat.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLogs();
  }, [query]);

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ScrollText}
        title="AI Audit Log"
        description="Pantau aktivitas AI Agent, AI Documents, chatbot, dan security event dari satu tempat."
        actions={(
          <button className="btn-secondary" type="button" onClick={loadLogs} disabled={loading}>
            {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </button>
        )}
      />

      <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Filter className="h-4 w-4" />
          Filter
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <input className="input" value={filters.user} onChange={(event) => updateFilter("user", event.target.value)} placeholder="User / actor ID" />
          <select className="input" value={filters.role} onChange={(event) => updateFilter("role", event.target.value)}>
            {ROLE_OPTIONS.map((item) => <option key={item || "all"} value={item}>{item || "Semua role"}</option>)}
          </select>
          <input className="input" value={filters.action} onChange={(event) => updateFilter("action", event.target.value)} placeholder="Action" />
          <select className="input" value={filters.status} onChange={(event) => updateFilter("status", event.target.value)}>
            {STATUS_OPTIONS.map((item) => <option key={item || "all"} value={item}>{item || "Semua status"}</option>)}
          </select>
          <select className="input" value={filters.module} onChange={(event) => updateFilter("module", event.target.value)}>
            {MODULE_OPTIONS.map((item) => <option key={item || "all"} value={item}>{item || "Semua module"}</option>)}
          </select>
          <input className="input" type="date" value={filters.dateFrom} onChange={(event) => updateFilter("dateFrom", event.target.value)} />
          <input className="input" type="date" value={filters.dateTo} onChange={(event) => updateFilter("dateTo", event.target.value)} />
        </div>
      </section>

      {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div> : null}

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Waktu</th>
                <th className="px-4 py-3">Module</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Entity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td className="px-4 py-10 text-center text-slate-500" colSpan={6}>Memuat audit log...</td></tr>
              ) : logs.length ? logs.map((item) => (
                <tr key={item.id} className="align-top">
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatDate(item.created_at)}</td>
                  <td className="px-4 py-3 font-medium text-slate-700">{item.module}</td>
                  <td className="px-4 py-3 text-slate-700">{item.action}</td>
                  <td className="px-4 py-3 text-slate-600">{item.role || "-"}</td>
                  <td className="px-4 py-3">{item.status ? <StatusBadge status={item.status} label={item.status} /> : "-"}</td>
                  <td className="px-4 py-3 text-slate-600">{item.entity_type || item.entity_id ? `${item.entity_type || "entity"} #${item.entity_id || "-"}` : "-"}</td>
                </tr>
              )) : (
                <tr><td colSpan={6}><EmptyState title="Belum ada audit log" description="Coba ubah filter atau jalankan aktivitas AI terlebih dahulu." /></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
