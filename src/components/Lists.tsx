import React, { useState } from "react";
import { useFinance } from "../store/FinanceContext";
import { formatDate, formatRupiah, cn, toDateInput, fromDateInput } from "../utils";
import {
  Edit2,
  Trash2,
  Check,
  X,
  AlertTriangle,
  Building,
  Archive,
  ArchiveRestore,
  HandCoins,
  PackageCheck,
  Undo2,
  CalendarClock,
  Lock,
} from "lucide-react";
import {
  CATEGORY_LABEL,
  INCOME_TYPE_LABEL,
  PaymentScheme,
  Project,
  ProjectCategory,
  RekeningType,
  SCHEME_LABEL,
  Transaction,
} from "../types";
import { summarizeProject } from "../finance";
import { planStatus } from "../plan";
import { fmtDay } from "../calendar";

type ProjectFilter = "ALL" | "ONGOING" | "COMPLETED" | "ARCHIVED";

export function ProjectList({ onPayment }: { onPayment: (projectId: string) => void }) {
  const {
    projects,
    transactions,
    supports,
    completeProject,
    reopenProject,
    archiveProject,
    deleteProject,
    setProjectPlan,
    isLocked,
  } = useFinance();
  const [filter, setFilter] = useState<ProjectFilter>("ALL");
  const [planEdit, setPlanEdit] = useState<Project | null>(null);
  const [peCategory, setPeCategory] = useState<ProjectCategory>("REGULER");
  const [peScheme, setPeScheme] = useState<PaymentScheme>("50_50");
  const [peDp, setPeDp] = useState("");
  const [peHandover, setPeHandover] = useState("");
  const openPlanEdit = (p: Project) => {
    setPlanEdit(p);
    setPeCategory(p.category || "REGULER");
    setPeScheme(p.paymentScheme || "50_50");
    const firstIncome = transactions
      .filter((t) => t.projectId === p.id && t.type === "INCOME" && !t.supportId && !t.isAdjustment)
      .reduce<number | undefined>((m, t) => (m === undefined || t.date < m ? t.date : m), undefined);
    setPeDp(toDateInput(p.plan?.dpDate ?? firstIncome ?? p.createdAt));
    setPeHandover(p.plan?.handoverManual ? toDateInput(p.plan.handover) : "");
  };
  const [handover, setHandover] = useState<Project | null>(null);
  const [handoverDate, setHandoverDate] = useState(toDateInput());

  const active = projects.filter((p) => !p.archived);
  const counts = {
    ALL: active.length,
    ONGOING: active.filter((p) => p.status === "ONGOING").length,
    COMPLETED: active.filter((p) => p.status === "COMPLETED").length,
    ARCHIVED: projects.filter((p) => p.archived).length,
  };

  const projectList = projects.filter((p) => {
    if (filter === "ARCHIVED") return p.archived;
    if (p.archived) return false;
    if (filter === "ONGOING") return p.status === "ONGOING";
    if (filter === "COMPLETED") return p.status === "COMPLETED";
    return true;
  });

  if (projects.length === 0) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center">
        <Building size={36} className="mx-auto mb-2 text-slate-300" />
        <p className="text-slate-500 font-medium">Belum ada proyek yang berjalan.</p>
        <p className="text-xs text-slate-400 mt-1">
          Klik tombol &quot;Proyek&quot; di atas untuk mendaftarkan proyek baru.
        </p>
      </div>
    );
  }

  const tabs: [ProjectFilter, string][] = [
    ["ALL", "Aktif"],
    ["ONGOING", "Dikerjakan"],
    ["COMPLETED", "Serah Terima"],
    ["ARCHIVED", "Arsip"],
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h4 className="font-bold text-slate-800 text-base">Pipeline Proyek</h4>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Pembayaran dicatat sesuai uang yang masuk. Pendapatan diakui saat serah terima.
          </p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600 overflow-x-auto">
          {tabs.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={cn(
                "px-3 py-1.5 rounded-lg transition-all whitespace-nowrap",
                filter === key ? "bg-white text-slate-900 shadow-sm font-bold" : "hover:text-slate-900",
              )}
            >
              {label} ({counts[key]})
            </button>
          ))}
        </div>
      </div>

      <ul className="divide-y divide-slate-100 max-h-[520px] overflow-y-auto">
        {projectList.map((project) => {
          const s = summarizeProject(project, transactions);
          const debt = supports
            .filter((x) => x.toProjectId === project.id && x.status === "OUTSTANDING")
            .reduce((sum, x) => sum + x.amount, 0);
          const paidPct = project.totalValue > 0 ? Math.min(100, (s.received / project.totalValue) * 100) : 0;

          return (
            <li key={project.id} className="p-5 hover:bg-slate-50 transition-colors">
              <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-slate-800 text-sm">{project.name}</h4>
                    <span
                      className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border",
                        project.status === "ONGOING"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : s.outstanding > 0
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200",
                      )}
                    >
                      {project.status === "ONGOING"
                        ? "Dikerjakan"
                        : s.outstanding > 0
                          ? "Serah Terima - Belum Lunas"
                          : "Selesai & Lunas"}
                    </span>
                    {project.isDebtProject && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border bg-rose-50 text-rose-700 border-rose-200">
                        Utang Project
                      </span>
                    )}
                    {debt > 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                        <AlertTriangle size={11} />
                        Talangan: {formatRupiah(debt)}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2.5 text-xs">
                    <Stat label="Nilai Kontrak" value={project.totalValue} />
                    <Stat label={`Diterima (${paidPct.toFixed(0)}%)`} value={s.received} cls="text-emerald-600" />
                    <Stat label="Sisa Tagihan" value={s.outstanding} cls={s.outstanding > 0 ? "text-blue-600" : "text-slate-400"} />
                    <Stat label="Biaya Proyek" value={s.totalCost} cls="text-rose-500" />
                  </div>

                  <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: `${paidPct}%` }} />
                  </div>

                  {(() => {
                    const st = planStatus(project, transactions);
                    if (!st || !project.plan) {
                      return !project.isDebtProject && project.status === "ONGOING" ? (
                        <button
                          onClick={() => openPlanEdit(project)}
                          className="mt-2 text-[11px] font-bold text-indigo-600 hover:underline"
                        >
                          + Buat rencana produksi & tagihan
                        </button>
                      ) : null;
                    }
                    const pl = project.plan;
                    return (
                      <div className="mt-2.5 p-2.5 rounded-lg border border-indigo-100 bg-indigo-50/50 text-[11px] text-indigo-950 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span className="font-bold">{CATEGORY_LABEL[project.category || "REGULER"]}</span>
                          <span>Produksi {fmtDay(new Date(pl.productionStart))} – {fmtDay(new Date(pl.productionEnd))}</span>
                          <span>
                            Serah terima <b>{fmtDay(new Date(pl.handover))}</b> → laba periode <b>{st.harvest.label}</b>
                          </span>
                          {st.handoverLate && (
                            <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 font-bold">Lewat jadwal serah terima</span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {st.payments.map((x) => (
                            <span
                              key={x.label}
                              className={cn(
                                "px-2 py-0.5 rounded-full border font-semibold whitespace-nowrap",
                                x.state === "LUNAS"
                                  ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                  : x.overdue
                                    ? "bg-rose-50 border-rose-200 text-rose-700"
                                    : "bg-white border-slate-200 text-slate-600",
                              )}
                            >
                              {x.label} {x.pct}% · {fmtDay(new Date(x.due))} ·{" "}
                              {x.state === "LUNAS" ? "lunas" : x.state === "SEBAGIAN" ? `kurang ${formatRupiah(x.remaining)}` : formatRupiah(x.amount)}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {project.clientNotes && (
                    <p className="text-xs text-slate-500 mt-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      Catatan: {project.clientNotes}
                    </p>
                  )}

                  <div className="mt-2 text-[10px] text-slate-400 font-medium">
                    Terdaftar: {formatDate(project.createdAt, "dd MMM yyyy")}
                    {project.completedAt && (
                      <span className="ml-2 text-emerald-600 font-semibold">
                        • Serah terima: {formatDate(project.completedAt, "dd MMM yyyy")}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 self-end sm:self-center">
                  {!project.archived && !project.isDebtProject && project.plan && project.status === "ONGOING" && (
                    <button
                      onClick={() => openPlanEdit(project)}
                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                      title="Ubah Rencana (kategori, skema, tanggal serah terima)"
                    >
                      <CalendarClock size={16} />
                    </button>
                  )}
                  {!project.archived && s.outstanding > 0 && (
                    <button
                      onClick={() => onPayment(project.id)}
                      className="flex items-center gap-1 bg-navy-600 hover:bg-navy-700 text-white text-xs font-bold uppercase tracking-wider px-3 py-2 rounded-xl transition-colors shadow-sm"
                    >
                      <HandCoins size={14} /> Terima Bayar
                    </button>
                  )}
                  {!project.archived && project.status === "ONGOING" && (
                    <button
                      onClick={() => {
                        setHandover(project);
                        setHandoverDate(toDateInput());
                      }}
                      className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider px-3 py-2 rounded-xl transition-colors shadow-sm"
                    >
                      <PackageCheck size={14} /> Serah Terima
                    </button>
                  )}
                  {!project.archived && project.status === "COMPLETED" && (
                    <button
                      onClick={() => {
                        if (project.completedAt && isLocked(project.completedAt))
                          return alert("Serah terima ini ada di periode yang sudah tutup buku, jadi tidak bisa dibatalkan.");
                        if (window.confirm(`Batalkan status serah terima "${project.name}"? Pendapatannya akan kembali belum diakui.`))
                          reopenProject(project.id);
                      }}
                      className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-colors"
                      title="Batalkan Serah Terima"
                    >
                      <Undo2 size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => archiveProject(project.id, !project.archived)}
                    className="p-2 text-slate-400 hover:text-navy-600 hover:bg-navy-50 rounded-xl transition-colors"
                    title={project.archived ? "Pulihkan dari Arsip" : "Arsipkan Proyek"}
                  >
                    {project.archived ? <ArchiveRestore size={16} /> : <Archive size={16} />}
                  </button>
                  <button
                    onClick={() => {
                      if (!window.confirm(`Hapus proyek "${project.name}"?`)) return;
                      if (!deleteProject(project.id)) {
                        alert(
                          "Proyek ini sudah punya transaksi, jadi tidak bisa dihapus agar jejak keuangan tetap utuh. Gunakan tombol Arsip.",
                        );
                      }
                    }}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                    title="Hapus (hanya proyek tanpa transaksi)"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </li>
          );
        })}
        {projectList.length === 0 && (
          <li className="p-8 text-center text-slate-400 text-sm font-medium">Tidak ada proyek pada kategori ini.</li>
        )}
      </ul>

      {handover && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h4 className="font-bold text-slate-800 text-base">Serah Terima Proyek</h4>
              <p className="text-xs text-slate-500 font-medium">{handover.name}</p>
            </div>
            <div className="p-6 space-y-4 text-xs text-slate-600">
              <p>
                Setelah serah terima, nilai kontrak <b>{formatRupiah(handover.totalValue)}</b> diakui sebagai pendapatan
                dan seluruh biaya proyek diakui sebagai HPP. Sisa tagihan yang belum dibayar menjadi <b>piutang</b>.
              </p>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">Tanggal Serah Terima</label>
                <input
                  type="date"
                  value={handoverDate}
                  max={toDateInput()}
                  onChange={(e) => setHandoverDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                />
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setHandover(null)} className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100">
                Batal
              </button>
              <button
                onClick={() => {
                  const ts = fromDateInput(handoverDate);
                  if (isLocked(ts)) return alert("Tanggal ini ada di periode yang sudah tutup buku. Pilih tanggal di periode berjalan.");
                  completeProject(handover.id, ts);
                  setHandover(null);
                }}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider"
              >
                Konfirmasi Serah Terima
              </button>
            </div>
          </div>
        </div>
      )}

      {planEdit && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h4 className="font-bold text-slate-800 text-base">Rencana Produksi & Tagihan</h4>
              <p className="text-xs text-slate-500 font-medium">{planEdit.name}</p>
            </div>
            <div className="p-6 space-y-3 text-xs text-slate-600">
              {(
                [
                  ["Kategori", peCategory, (v: string) => setPeCategory(v as ProjectCategory), CATEGORY_LABEL],
                  ["Skema Pembayaran", peScheme, (v: string) => setPeScheme(v as PaymentScheme), SCHEME_LABEL],
                ] as const
              ).map(([label, val, set, opts]) => (
                <div key={label}>
                  <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">{label}</label>
                  <select value={val} onChange={(e) => set(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm">
                    {Object.entries(opts).map(([k, l]) => (
                      <option key={k} value={k}>{l}</option>
                    ))}
                  </select>
                </div>
              ))}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">Tanggal DP (kick off)</label>
                <input type="date" value={peDp} onChange={(e) => setPeDp(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">Serah terima disepakati (opsional)</label>
                <input type="date" value={peHandover} min={peDp} onChange={(e) => setPeHandover(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm" />
                <p className="text-[10px] text-slate-400 mt-1">Kosongkan agar dihitung otomatis dari durasi standar kategori.</p>
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setPlanEdit(null)} className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100">
                Batal
              </button>
              <button
                onClick={() => {
                  setProjectPlan(planEdit.id, {
                    category: peCategory,
                    scheme: peScheme,
                    dpDate: peDp ? fromDateInput(peDp) : undefined,
                    handover: peHandover ? fromDateInput(peHandover) : undefined,
                  });
                  setPlanEdit(null);
                }}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider"
              >
                Simpan Rencana
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, cls }: { label: string; value: number; cls?: string }) {
  return (
    <div>
      <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">{label}</span>
      <span className={cn("font-bold font-mono text-slate-800", cls)}>{formatRupiah(value)}</span>
    </div>
  );
}

function TypeBadge({ t }: { t: Transaction }) {
  if (t.isAdjustment)
    return <span className="px-2 py-0.5 bg-purple-50 text-purple-600 rounded font-bold text-[10px] uppercase tracking-wider">Penyesuaian</span>;
  if (t.type === "TRANSFER")
    return (
      <div className="flex items-center gap-1.5">
        <span className="px-2 py-0.5 bg-sky-50 text-sky-600 rounded font-bold text-[10px] uppercase tracking-wider">Transfer</span>
        <span className="text-[10px] text-slate-500 font-medium">{t.fromAccount} → {t.toAccount}</span>
      </div>
    );
  if (t.type === "INCOME")
    return (
      <div className="flex items-center gap-1.5">
        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded font-bold text-[10px] uppercase tracking-wider">Masuk</span>
        <span className="text-[10px] text-slate-500 font-medium">
          {t.account || "REK1"}
          {t.incomeType ? ` • ${INCOME_TYPE_LABEL[t.incomeType]}` : ""}
        </span>
      </div>
    );
  return (
    <div className="flex flex-col gap-1">
      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded font-bold text-[10px] uppercase tracking-wider w-fit">{t.expenseAccount}</span>
      {t.expenseCategory && (
        <span className="text-[10px] font-semibold text-slate-500 line-clamp-1" title={t.expenseCategory}>
          {t.expenseCategory}
        </span>
      )}
    </div>
  );
}

export function TransactionHistory() {
  const { filteredTransactions, deleteTransaction, updateTransaction, projects, isLocked } = useFinance();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState("");
  const [editAmount, setEditAmount] = useState(0);
  const [editDate, setEditDate] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editAccount, setEditAccount] = useState<RekeningType>("REK1");
  const [showTransfers, setShowTransfers] = useState(true);
  const [limit, setLimit] = useState(50);

  const projectName = (id?: string) => projects.find((p) => p.id === id)?.name;
  const rows = filteredTransactions.filter((t) => showTransfers || t.type !== "TRANSFER");

  const handleEdit = (t: Transaction) => {
    setEditingId(t.id);
    setEditDesc(t.description);
    setEditAmount(t.amount);
    setEditDate(toDateInput(t.date));
    setEditCategory(t.expenseCategory || "");
    setEditAccount(t.expenseAccount || "REK1");
  };

  const handleSave = (t: Transaction) => {
    const data: Partial<Transaction> = { description: editDesc, amount: editAmount };
    if (editDate !== toDateInput(t.date)) data.date = fromDateInput(editDate);
    if (data.date !== undefined && isLocked(data.date))
      return alert("Tanggal baru masuk periode yang sudah tutup buku. Pilih tanggal di periode berjalan.");
    if (t.type === "EXPENSE") {
      data.expenseCategory = editCategory;
      data.expenseAccount = editAccount;
    }
    updateTransaction(t.id, data);
    setEditingId(null);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h4 className="font-bold text-slate-700">Riwayat Kas</h4>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Urut berdasarkan tanggal transaksi. Cocokkan dengan mutasi rekening setiap minggu.
          </p>
        </div>
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer">
          <input type="checkbox" checked={showTransfers} onChange={(e) => setShowTransfers(e.target.checked)} />
          Tampilkan transfer antar rekening
        </label>
      </div>
      <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
            <tr className="border-b border-slate-100">
              <th className="px-6 py-3">Tanggal</th>
              <th className="px-6 py-3">Deskripsi</th>
              <th className="px-6 py-3">Jenis & Rekening</th>
              <th className="px-6 py-3 text-right">Nominal</th>
              <th className="px-6 py-3 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="text-xs">
            {rows.slice(0, limit).map((t) => {
              const editing = editingId === t.id;
              const isChild = !!t.parentId;
              return (
                <tr key={t.id} className={cn("border-b border-slate-50 hover:bg-slate-50 transition-colors", isChild && "bg-slate-50/50")}>
                  <td className="px-6 py-3 font-mono text-slate-400 whitespace-nowrap">
                    {editing ? (
                      <input type="date" value={editDate} max={toDateInput()} onChange={(e) => setEditDate(e.target.value)} className="px-2 py-1 border border-slate-200 rounded text-xs" />
                    ) : (
                      formatDate(t.date, "dd/MM/yy")
                    )}
                  </td>
                  <td className="px-6 py-3 font-semibold text-slate-700">
                    {editing ? (
                      <input type="text" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="w-full px-2 py-1 border border-slate-200 rounded text-xs" />
                    ) : (
                      <div>
                        <span className={cn(isChild && "text-slate-500 font-medium")}>{t.description}</span>
                        {t.supportId && (
                          <span className="ml-2 text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">Talangan</span>
                        )}
                        {t.pending && (
                          <span className="ml-2 text-[10px] font-bold text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded" title="Belum dikerjakan di bank, saldo belum berubah">
                            Arahan
                          </span>
                        )}
                        {(() => {
                          const pn = projectName(t.projectId);
                          return pn && !t.description.includes(pn) ? (
                            <span className="block text-[10px] text-slate-400 font-medium">{pn}</span>
                          ) : null;
                        })()}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-3">
                    {editing && t.type === "EXPENSE" ? (
                      <div className="flex flex-col gap-2">
                        <select value={editAccount} onChange={(e) => setEditAccount(e.target.value as RekeningType)} className="w-full px-2 py-1 border border-slate-200 rounded text-[10px] uppercase font-bold">
                          <option value="REK1">REK1</option>
                          <option value="REK2">REK2</option>
                          <option value="REK3">REK3</option>
                          <option value="REK4">REK4</option>
                        </select>
                        <input type="text" value={editCategory} onChange={(e) => setEditCategory(e.target.value)} className="w-full px-2 py-1 border border-slate-200 rounded text-xs" placeholder="Kategori" />
                      </div>
                    ) : (
                      <TypeBadge t={t} />
                    )}
                  </td>
                  <td
                    className={cn(
                      "px-6 py-3 text-right font-bold font-mono whitespace-nowrap",
                      t.type === "INCOME" ? "text-emerald-600" : t.type === "TRANSFER" ? "text-sky-600" : "text-rose-500",
                    )}
                  >
                    {editing ? (
                      <input type="number" value={editAmount} onChange={(e) => setEditAmount(Number(e.target.value))} className="w-28 px-2 py-1 border border-slate-200 rounded text-xs text-right" />
                    ) : (
                      <>
                        {t.type === "INCOME" ? "+" : t.type === "EXPENSE" ? "-" : ""}
                        {formatRupiah(t.amount)}
                      </>
                    )}
                  </td>
                  <td className="px-6 py-3 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-2">
                      {editing ? (
                        <>
                          <button onClick={() => handleSave(t)} className="text-emerald-600 hover:text-emerald-800 p-1 bg-emerald-50 rounded" title="Simpan">
                            <Check size={14} />
                          </button>
                          <button onClick={() => setEditingId(null)} className="text-slate-500 hover:text-slate-700 p-1 bg-slate-100 rounded" title="Batal">
                            <X size={14} />
                          </button>
                        </>
                      ) : isLocked(t.date) ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-slate-400" title="Periode sudah tutup buku">
                          <Lock size={11} /> tutup buku
                        </span>
                      ) : isChild || t.supportId ? (
                        <span className="text-[10px] text-slate-400" title={isChild ? "Ikut transaksi uang masuknya" : "Kelola dari menu Talangan"}>
                          otomatis
                        </span>
                      ) : (
                        <>
                          <button onClick={() => handleEdit(t)} className="text-navy-600 hover:text-navy-800 p-1 hover:bg-navy-50 rounded transition-colors" title="Edit Transaksi">
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => {
                              const msg =
                                t.type === "INCOME" ? "Hapus uang masuk ini beserta transfer alokasinya?" : "Hapus transaksi ini?";
                              if (window.confirm(msg)) deleteTransaction(t.id);
                            }}
                            className="text-rose-500 hover:text-rose-700 p-1 hover:bg-rose-50 rounded transition-colors"
                            title="Hapus Transaksi"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center font-medium text-slate-400">
                  Belum ada transaksi pada periode ini.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {rows.length > limit && (
          <div className="p-4 text-center">
            <button onClick={() => setLimit((l) => l + 50)} className="text-xs font-bold text-navy-600 hover:underline">
              Tampilkan lebih banyak ({rows.length - limit} lagi)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
