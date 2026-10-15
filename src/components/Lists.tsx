import React, { useState } from "react";
import { useFinance } from "../store/FinanceContext";
import { formatDate, formatRupiah, cn } from "../utils";
import {
  Edit2,
  Trash2,
  Check,
  X,
  AlertTriangle,
  CheckCircle2,
  Building,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import { Project } from "../types";

export function ProjectList() {
  const { projects, payPelunasan, deleteProject, supports } = useFinance();
  const [filter, setFilter] = useState<"ALL" | "ONGOING" | "COMPLETED">("ALL");
  const [selectedForPelunasan, setSelectedForPelunasan] = useState<Project | null>(null);
  const [autoSettleLiabilities, setAutoSettleLiabilities] = useState(true);

  if (projects.length === 0) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center">
        <Building size={36} className="mx-auto mb-2 text-slate-300" />
        <p className="text-slate-500 font-medium">
          Belum ada proyek yang berjalan.
        </p>
        <p className="text-xs text-slate-400 mt-1">
          Klik tombol &quot;+ Input Proyek&quot; di atas untuk mendaftarkan proyek baru.
        </p>
      </div>
    );
  }

  const projectList = projects.filter((p) => {
    if (filter === "ONGOING") return p.status === "ONGOING";
    if (filter === "COMPLETED") return p.status === "COMPLETED";
    return true;
  });

  // Calculate liabilities for selected project
  const outstandingLiabilities = selectedForPelunasan
    ? supports.filter(
        (s) =>
          s.toProjectId === selectedForPelunasan.id &&
          s.status === "OUTSTANDING"
      )
    : [];

  const totalOutstandingForProject = outstandingLiabilities.reduce(
    (sum, s) => sum + s.amount,
    0
  );

  const handleConfirmPelunasan = () => {
    if (!selectedForPelunasan) return;
    payPelunasan(selectedForPelunasan.id, autoSettleLiabilities);
    setSelectedForPelunasan(null);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h4 className="font-bold text-slate-800 text-base">Pipeline Proyek</h4>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Manajemen status kontrak, penagihan DP 60%, piutang, dan pelunasan 40%.
          </p>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600">
          <button
            onClick={() => setFilter("ALL")}
            className={cn(
              "px-3 py-1.5 rounded-lg transition-all",
              filter === "ALL"
                ? "bg-white text-slate-900 shadow-sm font-bold"
                : "hover:text-slate-900"
            )}
          >
            Semua ({projects.length})
          </button>
          <button
            onClick={() => setFilter("ONGOING")}
            className={cn(
              "px-3 py-1.5 rounded-lg transition-all",
              filter === "ONGOING"
                ? "bg-white text-amber-600 shadow-sm font-bold"
                : "hover:text-slate-900"
            )}
          >
            Ongoing ({projects.filter((p) => p.status === "ONGOING").length})
          </button>
          <button
            onClick={() => setFilter("COMPLETED")}
            className={cn(
              "px-3 py-1.5 rounded-lg transition-all",
              filter === "COMPLETED"
                ? "bg-white text-emerald-600 shadow-sm font-bold"
                : "hover:text-slate-900"
            )}
          >
            Selesai ({projects.filter((p) => p.status === "COMPLETED").length})
          </button>
        </div>
      </div>

      {/* List */}
      <ul className="divide-y divide-slate-100 max-h-[460px] overflow-y-auto">
        {projectList.map((project) => {
          const projectLiabilities = supports.filter(
            (s) => s.toProjectId === project.id && s.status === "OUTSTANDING"
          );
          const hasUnsettledDebt = projectLiabilities.length > 0;
          const debtAmount = projectLiabilities.reduce(
            (sum, s) => sum + s.amount,
            0
          );

          const sisaPiutang =
            project.status === "ONGOING" ? project.totalValue * 0.4 : 0;

          return (
            <li
              key={project.id}
              className="p-5 hover:bg-slate-50 transition-colors"
            >
              <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-slate-800 text-sm">
                      {project.name}
                    </h4>
                    <span
                      className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider",
                        project.status === "ONGOING"
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      )}
                    >
                      {project.status === "ONGOING"
                        ? "DP (60%) Diterima"
                        : "Selesai (100% Lunas)"}
                    </span>
                    {hasUnsettledDebt && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                        <AlertTriangle size={11} />
                        Ada Talangan: {formatRupiah(debtAmount)}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2.5 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">
                        Nilai Kontrak
                      </span>
                      <span className="font-bold text-slate-800 font-mono">
                        {formatRupiah(project.totalValue)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">
                        DP Diterima (60%)
                      </span>
                      <span className="font-bold text-emerald-600 font-mono">
                        {formatRupiah(project.totalValue * 0.6)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">
                        Sisa Piutang (40%)
                      </span>
                      <span
                        className={cn(
                          "font-bold font-mono",
                          sisaPiutang > 0 ? "text-blue-600" : "text-slate-400"
                        )}
                      >
                        {formatRupiah(sisaPiutang)}
                      </span>
                    </div>
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
                        • Pelunasan: {formatDate(project.completedAt, "dd MMM yyyy")}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  {project.status === "ONGOING" && (
                    <button
                      onClick={() => {
                        setSelectedForPelunasan(project);
                        setAutoSettleLiabilities(true);
                      }}
                      className="bg-navy-600 hover:bg-navy-700 text-white text-xs font-bold uppercase tracking-wider px-3.5 py-2 rounded-xl transition-colors shadow-sm"
                    >
                      Pelunasan 40%
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (
                        window.confirm(
                          `Yakin ingin menghapus proyek "${project.name}"? Semua transaksi dan catatan talangan terkait juga akan dihapus.`
                        )
                      ) {
                        deleteProject(project.id);
                      }
                    }}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                    title="Hapus Proyek"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </li>
          );
        })}
        {projectList.length === 0 && (
          <li className="p-8 text-center text-slate-400 text-sm font-medium">
            Tidak ada proyek pada kategori ini.
          </li>
        )}
      </ul>

      {/* Pelunasan 40% Milestone Confirmation Modal */}
      {selectedForPelunasan && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h4 className="font-bold text-slate-800 text-base">
                  Pelunasan 40% (Milestone Selesai)
                </h4>
                <p className="text-xs text-slate-500 font-medium">
                  {selectedForPelunasan.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedForPelunasan(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Financial Calculation Box */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Total Nilai Kontrak:</span>
                  <span className="font-bold text-slate-800 font-mono">
                    {formatRupiah(selectedForPelunasan.totalValue)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">DP 60% Sudah Diterima:</span>
                  <span className="font-bold text-emerald-600 font-mono">
                    {formatRupiah(selectedForPelunasan.totalValue * 0.6)}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between text-sm">
                  <span className="font-bold text-slate-800">
                    Pelunasan 40% Diterima:
                  </span>
                  <span className="font-bold text-navy-700 font-mono">
                    {formatRupiah(selectedForPelunasan.totalValue * 0.4)}
                  </span>
                </div>
              </div>

              {/* Firewall Allocation Preview */}
              <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-100 text-xs space-y-2">
                <p className="font-bold text-blue-900 uppercase tracking-wider text-[10px]">
                  Alokasi Firewall Pelunasan:
                </p>
                <div className="flex justify-between text-blue-800">
                  <span>• Rek 3 - Biaya Tetap Expense (20%):</span>
                  <span className="font-bold font-mono">
                    {formatRupiah(selectedForPelunasan.totalValue * 0.2)}
                  </span>
                </div>
                <div className="flex justify-between text-blue-800">
                  <span>• Rek 4 - Cadangan Margin Profit (20%):</span>
                  <span className="font-bold font-mono">
                    {formatRupiah(selectedForPelunasan.totalValue * 0.2)}
                  </span>
                </div>
              </div>

              {/* Detection of Inter-Project Support Liabilities */}
              {totalOutstandingForProject > 0 ? (
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                  <div className="flex items-start gap-2.5">
                    <ShieldAlert size={18} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h5 className="font-bold text-amber-900 text-xs">
                        Terdeteksi Kewajiban Talangan Antar Proyek!
                      </h5>
                      <p className="text-[11px] text-amber-800 mt-1 leading-relaxed">
                        Proyek ini tercatat memiliki kewajiban talangan belum dikembalikan sebesar{" "}
                        <span className="font-bold font-mono">
                          {formatRupiah(totalOutstandingForProject)}
                        </span>
                        .
                      </p>

                      <div className="mt-2.5 space-y-1">
                        {outstandingLiabilities.map((s) => (
                          <div
                            key={s.id}
                            className="text-[10px] text-amber-900 flex justify-between bg-amber-100/70 p-1.5 rounded"
                          >
                            <span>Dari: {s.fromProjectName}</span>
                            <span className="font-bold font-mono">
                              {formatRupiah(s.amount)}
                            </span>
                          </div>
                        ))}
                      </div>

                      <label className="flex items-center gap-2 mt-3 cursor-pointer pt-2 border-t border-amber-200">
                        <input
                          type="checkbox"
                          checked={autoSettleLiabilities}
                          onChange={(e) =>
                            setAutoSettleLiabilities(e.target.checked)
                          }
                          className="rounded text-amber-600 focus:ring-amber-500"
                        />
                        <span className="text-xs font-bold text-amber-900">
                          Kembalikan talangan ini otomatis (Status &apos;RETURNED&apos;)
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center gap-2 text-xs text-emerald-800">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  <span>
                    Tidak ada tunggakan talangan antar proyek untuk proyek ini.
                  </span>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setSelectedForPelunasan(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmPelunasan}
                className="px-5 py-2 bg-navy-600 hover:bg-navy-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors shadow-sm"
              >
                Konfirmasi Pelunasan 40%
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function TransactionHistory() {
  const { filteredTransactions, deleteTransaction, updateTransaction } =
    useFinance();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState("");
  const [editAmount, setEditAmount] = useState(0);
  const [editCategory, setEditCategory] = useState("");
  const [editAccount, setEditAccount] = useState("");

  const handleEdit = (t: any) => {
    setEditingId(t.id);
    setEditDesc(t.description);
    setEditAmount(t.amount);
    setEditCategory(t.expenseCategory || "");
    setEditAccount(t.expenseAccount || "");
  };

  const handleSave = (id: string, type: string) => {
    const dataToUpdate: any = { description: editDesc, amount: editAmount };
    if (type === "EXPENSE") {
      dataToUpdate.expenseCategory = editCategory;
      dataToUpdate.expenseAccount = editAccount;
    }
    updateTransaction(id, dataToUpdate);
    setEditingId(null);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-100">
        <h4 className="font-bold text-slate-700">Riwayat Kas Real-time</h4>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          Semua catatan mutasi pemasukan, pengeluaran, penyesuaian, dan perputaran talangan.
        </p>
      </div>
      <div className="overflow-x-auto max-h-[440px] overflow-y-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
            <tr className="border-b border-slate-100">
              <th className="px-6 py-3">Waktu</th>
              <th className="px-6 py-3">Deskripsi Transaksi</th>
              <th className="px-6 py-3">Kategori & Rekening</th>
              <th className="px-6 py-3 text-right">Nominal</th>
              <th className="px-6 py-3 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="text-xs">
            {filteredTransactions.slice(0, 30).map((t) => (
              <tr
                key={t.id}
                className="border-b border-slate-50 hover:bg-slate-50 transition-colors"
              >
                <td className="px-6 py-3 font-mono text-slate-400 whitespace-nowrap">
                  {formatDate(t.date, "dd/MM/yy HH:mm")}
                </td>
                <td className="px-6 py-3 font-semibold text-slate-700">
                  {editingId === t.id ? (
                    <input
                      type="text"
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      className="w-full px-2 py-1 border border-slate-200 rounded text-xs"
                    />
                  ) : (
                    <div>
                      <span>{t.description}</span>
                      {t.supportId && (
                        <span className="ml-2 text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                          Talangan
                        </span>
                      )}
                    </div>
                  )}
                </td>
                <td className="px-6 py-3">
                  {t.type === "INCOME" ? (
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded font-bold text-[10px] uppercase tracking-wider">
                        Income
                      </span>
                      {t.incomeType && (
                        <span className="text-[10px] text-slate-500 font-medium">
                          {t.incomeType === "DP_60" ? "DP 60%" : "Pelunasan 40%"}
                        </span>
                      )}
                    </div>
                  ) : editingId === t.id ? (
                    <div className="flex flex-col gap-2">
                      <select
                        value={editAccount}
                        onChange={(e) => setEditAccount(e.target.value)}
                        className="w-full px-2 py-1 border border-slate-200 rounded text-[10px] uppercase font-bold"
                      >
                        <option value="REK1">REK1</option>
                        <option value="REK2">REK2</option>
                        <option value="REK3">REK3</option>
                        <option value="REK4">REK4</option>
                      </select>
                      <input
                        type="text"
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        className="w-full px-2 py-1 border border-slate-200 rounded text-xs"
                        placeholder="Kategori"
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded font-bold text-[10px] uppercase tracking-wider w-fit">
                        {t.expenseAccount}
                      </span>
                      {t.expenseCategory && (
                        <span
                          className="text-[10px] font-semibold text-slate-500 line-clamp-1"
                          title={t.expenseCategory}
                        >
                          {t.expenseCategory}
                        </span>
                      )}
                    </div>
                  )}
                </td>
                <td
                  className={cn(
                    "px-6 py-3 text-right font-bold font-mono whitespace-nowrap",
                    t.type === "INCOME" ? "text-emerald-600" : "text-rose-500"
                  )}
                >
                  {editingId === t.id ? (
                    <input
                      type="number"
                      value={editAmount}
                      onChange={(e) => setEditAmount(Number(e.target.value))}
                      className="w-24 px-2 py-1 border border-slate-200 rounded text-xs text-right"
                    />
                  ) : (
                    <>
                      {t.type === "INCOME" ? "+" : "-"}
                      {formatRupiah(t.amount)}
                    </>
                  )}
                </td>
                <td className="px-6 py-3 text-center whitespace-nowrap">
                  <div className="flex items-center justify-center gap-2">
                    {editingId === t.id ? (
                      <>
                        <button
                          onClick={() => handleSave(t.id, t.type)}
                          className="text-emerald-600 hover:text-emerald-800 p-1 bg-emerald-50 rounded"
                          title="Simpan"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-slate-500 hover:text-slate-700 p-1 bg-slate-100 rounded"
                          title="Batal"
                        >
                          <X size={14} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleEdit(t)}
                          className="text-navy-600 hover:text-navy-800 p-1 hover:bg-navy-50 rounded transition-colors"
                          title="Edit Transaksi"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm("Hapus transaksi ini?")) {
                              deleteTransaction(t.id);
                            }
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
            ))}
            {filteredTransactions.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-8 text-center font-medium text-slate-400"
                >
                  Belum ada transaksi pada periode ini.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
