import { useMemo } from "react";
import { ShieldAlert } from "lucide-react";
import { useFinance } from "../store/FinanceContext";
import { LEVEL_LABEL, CauseKey, ContingencyLevel, summarizeContingency } from "../contingency";
import { LOSS_CAUSE_LABEL } from "../types";
import { cn, formatRupiah } from "../utils";

const LEVEL_CLS: Record<ContingencyLevel, string> = {
  OK: "bg-emerald-50 text-emerald-700",
  WASPADA: "bg-amber-50 text-amber-700",
  HABIS: "bg-orange-50 text-orange-700",
  LEWAT_PLAFON: "bg-rose-50 text-rose-700",
};

const CAUSE_LABEL: Record<CauseKey, string> = { ...LOSS_CAUSE_LABEL, TANPA_SEBAB: "Tanpa sebab (catatan lama)" };

/** Jatah kontingensi per proyek + ringkasan sebab pada periode berjalan. */
export function ContingencyPanel() {
  const { projects, transactions, settings, currentPeriod } = useFinance();
  const start = currentPeriod.start.getTime();
  const end = currentPeriod.end.getTime() + 86_400_000 - 1;

  const sum = useMemo(
    () => summarizeContingency(projects, transactions, settings, (ts) => ts >= start && ts <= end),
    [projects, transactions, settings, start, end],
  );
  const causes = (Object.keys(CAUSE_LABEL) as CauseKey[]).filter((k) => sum.inPeriod.byCause[k] > 0);
  const flagged = sum.projects.filter((c) => c.level !== "OK");

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-100">
        <h4 className="font-bold text-slate-700 flex items-center gap-2">
          <ShieldAlert size={16} /> Dana Tak Terduga per Proyek
        </h4>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          Jatah {settings.shares.kontingensi}% nilai kontrak per proyek (satu kantong bersama di Rek 3). Plafon{" "}
          {settings.contingencyCapPct}%: di atasnya perlu persetujuan owner dan dihitung kerugian proyek.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 text-xs">
        <div>
          <p className="text-slate-500">Total jatah proyek berjalan</p>
          <p className="font-bold text-slate-800 text-sm">{formatRupiah(sum.totalAllowance)}</p>
        </div>
        <div>
          <p className="text-slate-500">Terpakai (semua waktu)</p>
          <p className="font-bold text-slate-800 text-sm">{formatRupiah(sum.totalUsed)}</p>
        </div>
        <div>
          <p className="text-slate-500">Terpakai periode ini</p>
          <p className="font-bold text-slate-800 text-sm">{formatRupiah(sum.inPeriod.total)}</p>
        </div>
        <div>
          <p className="text-slate-500">Proyek perlu perhatian</p>
          <p className="font-bold text-slate-800 text-sm">{flagged.length}</p>
        </div>
      </div>

      {causes.length > 0 && (
        <div className="px-6 pb-4 text-xs">
          <p className="font-semibold text-slate-600 mb-1">Sebab pada periode ini</p>
          <ul className="space-y-0.5">
            {causes.map((k) => (
              <li key={k} className="flex justify-between max-w-md">
                <span className="text-slate-600">{CAUSE_LABEL[k]}</span>
                <span className="font-semibold text-slate-800">{formatRupiah(sum.inPeriod.byCause[k])}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {sum.unlinkedInPeriod > 0 && (
        <p className="px-6 pb-4 text-xs text-amber-700 font-semibold">
          {formatRupiah(sum.unlinkedInPeriod)} biaya kontingensi periode ini belum ditautkan ke proyek.
        </p>
      )}

      {sum.projects.length === 0 ? (
        <p className="px-6 pb-6 text-xs text-slate-500">Belum ada proyek dengan nilai kontrak.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
              <tr className="border-y border-slate-100">
                <th className="px-6 py-3">Proyek</th>
                <th className="px-6 py-3 text-right">Jatah</th>
                <th className="px-6 py-3 text-right">Terpakai</th>
                <th className="px-6 py-3 text-right">Sisa</th>
                <th className="px-6 py-3 text-right">Plafon</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="text-xs">
              {sum.projects.map((c) => (
                <tr key={c.project.id} className="border-b border-slate-50">
                  <td className="px-6 py-3 font-semibold text-slate-700">{c.project.name}</td>
                  <td className="px-6 py-3 text-right">{formatRupiah(c.allowance)}</td>
                  <td className="px-6 py-3 text-right">{formatRupiah(c.used)}</td>
                  <td className="px-6 py-3 text-right">{formatRupiah(c.remaining)}</td>
                  <td className="px-6 py-3 text-right">{formatRupiah(c.cap)}</td>
                  <td className="px-6 py-3">
                    <span className={cn("px-2 py-0.5 rounded-md font-semibold text-[10px] whitespace-nowrap", LEVEL_CLS[c.level])}>
                      {LEVEL_LABEL[c.level]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
