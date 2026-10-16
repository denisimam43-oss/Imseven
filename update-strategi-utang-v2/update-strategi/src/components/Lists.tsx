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
} from "lucide-react";
import { INCOME_TYPE_LABEL, Project, RekeningType, Transaction } from "../types";
import { summarizeProject } from "../finance";

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
  } = useFinance();
  const [filter, setFilter] = useState<ProjectFilter>("ALL");
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
                  completeProject(handover.id, fromDateInput(handoverDate));
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
  const { filteredTransactions, deleteTransaction, updateTransaction, projects } = useFinance();
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
