import React, { useMemo, useState } from "react";
import { History } from "lucide-react";
import { useFinance } from "../store/FinanceContext";
import { AUDIT_LABEL } from "../audit";
import { AuditAction } from "../types";
import { cn, formatDate } from "../utils";

const ALL = "ALL" as const;

/** Nilai ditampilkan ringkas: tanggal (timestamp) jadi tanggal, angka diberi pemisah ribuan. */
function show(key: string, v: unknown): string {
  if (v === undefined || v === null || v === "") return "-";
  if (typeof v === "number") {
    // Tanggal disimpan sebagai timestamp (milidetik); angka lain diberi pemisah ribuan.
    if (/date|tanggal|at$/i.test(key) && v > 1_000_000_000_000) return formatDate(v, "dd MMM yyyy");
    return new Intl.NumberFormat("id-ID").format(v);
  }
  if (typeof v === "object") {
    return Object.entries(v as Record<string, unknown>)
      .map(([k, x]) => `${k}: ${show(k, x)}`)
      .join(" · ");
  }
  return String(v);
}

export function AuditLogPanel() {
  const { audit } = useFinance();
  const [filter, setFilter] = useState<AuditAction | typeof ALL>(ALL);
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(50);
  const [openId, setOpenId] = useState<string | null>(null);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return audit.filter(
      (e) =>
        (filter === ALL || e.action === filter) &&
        (!q || e.summary.toLowerCase().includes(q) || e.actor.toLowerCase().includes(q)),
    );
  }, [audit, filter, query]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
      <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h4 className="font-bold text-slate-700 flex items-center gap-2">
            <History size={16} /> Jejak Perubahan
          </h4>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Siapa mengubah apa dan kapan. Tambah, ubah, hapus transaksi, tutup buku, dan pemulihan backup tercatat di sini.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as AuditAction | typeof ALL)}
            className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white"
          >
            <option value={ALL}>Semua jenis</option>
            {(Object.keys(AUDIT_LABEL) as AuditAction[]).map((a) => (
              <option key={a} value={a}>
                {AUDIT_LABEL[a]}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari keterangan atau pengguna"
            className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs w-52"
          />
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="p-6 text-xs text-slate-500">
          {audit.length === 0
            ? "Belum ada catatan. Perubahan yang dilakukan mulai sekarang akan muncul di sini."
            : "Tidak ada catatan yang cocok dengan pencarian."}
        </p>
      ) : (
        <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              <tr className="border-b border-slate-100">
                <th className="px-6 py-3">Waktu</th>
                <th className="px-6 py-3">Pengguna</th>
                <th className="px-6 py-3">Jenis</th>
                <th className="px-6 py-3">Keterangan</th>
                <th className="px-6 py-3 text-center">Rincian</th>
              </tr>
            </thead>
            <tbody className="text-xs">
              {rows.slice(0, limit).map((e) => {
                const keys = Array.from(new Set([...Object.keys(e.before ?? {}), ...Object.keys(e.after ?? {})]));
                const expanded = openId === e.id;
                return (
                  <React.Fragment key={e.id}>
                    <tr className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3 whitespace-nowrap text-slate-600">{formatDate(e.at)}</td>
                      <td className="px-6 py-3 font-semibold text-slate-700">{e.actor}</td>
                      <td className="px-6 py-3">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[10px] whitespace-nowrap">
                          {AUDIT_LABEL[e.action]}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-slate-700">{e.summary}</td>
                      <td className="px-6 py-3 text-center">
                        {keys.length > 0 && (
                          <button
                            onClick={() => setOpenId(expanded ? null : e.id)}
                            className="text-[10px] font-bold text-navy-600 hover:underline"
                          >
                            {expanded ? "Tutup" : "Lihat"}
                          </button>
                        )}
                      </td>
                    </tr>
                    {expanded && (
                      <tr className="bg-slate-50/60 border-b border-slate-100">
                        <td colSpan={5} className="px-6 py-3">
                          <table className="text-[11px]">
                            <thead>
                              <tr className="text-slate-500 text-left">
                                <th className="pr-6 py-1 font-semibold">Bagian</th>
                                <th className="pr-6 py-1 font-semibold">Sebelum</th>
                                <th className="py-1 font-semibold">Sesudah</th>
                              </tr>
                            </thead>
                            <tbody>
                              {keys.map((k) => (
                                <tr key={k}>
                                  <td className="pr-6 py-0.5 text-slate-600">{k}</td>
                                  <td className={cn("pr-6 py-0.5", e.before && k in e.before ? "text-rose-700" : "text-slate-400")}>
                                    {show(k, e.before?.[k])}
                                  </td>
                                  <td className={cn("py-0.5", e.after && k in e.after ? "text-emerald-700" : "text-slate-400")}>
                                    {show(k, e.after?.[k])}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {rows.length > limit && (
        <div className="p-4 text-center border-t border-slate-100">
          <button onClick={() => setLimit((l) => l + 50)} className="text-xs font-bold text-navy-600 hover:underline">
            Tampilkan lebih banyak ({rows.length - limit} lagi)
          </button>
        </div>
      )}
    </div>
  );
}
