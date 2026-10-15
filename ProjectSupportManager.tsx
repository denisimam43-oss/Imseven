import React, { useState } from "react";
import { useFinance } from "../store/FinanceContext";
import { formatRupiah, formatDate, cn } from "../utils";
import {
  ArrowLeftRight,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Clock,
  RotateCcw,
  PlusCircle,
} from "lucide-react";

export function ProjectSupportManager({
  onOpenAddModal,
}: {
  onOpenAddModal: () => void;
}) {
  const { supports, settleSupport, deleteSupport, balances } = useFinance();
  const [filter, setFilter] = useState<"ALL" | "OUTSTANDING" | "RETURNED">("ALL");

  const filteredSupports = supports.filter((s) => {
    if (filter === "OUTSTANDING") return s.status === "OUTSTANDING";
    if (filter === "RETURNED") return s.status === "RETURNED";
    return true;
  });

  const totalOutstanding = supports
    .filter((s) => s.status === "OUTSTANDING")
    .reduce((sum, s) => sum + s.amount, 0);

  const totalReturned = supports
    .filter((s) => s.status === "RETURNED")
    .reduce((sum, s) => sum + s.amount, 0);

  const totalAll = supports.reduce((sum, s) => sum + s.amount, 0);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
      {/* Header */}
      <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <ArrowLeftRight size={20} />
            </span>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">
                Talangan & Subsidi Silang Antar Proyek
              </h3>
              <p className="text-xs font-medium text-slate-500 mt-0.5">
                Monitoring pergerakan dana talangan modal kerja antar proyek & kewajiban pengembalian.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
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
              Semua ({supports.length})
            </button>
            <button
              onClick={() => setFilter("OUTSTANDING")}
              className={cn(
                "px-3 py-1.5 rounded-lg transition-all",
                filter === "OUTSTANDING"
                  ? "bg-white text-amber-600 shadow-sm font-bold"
                  : "hover:text-slate-900"
              )}
            >
              Outstanding ({supports.filter((s) => s.status === "OUTSTANDING").length})
            </button>
            <button
              onClick={() => setFilter("RETURNED")}
              className={cn(
                "px-3 py-1.5 rounded-lg transition-all",
                filter === "RETURNED"
                  ? "bg-white text-green-600 shadow-sm font-bold"
                  : "hover:text-slate-900"
              )}
            >
              Dikembalikan ({supports.filter((s) => s.status === "RETURNED").length})
            </button>
          </div>

          <button
            onClick={onOpenAddModal}
            className="flex items-center px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-colors shadow-sm"
          >
            <PlusCircle size={15} className="mr-1.5" />
            Catat Talangan
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100 bg-slate-50 border-b border-slate-100">
        <div className="p-5">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            Total Dana Ditalangkan
          </p>
          <p className="text-xl font-bold text-slate-800">
            {formatRupiah(totalAll)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Kumulatif transaksi subsidi silang
          </p>
        </div>

        <div className="p-5 bg-amber-50/50">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">
              Outstanding (Belum Kembali)
            </p>
            {totalOutstanding > 0 && (
              <span className="flex items-center text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                <AlertTriangle size={12} className="mr-1" /> Wajib Dilunasi
              </span>
            )}
          </div>
          <p className="text-xl font-bold text-amber-600">
            {formatRupiah(totalOutstanding)}
          </p>
          <p className="text-[11px] text-amber-700/80 mt-1">
            Liabilitas aktif yang harus dikembalikan saat pelunasan
          </p>
        </div>

        <div className="p-5">
          <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider mb-1">
            Sudah Dikembalikan (Returned)
          </p>
          <p className="text-xl font-bold text-green-600">
            {formatRupiah(totalReturned)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Dana talangan yang telah sukses dipulangkan ke pos asal
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
            <tr className="border-b border-slate-100">
              <th className="px-6 py-3.5">Tanggal</th>
              <th className="px-6 py-3.5">Pemberi Talangan (Sumber)</th>
              <th className="px-6 py-3.5">Penerima Talangan (Tujuan)</th>
              <th className="px-6 py-3.5">Keperluan & Catatan</th>
              <th className="px-6 py-3.5 text-right">Nominal</th>
              <th className="px-6 py-3.5 text-center">Status</th>
              <th className="px-6 py-3.5 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="text-xs divide-y divide-slate-100">
            {filteredSupports.map((item) => (
              <tr
                key={item.id}
                className={cn(
                  "hover:bg-slate-50 transition-colors",
                  item.status === "OUTSTANDING" ? "bg-amber-50/20" : "bg-white"
                )}
              >
                <td className="px-6 py-4 font-mono text-slate-500 whitespace-nowrap">
                  {formatDate(item.date, "dd MMM yyyy, HH:mm")}
                </td>
                <td className="px-6 py-4">
                  <span className="font-semibold text-slate-800 block">
                    {item.fromProjectName}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    Rekening {item.account || "REK2"}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="font-semibold text-slate-800 block">
                    {item.toProjectName}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    Masuk Modal Kerja
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-600 max-w-xs">
                  <p className="line-clamp-2">{item.description}</p>
                  {item.returnedAt && (
                    <p className="text-[10px] text-green-600 font-medium mt-0.5">
                      ✓ Dikembalikan: {formatDate(item.returnedAt, "dd MMM yyyy")}
                    </p>
                  )}
                </td>
                <td className="px-6 py-4 text-right font-bold text-slate-900 font-mono text-sm whitespace-nowrap">
                  {formatRupiah(item.amount)}
                </td>
                <td className="px-6 py-4 text-center whitespace-nowrap">
                  {item.status === "OUTSTANDING" ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                      <Clock size={11} /> Belum Kembali
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-100 text-green-800 border border-green-200">
                      <CheckCircle2 size={11} /> RETURNED
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-center whitespace-nowrap">
                  <div className="flex items-center justify-center gap-1.5">
                    {item.status === "OUTSTANDING" && (
                      <button
                        onClick={() => {
                          if (
                            window.confirm(
                              `Kembalikan talangan sebesar ${formatRupiah(
                                item.amount
                              )} dari ${item.toProjectName} ke ${
                                item.fromProjectName
                              }?`
                            )
                          ) {
                            settleSupport(item.id);
                          }
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors shadow-sm"
                        title="Tandai Sudah Dikembalikan (RETURNED)"
                      >
                        <RotateCcw size={12} />
                        Kembalikan
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (
                          window.confirm(
                            `Hapus riwayat talangan ini? Transaksi kas terkait juga akan dihapus.`
                          )
                        ) {
                          deleteSupport(item.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Hapus Talangan"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {filteredSupports.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-6 py-12 text-center text-slate-400 font-medium"
                >
                  <ArrowLeftRight size={32} className="mx-auto mb-2 opacity-30" />
                  Belum ada catatan talangan atau subsidi silang antar proyek.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
