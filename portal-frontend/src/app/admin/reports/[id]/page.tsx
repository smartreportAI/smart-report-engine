"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, User, Activity, AlertTriangle, ArrowRight, FileText as FileIcon, Clock, Server, Send, Calendar, Building2, Eye } from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/shared/status-badge";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

function formatDateTime(d?: string): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

async function downloadFromApi(endpoint: string, fallbackName: string) {
  try {
    const { apiClient } = await import("@/lib/api/client");
    const res: any = await apiClient(endpoint);
    if (res?.data?.url) {
      window.open(res.data.url, "_blank");
    }
  } catch {
    // Silently fail — button won't show if no S3 key exists
  }
}

export default function ReportDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "reports", id],
    queryFn: () => apiClient(`/admin/reports/${id}`),
  });

  const report = data?.data;

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;
  }

  if (!report) {
    return <div className="text-center py-20 text-slate-500">Report not found</div>;
  }

  const mappedPercent = report.totalParameters > 0
    ? Math.round((report.mappedCount / report.totalParameters) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <Link href="/admin/reports" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-blue-600 mb-3">
          <ArrowLeft className="w-4 h-4" /> Back to Reports
        </Link>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900 font-mono">{report.labNo}</h1>
              <StatusBadge status={report.status} />
            </div>
            <div className="flex items-center flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-slate-500">
              <Link href={`/admin/clients/${report.tenantId}`} className="inline-flex items-center gap-1 hover:text-blue-600">
                <Building2 className="w-3.5 h-3.5" /> <span className="font-mono">{report.tenantId}</span>
              </Link>
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> {formatDateTime(report.createdAt)}
              </span>
              {report.source && (
                <span className="inline-flex items-center gap-1 uppercase">
                  <Server className="w-3.5 h-3.5" /> {report.source}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {(report.s3PdfKey || report.pdfUrl) && (
              <button
                onClick={() => report.s3PdfKey ? downloadFromApi(`/admin/reports/${id}/pdf`, `${report.labNo}.pdf`) : window.open(report.pdfUrl.startsWith("http") ? report.pdfUrl : `${API_URL}${report.pdfUrl}`, "_blank")}
                className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3.5 py-2 rounded-lg shadow-sm shadow-blue-600/20 transition-colors"
              >
                <Eye className="w-4 h-4" /> View PDF
              </button>
            )}
            {report.s3InputKey && (
              <button
                onClick={() => downloadFromApi(`/admin/reports/${id}/input`, `${report.labNo}.json`)}
                className="inline-flex items-center gap-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium px-3.5 py-2 rounded-lg transition-colors"
              >
                <Eye className="w-4 h-4" /> View JSON
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Failure banner */}
      {report.status === "failed" && report.errorMessage && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800">Report generation failed</p>
            <p className="text-sm text-red-600 mt-0.5 font-mono break-all">{report.errorMessage}</p>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patient Info */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-4 h-4 text-blue-600" />
            <h2 className="text-base font-semibold text-slate-900">Patient</h2>
          </div>
          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Name</span><span className="text-slate-900 font-medium">{report.patientName}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Age</span><span className="text-slate-900">{report.age} yrs</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Gender</span><span className="text-slate-900 capitalize">{report.gender}</span></div>
            {report.referredBy && <div className="flex justify-between"><span className="text-slate-500">Referred By</span><span className="text-slate-900">{report.referredBy}</span></div>}
            {report.packageName && <div className="flex justify-between"><span className="text-slate-500">Package</span><span className="text-slate-900">{report.packageName}</span></div>}
          </div>
        </motion.div>

        {/* Score & Severity */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-emerald-600" />
            <h2 className="text-base font-semibold text-slate-900">Health Score</h2>
          </div>
          <div className="text-center py-2">
            <p className="text-5xl font-bold text-slate-900">{report.overallScore ?? "—"}</p>
            <p className="text-sm text-slate-400">out of 100</p>
            {report.overallSeverity && (
              <div className="mt-3"><StatusBadge status={report.overallSeverity === "stable" ? "active" : report.overallSeverity === "critical" ? "failed" : "pending"} /></div>
            )}
          </div>
        </motion.div>

        {/* Mapping Stats */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Mapping</h2>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-500">Mapped</span>
                <span className="text-slate-900 font-medium">{report.mappedCount}/{report.totalParameters}</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${mappedPercent}%` }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                  className="h-full bg-blue-500 rounded-full"
                />
              </div>
            </div>
            <div className="flex justify-between text-sm"><span className="text-slate-500">Normal</span><span className="text-emerald-600 font-medium">{report.normalCount}</span></div>
            <div className="flex justify-between text-sm"><span className="text-slate-500">Abnormal</span><span className="text-red-600 font-medium">{report.abnormalCount}</span></div>
            {report.unmappedCount > 0 && <div className="flex justify-between text-sm"><span className="text-slate-500">Unmapped</span><span className="text-amber-600 font-medium">{report.unmappedCount}</span></div>}
          </div>
        </motion.div>
      </div>

      {/* Abnormal Parameters */}
      {report.abnormalParameters?.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <h2 className="text-base font-semibold text-slate-900">Abnormal Parameters ({report.abnormalParameters.length})</h2>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-5 py-2.5 font-medium text-slate-600">Parameter</th>
              <th className="text-left px-5 py-2.5 font-medium text-slate-600">Profile</th>
              <th className="text-right px-5 py-2.5 font-medium text-slate-600">Value</th>
              <th className="text-right px-5 py-2.5 font-medium text-slate-600">Range</th>
              <th className="text-right px-5 py-2.5 font-medium text-slate-600">Status</th>
            </tr></thead>
            <tbody>
              {report.abnormalParameters.map((p: any, i: number) => {
                const statusColor =
                  p.status === "critical" ? "bg-red-100 text-red-700" :
                  p.status === "high" ? "bg-orange-100 text-orange-700" :
                  p.status === "low" ? "bg-blue-100 text-blue-700" :
                  "bg-amber-100 text-amber-700";
                const statusLabel = p.status || (
                  p.value != null && p.max != null && Number(p.value) > Number(p.max) ? "high" :
                  p.value != null && p.min != null && Number(p.value) < Number(p.min) ? "low" :
                  "abnormal"
                );
                return (
                  <tr key={i} className="border-b border-slate-50 hover:bg-red-50/30">
                    <td className="px-5 py-2.5 text-slate-900 font-medium">{p.name}</td>
                    <td className="px-5 py-2.5 text-slate-500">{p.profileName || p.profile}</td>
                    <td className="px-5 py-2.5 text-right font-mono text-slate-900">{p.value} {p.unit}</td>
                    <td className="px-5 py-2.5 text-right font-mono text-xs text-slate-400">{p.min ?? "—"} – {p.max ?? "—"}</td>
                    <td className="px-5 py-2.5 text-right">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColor}`}>
                        {statusLabel === "high" ? "↑ High" : statusLabel === "low" ? "↓ Low" : statusLabel === "critical" ? "⚠ Critical" : statusLabel}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </motion.div>
      )}

      {/* Unmapped Parameters */}
      {report.unmappedParameters?.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="bg-amber-50 rounded-xl border border-amber-200 p-5">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-amber-800">Unmapped Parameters</h2>
            <Link href={`/admin/mappings?tab=unmapped&tenant=${report.tenantId}`}
              className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 hover:text-amber-900 hover:underline">
              Resolve in Mappings <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {report.unmappedParameters.map((p: string, i: number) => (
              <span key={i} className="px-2 py-1 bg-white rounded-md text-xs font-mono text-amber-700 border border-amber-200">{p}</span>
            ))}
          </div>
        </motion.div>
      )}

      {/* Processing & Dispatch */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
        className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Server className="w-4 h-4 text-slate-500" />
          <h2 className="text-base font-semibold text-slate-900">Processing & Dispatch</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-slate-400 text-xs mb-1 flex items-center gap-1"><Server className="w-3 h-3" /> Source</p>
            <p className="text-slate-900 font-medium uppercase">{report.source || "—"}</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs mb-1 flex items-center gap-1"><Clock className="w-3 h-3" /> Generation Time</p>
            <p className="text-slate-900 font-medium">{report.generationTimeMs != null ? `${report.generationTimeMs} ms` : "—"}</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs mb-1 flex items-center gap-1"><Send className="w-3 h-3" /> Dispatch</p>
            {report.dispatchStatus
              ? <StatusBadge status={report.dispatchStatus} />
              : <p className="text-slate-900 font-medium">—</p>}
          </div>
          <div>
            <p className="text-slate-400 text-xs mb-1 flex items-center gap-1"><FileIcon className="w-3 h-3" /> PDF Size</p>
            <p className="text-slate-900 font-medium">{report.pdfSize ? `${(report.pdfSize / 1024).toFixed(0)} KB` : "—"}</p>
          </div>
          {report.org && (
            <div>
              <p className="text-slate-400 text-xs mb-1">Organization</p>
              <p className="text-slate-900 font-medium">{report.org}</p>
            </div>
          )}
          {report.centre && (
            <div>
              <p className="text-slate-400 text-xs mb-1">Centre</p>
              <p className="text-slate-900 font-medium">{report.centre}</p>
            </div>
          )}
          {report.dispatchedAt && (
            <div>
              <p className="text-slate-400 text-xs mb-1">Dispatched At</p>
              <p className="text-slate-900 font-medium">{formatDateTime(report.dispatchedAt)}</p>
            </div>
          )}
          {report.patientId && (
            <div>
              <p className="text-slate-400 text-xs mb-1">Patient ID</p>
              <p className="text-slate-900 font-medium font-mono">{report.patientId}</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
