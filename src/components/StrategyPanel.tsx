import React, { useState } from "react";
import { useFinance } from "../store/FinanceContext";
import { cn, formatDate, formatRupiah, fromDateInput, toDateInput } from "../utils";
import { DebtAnalysis } from "../finance";
import { AlertTriangle, CheckCircle2, LifeBuoy, ShieldCheck, Pencil, X, Check } from "lucide-react";

const Money = ({ v, cls }: { v: number; cls?: string }) => (
  <span className={cn("font-mono font-bold", cls)}>{formatRupiah(v)}</span>
);

function Stat({ label, value, hint, tone }: { label: string; value: number; hint: string; tone: string }) {
  return (
    <div className={cn("p-4 rounded-xl border", tone)}>
      <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">{label}</p>
      <p className="text-lg font-bold font-mono mt-1">{formatRupiah(value)}</p>
      <p className="text-[10px] mt-1 opacity-70">{hint}</p>
    </div>
  );
}

function Row({ label, v, cls }: { label: string; v: number; cls?: string }) {
  return (
    <div className="flex justify-between gap-3 py-0.5">
      <span className="text-slate-500">{label}</span>
      <Money v={v} cls={cls} />
    </div>
  );
}

type DebtCardProps = {
  a: DebtAnalysis;
  rek4: number;
  onSupport: (id: string) => void;
  onPayment: (id: string) => void;
};

const DebtCard: React.FC<DebtCardProps> = ({ a, rek4, onSupport, onPayment }) => {
  const { fundFromRecovery, updateProject, setDebtStatus } = useFinance();
  const [editing, setEditing] = useState(false);
  const [mat, setMat] = useState(String(a.estMaterial));
  const [lab, setLab] = useState(String(a.estLabour));
  const [due, setDue] = useState(a.project.expectedSettlementAt ? toDateInput(a.project.expectedSettlementAt) : "");
  const recoveryAmount = Math.min(a.hole, Math.max(0, rek4));
  const safe = a.hole === 0;

  return (
    <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
      <div className={cn("px-5 py-3 flex flex-wrap items-center justify-between gap-2", safe ? "bg-emerald-50" : "bg-rose-50")}>
        <div>
          <h5 className="font-bold text-slate-800 text-sm">{a.project.name}</h5>
          <p className="text-[11px] text-slate-500">
            Kontrak {formatRupiah(a.contract)}
            {a.project.expectedSettlementAt && ` • Perkiraan pelunasan ${formatDate(a.project.expectedSettlementAt, "dd MMM yyyy")}`}
          </p>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full",
            safe ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800",
          )}
        >
          {safe ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
          {safe ? "Pelunasan cukup menutup" : `Lubang ${formatRupiah(a.hole)}`}
        </span>
      </div>

      <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
        <div>
          <p className="font-bold text-slate-700 mb-1.5">Posisi proyek</p>
          <Row label="Sudah diterima (DP)" v={a.received} />
          <Row label="Sisa tagihan" v={a.outstanding} cls="text-blue-600" />
          <Row label="Bahan masih dibutuhkan" v={a.remMaterial} />
          <Row label="Labour masih dibutuhkan" v={a.remLabour} />
          <Row label="Talangan diterima (belum kembali)" v={a.talanganIn} cls="text-amber-700" />
          <Row label="Dana HPP proyek tersedia" v={a.fund} />
        </div>

        <div>
          <p className="font-bold text-slate-700 mb-1.5">Saat pelunasan masuk</p>
          <Row label="1. Bayar labour" v={a.remLabour} />
          <Row label="2. Kembalikan talangan" v={a.talanganIn} />
          <Row label="3. Sisa bahan belum terdanai" v={Math.max(0, a.need - a.remLabour - a.talanganIn)} />
          <div className="border-t border-slate-200 mt-1 pt-1">
            <Row label="Masuk Rek 2 (waterfall)" v={a.settlementToRek2} />
            <Row label="Sisa untuk Rek 3 & Rek 4" v={a.settlementToRek34} cls="text-emerald-700" />
            {a.hole > 0 && <Row label="Kekurangan (lubang)" v={a.hole} cls="text-rose-600" />}
          </div>
        </div>

        <div>
          <p className="font-bold text-slate-700 mb-1.5">Rekomendasi pendanaan bahan</p>
          {a.materialGap === 0 && a.hole === 0 ? (
            <p className="text-emerald-700">Bahan sudah terdanai dan pelunasan cukup. Tidak perlu tindakan.</p>
          ) : (
            <ol className="space-y-1.5 list-decimal pl-4 text-slate-600">
              {a.hole > 0 && (
                <li>
                  Tutup lubang <Money v={a.hole} cls="text-rose-600" /> dari <b>Dana Pemulihan (Rek 4)</b> — hibah, tidak
                  perlu dikembalikan.
                </li>
              )}
              {a.safeTalangan > 0 && (
                <li>
                  Talangan aman maksimal <Money v={a.safeTalangan} cls="text-emerald-700" /> dari proyek lain — pasti
                  kembali saat pelunasan.
                </li>
              )}
              {a.hole > 0 && <li>Tahan prive & pengambilan profit sampai lubang nol.</li>}
            </ol>
          )}
        </div>
      </div>

      {editing && (
        <div className="px-5 pb-4 grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs items-end">
          <label>
            <span className="block font-bold text-slate-600 mb-1">Estimasi bahan</span>
            <input type="number" value={mat} onChange={(e) => setMat(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono" />
          </label>
          <label>
            <span className="block font-bold text-slate-600 mb-1">Estimasi labour</span>
            <input type="number" value={lab} onChange={(e) => setLab(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono" />
          </label>
          <label>
            <span className="block font-bold text-slate-600 mb-1">Perkiraan pelunasan</span>
            <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => {
                updateProject(a.project.id, {
                  estMaterial: Number(mat) || 0,
                  estLabour: Number(lab) || 0,
                  expectedSettlementAt: due ? fromDateInput(due) : undefined,
                });
                setEditing(false);
              }}
              className="flex items-center gap-1 px-3 py-2 bg-emerald-600 text-white rounded-lg font-bold"
            >
              <Check size={14} /> Simpan
            </button>
            <button onClick={() => setEditing(false)} className="px-3 py-2 border border-slate-200 rounded-lg">
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex flex-wrap gap-2">
        {recoveryAmount > 0 && (
          <button
            onClick={() => {
              if (
                window.confirm(
                  `Pindahkan ${formatRupiah(recoveryAmount)} dari Rek 4 ke Rek 2 sebagai Dana Pemulihan untuk ${a.project.name}?`,
                )
              )
                fundFromRecovery(a.project.id, recoveryAmount);
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold"
          >
            <LifeBuoy size={14} /> Tutup lubang dari Rek 4 ({formatRupiah(recoveryAmount)})
          </button>
        )}
        {a.hole > 0 && rek4 <= 0 && (
          <span className="text-[11px] text-rose-700 font-semibold self-center">
            Rek 4 kosong — lubang ditutup bertahap dari profit proyek berikutnya.
          </span>
        )}
        {a.safeTalangan > 0 && (
          <button
            onClick={() => onSupport(a.project.id)}
            className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold"
          >
            Catat talangan aman
          </button>
        )}
        {a.outstanding > 0 && (
          <button
            onClick={() => onPayment(a.project.id)}
            className="px-3 py-2 bg-navy-600 hover:bg-navy-700 text-white rounded-xl text-xs font-bold"
          >
            Terima pelunasan
          </button>
        )}
        <button onClick={() => setEditing((v) => !v)} className="flex items-center gap-1 px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600">
          <Pencil size={13} /> Estimasi
        </button>
        <button
          onClick={() => {
            if (window.confirm(`Lepas status Utang Project untuk ${a.project.name}?`)) setDebtStatus(a.project.id, false);
          }}
          className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-500"
        >
          Lepas status utang
        </button>
      </div>
    </div>
  );
};

export function StrategyPanel({
  onSupport,
  onPayment,
}: {
  onSupport: (projectId: string) => void;
  onPayment: (projectId: string) => void;
}) {
  const { debt, balances, activeProjects, setDebtStatus } = useFinance();
  const [markId, setMarkId] = useState("");
  const [markFund, setMarkFund] = useState("");
  const candidates = activeProjects.filter((p) => !p.isDebtProject && p.status === "ONGOING");

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
      <div className="p-6 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <span className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
            <ShieldCheck size={20} />
          </span>
          <div>
            <h4 className="font-bold text-slate-800 text-lg">Strategi Utang Project</h4>
            <p className="text-xs text-slate-500 font-medium">
              Menutup utang project tanpa gali lubang tutup lubang: ukur lubangnya, talangi hanya yang pasti kembali,
              tutup sisanya dari profit.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mt-5">
          <Stat label="Sisa tagihan utang project" value={debt.totalOutstanding} hint="Pelunasan yang akan masuk" tone="bg-blue-50 border-blue-100 text-blue-900" />
          <Stat label="Talangan berjalan" value={debt.totalTalanganIn} hint="Wajib kembali saat pelunasan" tone="bg-amber-50 border-amber-100 text-amber-900" />
          <Stat label="Bahan belum terdanai" value={debt.totalMaterialGap} hint="Perlu dana sekarang" tone="bg-slate-50 border-slate-200 text-slate-800" />
          <Stat label="Lubang sebenarnya" value={debt.totalHole} hint="Tidak tertutup pelunasan" tone="bg-rose-50 border-rose-100 text-rose-900" />
          <Stat label="Dana Pemulihan (Rek 4)" value={balances.rek4} hint="Sumber penutup lubang" tone="bg-emerald-50 border-emerald-100 text-emerald-900" />
        </div>

        <details className="mt-4 text-xs text-slate-600">
          <summary className="cursor-pointer font-bold text-slate-700">Aturan strategi pemulihan (klik untuk lihat)</summary>
          <ol className="list-decimal pl-5 mt-2 space-y-1 leading-relaxed">
            <li><b>Ukur lubang sebenarnya</b>: kebutuhan bahan + labour + talangan − dana tersedia, dibandingkan sisa tagihan.</li>
            <li><b>Talangan antarproyek hanya sebesar batas aman</b> — bagian yang pasti kembali dari pelunasan penerima.</li>
            <li><b>Lubang ditutup dari Dana Pemulihan (Rek 4 profit)</b>, bukan dari uang bahan klien lain.</li>
            <li><b>Pelunasan utang project memakai waterfall</b>: labour → kembalikan talangan → sisa bahan → baru Rek 3 & Rek 4.</li>
            <li><b>Tahan prive & pengambilan profit</b> sampai lubang nol (aplikasi memberi peringatan).</li>
            <li><b>Cicilan lubang masuk ke target omset bulanan</b> agar marketing tahu target sebenarnya.</li>
          </ol>
        </details>
      </div>

      <div className="p-6 space-y-4 bg-slate-50/50">
        {debt.projects.length === 0 && (
          <p className="text-sm text-slate-500 text-center py-4">
            Belum ada Utang Project. Tandai proyek lama di bawah, atau centang "Utang Project" saat input proyek baru.
          </p>
        )}
        {debt.projects.map((a) => (
          <DebtCard key={a.project.id} a={a} rek4={balances.rek4} onSupport={onSupport} onPayment={onPayment} />
        ))}

        {candidates.length > 0 && (
          <div className="border border-dashed border-slate-300 rounded-2xl p-4 text-xs">
            <p className="font-bold text-slate-700 mb-2">Tandai proyek yang sudah ada sebagai Utang Project</p>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_200px_auto] gap-2 items-end">
              <select value={markId} onChange={(e) => setMarkId(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg bg-white">
                <option value="">-- Pilih proyek --</option>
                {candidates.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <label>
                <span className="block font-semibold text-slate-500 mb-1">Dana proyek masih ada (Rp)</span>
                <input type="number" value={markFund} onChange={(e) => setMarkFund(e.target.value)} placeholder="0" className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono" />
              </label>
              <button
                disabled={!markId}
                onClick={() => {
                  setDebtStatus(markId, true, Number(markFund) || 0);
                  setMarkId("");
                  setMarkFund("");
                }}
                className="px-4 py-2 bg-slate-800 disabled:bg-slate-300 text-white rounded-lg font-bold"
              >
                Tandai
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
