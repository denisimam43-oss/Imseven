import React, { useMemo, useState } from "react";
import { ShieldCheck, AlertTriangle, FileWarning, Ban, History, Settings2 } from "lucide-react";
import { useFinance } from "../store/FinanceContext";
import { formatDate, formatRupiah, cn } from "../utils";
import { ROLE_LABEL } from "../types";
import { isRealExpense, isRealIncome } from "../finance";
import { inPeriod } from "../calendar";

const card = "bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden";
const head = "px-6 py-4 border-b border-slate-100 flex items-center gap-3";

export function AuditPanel() {
  const {
    actor,
    can,
    pendingApprovals,
    approveExpense,
    rejectExpense,
    transactions,
    voidedTransactions,
    auditLog,
    projects,
    settings,
    updateSettings,
    currentPeriod,
  } = useFinance();
  const [logLimit, setLogLimit] = useState(50);
  const [limitInput, setLimitInput] = useState(String(settings.approvalLimit));

  const projectName = (id?: string) => projects.find((p) => p.id === id)?.name;

  // Pembayaran klien dan pengeluaran periode berjalan yang belum punya link bukti
  const noEvidence = useMemo(
    () =>
      transactions.filter(
        (t) =>
          !t.evidenceUrl &&
          (isRealIncome(t) || isRealExpense(t)) &&
          !t.parentId &&
          inPeriod(currentPeriod, t.date),
      ),
    [transactions, currentPeriod],
  );

  return (
    <div className="space-y-8 mb-8">
      {/* Persetujuan owner */}
      <div className={card}>
        <div className={head}>
          <span className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
            <ShieldCheck size={20} />
          </span>
          <div>
            <h4 className="font-bold text-slate-800">Persetujuan Owner</h4>
            <p className="text-xs text-slate-500 font-medium">
              Pengeluaran di atas {formatRupiah(settings.approvalLimit)} serta prive/dividen. Selama belum disetujui,
              periode tidak bisa ditutup bukunya.
            </p>
          </div>
        </div>
        {pendingApprovals.length === 0 ? (
          <p className="px-6 py-6 text-xs font-medium text-slate-400">Tidak ada pengeluaran yang menunggu persetujuan.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {pendingApprovals.map((t) => (
              <li key={t.id} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-800">{t.description}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {formatDate(t.date, "dd MMM yyyy")} · {t.expenseCategory} · {projectName(t.projectId) || "Umum"} ·
                    dicatat {t.createdBy || "-"}
                  </p>
                  <p className="text-xs mt-1">
                    <span className="font-mono font-bold text-rose-600">{formatRupiah(t.amount)}</span>
                    {t.evidenceUrl && (
                      <a href={t.evidenceUrl} target="_blank" rel="noreferrer" className="ml-3 text-navy-600 underline">
                        lihat bukti
                      </a>
                    )}
                    {t.approval === "REJECTED" && (
                      <span className="ml-3 font-bold text-rose-700">
                        Ditolak{t.approvalNote ? `: ${t.approvalNote}` : ""} — koreksi atau batalkan transaksi ini
                      </span>
                    )}
                  </p>
                </div>
                {can("approve") ? (
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => approveExpense(t.id)}
                      className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl"
                    >
                      Setujui
                    </button>
                    {t.approval === "PENDING" && (
                      <button
                        onClick={() => {
                          const note = window.prompt("Alasan menolak (wajib):");
                          if (note === null) return;
                          if (note.trim().length < 5) return alert("Alasan penolakan wajib diisi (minimal 5 karakter).");
                          rejectExpense(t.id, note.trim());
                        }}
                        className="px-3 py-2 bg-white border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-bold uppercase tracking-wider rounded-xl"
                      >
                        Tolak
                      </button>
                    )}
                  </div>
                ) : (
                  <span className="text-[11px] font-semibold text-slate-500 shrink-0">Menunggu keputusan Owner</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Tanpa bukti */}
      <div className={card}>
        <div className={head}>
          <span className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
            <FileWarning size={20} />
          </span>
          <div>
            <h4 className="font-bold text-slate-800">Transaksi Tanpa Bukti (periode {currentPeriod.label})</h4>
            <p className="text-xs text-slate-500 font-medium">
              Lengkapi lewat ikon pensil di Riwayat Kas. Aturan: tidak ada bukti, tidak ada pencatatan final.
            </p>
          </div>
          <span
            className={cn(
              "ml-auto px-2.5 py-1 rounded-lg text-xs font-bold",
              noEvidence.length ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700",
            )}
          >
            {noEvidence.length}
          </span>
        </div>
        {noEvidence.length === 0 ? (
          <p className="px-6 py-6 text-xs font-medium text-slate-400">Semua transaksi periode ini sudah punya bukti.</p>
        ) : (
          <ul className="divide-y divide-slate-100 text-xs">
            {noEvidence.slice(0, 40).map((t) => (
              <li key={t.id} className="px-6 py-3 flex justify-between gap-3">
                <span className="min-w-0">
                  <span className="font-semibold text-slate-700">{t.description}</span>
                  <span className="block text-[10px] text-slate-400">
                    {formatDate(t.date, "dd MMM yyyy")} · dicatat {t.createdBy || "-"}
                  </span>
                </span>
                <span className="font-mono font-bold text-slate-600 shrink-0">{formatRupiah(t.amount)}</span>
              </li>
            ))}
            {noEvidence.length > 40 && (
              <li className="px-6 py-3 text-slate-400">dan {noEvidence.length - 40} lainnya...</li>
            )}
          </ul>
        )}
      </div>

      {/* Dibatalkan */}
      <div className={card}>
        <div className={head}>
          <span className="p-2.5 bg-slate-100 text-slate-600 rounded-xl">
            <Ban size={20} />
          </span>
          <div>
            <h4 className="font-bold text-slate-800">Transaksi Dibatalkan</h4>
            <p className="text-xs text-slate-500 font-medium">
              Tidak ikut perhitungan saldo dan laporan. Tidak ada transaksi yang dihapus; semuanya tercatat di sini.
            </p>
          </div>
        </div>
        {voidedTransactions.length === 0 ? (
          <p className="px-6 py-6 text-xs font-medium text-slate-400">Belum ada transaksi yang dibatalkan.</p>
        ) : (
          <ul className="divide-y divide-slate-100 text-xs">
            {voidedTransactions.slice(0, 50).map((t) => (
              <li key={t.id} className="px-6 py-3">
                <div className="flex justify-between gap-3">
                  <span className="font-semibold text-slate-700 line-through decoration-slate-300">{t.description}</span>
                  <span className="font-mono font-bold text-slate-400 shrink-0">{formatRupiah(t.amount)}</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Dibatalkan {t.voidedBy || "-"}
                  {t.voidedAt ? ` · ${formatDate(t.voidedAt, "dd MMM yyyy HH:mm")}` : ""} · alasan: {t.voidReason || "-"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Log aktivitas */}
      <div className={card}>
        <div className={head}>
          <span className="p-2.5 bg-navy-50 text-navy-600 rounded-xl">
            <History size={20} />
          </span>
          <div>
            <h4 className="font-bold text-slate-800">Log Aktivitas</h4>
            <p className="text-xs text-slate-500 font-medium">Siapa melakukan apa dan kapan. Log tidak bisa diubah atau dihapus.</p>
          </div>
        </div>
        {auditLog.length === 0 ? (
          <p className="px-6 py-6 text-xs font-medium text-slate-400">Belum ada aktivitas tercatat.</p>
        ) : (
          <ul className="divide-y divide-slate-100 text-xs">
            {auditLog.slice(0, logLimit).map((a) => (
              <li key={a.id} className="px-6 py-3">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="font-bold text-slate-800">{a.action}</span>
                  <span className="text-slate-400">·</span>
                  <span className="text-slate-600">{a.by}</span>
                  <span className="text-[10px] text-slate-400">({ROLE_LABEL[a.role] || a.role})</span>
                  <span className="ml-auto text-[10px] font-mono text-slate-400">{formatDate(a.ts, "dd MMM yyyy HH:mm")}</span>
                </div>
                <p className="text-slate-500 mt-0.5 break-words">{a.summary}</p>
              </li>
            ))}
          </ul>
        )}
        {auditLog.length > logLimit && (
          <div className="p-4 text-center">
            <button onClick={() => setLogLimit((l) => l + 50)} className="text-xs font-bold text-navy-600 hover:underline">
              Tampilkan lebih banyak ({auditLog.length - logLimit} lagi)
            </button>
          </div>
        )}
      </div>

      {/* Pengaturan kontrol (Owner) */}
      <div className={card}>
        <div className={head}>
          <span className="p-2.5 bg-slate-100 text-slate-600 rounded-xl">
            <Settings2 size={20} />
          </span>
          <div>
            <h4 className="font-bold text-slate-800">Pengaturan Kontrol</h4>
            <p className="text-xs text-slate-500 font-medium">
              Masuk sebagai {actor.name} ({ROLE_LABEL[actor.role]}). Hanya Owner yang dapat mengubah pengaturan ini.
            </p>
          </div>
        </div>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
          <div>
            <label className="block font-bold text-slate-600 mb-1 uppercase tracking-wider">
              Batas persetujuan owner (Rp)
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                value={limitInput}
                disabled={!can("editSettings")}
                onChange={(e) => setLimitInput(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono disabled:bg-slate-50"
              />
              {can("editSettings") && (
                <button
                  onClick={() => {
                    const n = Number(limitInput);
                    if (!n || n < 0) return alert("Nominal tidak valid.");
                    updateSettings({ approvalLimit: n });
                  }}
                  className="px-3 py-2 bg-slate-900 text-white font-bold uppercase tracking-wider rounded-xl"
                >
                  Simpan
                </button>
              )}
            </div>
          </div>
          <div>
            <label className="block font-bold text-slate-600 mb-1 uppercase tracking-wider">Bukti wajib</label>
            <label className="flex items-start gap-2 text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5"
                disabled={!can("editSettings")}
                checked={settings.requireEvidence}
                onChange={(e) => {
                  if (
                    !e.target.checked &&
                    !window.confirm(
                      "Matikan kewajiban bukti? Hanya untuk sementara saat mengisi data lama. Nyalakan lagi setelah selesai.",
                    )
                  )
                    return;
                  updateSettings({ requireEvidence: e.target.checked });
                }}
              />
              <span>
                Wajib mengisi link bukti saat mencatat pembayaran klien dan pengeluaran. Matikan hanya sementara saat
                mengisi data lama.
              </span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AuditAlert() {
  return (
    <span className="inline-flex items-center gap-1 text-amber-700">
      <AlertTriangle size={12} />
    </span>
  );
}
