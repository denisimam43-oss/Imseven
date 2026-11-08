import React, { useMemo, useState } from "react";
import { Scale, Landmark, Wrench, Trash2, Plus, AlertTriangle, ShieldCheck } from "lucide-react";
import { useFinance } from "../store/FinanceContext";
import {
  ASSET_CATEGORY_LABEL,
  ASSET_DEFAULT_LIFE_MONTHS,
  AssetCategory,
  LIABILITY_KIND_LABEL,
  LiabilityKind,
} from "../types";
import {
  accumulatedDepreciation,
  bookValue,
  computeCashResilience,
  computeFullBalanceSheet,
  summarizeAssets,
  summarizeLiabilities,
} from "../ledger";
import { cn, formatRupiah, fromDateInput, toDateInput } from "../utils";

function Row({ label, value, bold, hint }: { label: string; value: number; bold?: boolean; hint?: string }) {
  return (
    <div className={cn("flex justify-between items-baseline py-1.5", bold && "border-t border-slate-200 pt-2.5 mt-1")}>
      <span className={cn("text-xs", bold ? "font-bold text-slate-800" : "text-slate-600")}>
        {label}
        {hint && <span className="block text-[10px] text-slate-400 font-normal">{hint}</span>}
      </span>
      <span className={cn("font-mono text-sm", bold ? "font-bold" : "font-semibold", value < 0 ? "text-rose-600" : "text-slate-800")}>
        {formatRupiah(value)}
      </span>
    </div>
  );
}

const inputCls =
  "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-300";

const toNum = (v: string) => {
  const n = Number(String(v).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

export function KewajibanAset() {
  const {
    projects,
    transactions,
    liabilities,
    fixedAssets,
    settings,
    updateSettings,
    addLiability,
    updateLiability,
    payLiability,
    deleteLiability,
    addFixedAsset,
    deleteFixedAsset,
  } = useFinance();

  const now = Date.now();
  const sheet = useMemo(
    () => computeFullBalanceSheet(projects, transactions, liabilities, fixedAssets, now),
    [projects, transactions, liabilities, fixedAssets, now],
  );
  const resilience = useMemo(
    () => computeCashResilience(transactions, settings, liabilities),
    [transactions, settings, liabilities],
  );
  const liabSum = useMemo(() => summarizeLiabilities(liabilities), [liabilities]);
  const assetSum = useMemo(() => summarizeAssets(fixedAssets, now), [fixedAssets, now]);

  // form kewajiban
  const [lName, setLName] = useState("");
  const [lKind, setLKind] = useState<LiabilityKind>("SUPPLIER");
  const [lOut, setLOut] = useState("");
  const [lMonthly, setLMonthly] = useState("");
  const [lInFixed, setLInFixed] = useState(false);

  // form aset
  const [aName, setAName] = useState("");
  const [aCat, setACat] = useState<AssetCategory>("PERALATAN");
  const [aDate, setADate] = useState(toDateInput());
  const [aCost, setACost] = useState("");
  const [aLife, setALife] = useState(String(ASSET_DEFAULT_LIFE_MONTHS.PERALATAN));
  const [aSalvage, setASalvage] = useState("0");
  const [aEst, setAEst] = useState(true);

  const submitLiability = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lName.trim() || toNum(lOut) <= 0) return;
    addLiability({
      name: lName.trim(),
      kind: lKind,
      outstanding: toNum(lOut),
      monthlyPayment: toNum(lMonthly),
      inFixedExpense: lInFixed,
    });
    setLName("");
    setLOut("");
    setLMonthly("");
    setLInFixed(false);
  };

  const submitAsset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aName.trim() || toNum(aCost) <= 0) return;
    addFixedAsset({
      name: aName.trim(),
      category: aCat,
      purchaseDate: fromDateInput(aDate),
      cost: toNum(aCost),
      usefulLifeMonths: toNum(aLife),
      salvageValue: toNum(aSalvage),
      estimated: aEst,
    });
    setAName("");
    setACost("");
    setASalvage("0");
  };

  const statusStyle =
    resilience.status === "AMAN"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : resilience.status === "TIPIS"
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : "bg-rose-50 text-rose-700 border-rose-200";

  return (
    <div className="space-y-6 mb-8">
      {/* NERACA LENGKAP */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5">
        <h3 className="flex items-center gap-2 font-bold text-slate-900 text-sm mb-1">
          <Scale size={16} /> Neraca lengkap (Aset = Kewajiban + Ekuitas)
        </h3>
        {(!sheet.hasLiabilityData || !sheet.hasAssetData) && (
          <p className="flex gap-2 items-start text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 mb-3">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            Data belum lengkap
            {!sheet.hasLiabilityData && " (kewajiban belum diisi)"}
            {!sheet.hasAssetData && " (aset tetap belum diisi)"}. Ekuitas di bawah baru perkiraan sementara.
          </p>
        )}
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <p className="text-[11px] font-bold uppercase text-slate-400 mb-1">Aset</p>
            <Row label="Kas & rekening" value={sheet.cash} />
            <Row label="Piutang klien" value={sheet.receivables} />
            <Row label="Proyek dalam pengerjaan" value={sheet.wip} />
            <Row label="Aset tetap (nilai buku)" value={sheet.fixedAssets} />
            <Row label="Total aset" value={sheet.totalAssets} bold />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase text-slate-400 mb-1">Kewajiban & Ekuitas</p>
            <Row label="Uang muka pelanggan" value={sheet.customerAdvances} hint="Uang klien proyek yang belum diserahkan" />
            <Row label="Kewajiban terdaftar" value={sheet.registeredLiabilities} hint="Supplier, refund, kredit, investor, legal" />
            <Row label="Total kewajiban" value={sheet.totalLiabilities} bold />
            <Row label="Ekuitas (aset − kewajiban)" value={sheet.equity} bold />
          </div>
        </div>
      </section>

      {/* KETAHANAN KAS */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h3 className="flex items-center gap-2 font-bold text-slate-900 text-sm">
            <ShieldCheck size={16} /> Ketahanan kas (dana darurat)
          </h3>
          <span className={cn("text-[11px] font-bold px-2 py-1 rounded-full border", statusStyle)}>{resilience.status}</span>
        </div>
        <Row label="Kas bebas (Rek 1 + 3 + 4)" value={resilience.freeCash} hint="Di luar Rek 2 yang dikunci untuk HPP proyek" />
        <Row label="Kebutuhan tetap / bulan" value={resilience.monthlyNeed} hint="Biaya tetap + operasional + cicilan yang belum masuk biaya tetap" />
        <div className="flex justify-between items-baseline py-1.5">
          <span className="text-xs text-slate-600">Bertahan tanpa proyek baru</span>
          <span className="font-mono text-sm font-bold">{resilience.runwayMonths.toFixed(1)} bulan</span>
        </div>
        <div className="flex justify-between items-center py-1.5 gap-3">
          <span className="text-xs text-slate-600">Target dana darurat (bulan)</span>
          <input
            type="number"
            min={0}
            step={0.5}
            value={settings.emergencyMonths ?? 1}
            onChange={(e) => updateSettings({ emergencyMonths: Math.max(0, Number(e.target.value) || 0) })}
            className="w-20 border border-slate-200 rounded-lg px-2 py-1 text-sm text-right"
          />
        </div>
        <Row label="Target dana darurat" value={resilience.targetAmount} />
        <Row label="Kekurangan terhadap target" value={resilience.gap} bold />
      </section>

      {/* KEWAJIBAN */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5">
        <h3 className="flex items-center gap-2 font-bold text-slate-900 text-sm mb-3">
          <Landmark size={16} /> Daftar kewajiban
        </h3>
        <form onSubmit={submitLiability} className="grid grid-cols-2 md:grid-cols-6 gap-2 mb-4">
          <input className={cn(inputCls, "col-span-2")} placeholder="Nama (mis. Investor A)" value={lName} onChange={(e) => setLName(e.target.value)} />
          <select className={inputCls} value={lKind} onChange={(e) => setLKind(e.target.value as LiabilityKind)}>
            {(Object.keys(LIABILITY_KIND_LABEL) as LiabilityKind[]).map((k) => (
              <option key={k} value={k}>{LIABILITY_KIND_LABEL[k]}</option>
            ))}
          </select>
          <input className={inputCls} inputMode="numeric" placeholder="Sisa (Rp)" value={lOut} onChange={(e) => setLOut(e.target.value)} />
          <input className={inputCls} inputMode="numeric" placeholder="Bayar/bulan" value={lMonthly} onChange={(e) => setLMonthly(e.target.value)} />
          <button type="submit" className="flex items-center justify-center gap-1 bg-slate-900 text-white rounded-lg text-xs font-bold px-3 py-2">
            <Plus size={14} /> Tambah
          </button>
          <label className="col-span-2 md:col-span-6 flex items-center gap-2 text-[11px] text-slate-500">
            <input type="checkbox" checked={lInFixed} onChange={(e) => setLInFixed(e.target.checked)} />
            Cicilan bulanan ini sudah termasuk di "biaya tetap" pada pengaturan
          </label>
        </form>

        {liabilities.length === 0 ? (
          <p className="text-xs text-slate-400">Belum ada kewajiban. Isi investor, supplier, refund klien, kredit kendaraan, dan kontrak legal.</p>
        ) : (
          <div className="space-y-2">
            {liabilities.map((l) => (
              <div key={l.id} className={cn("border border-slate-100 rounded-xl p-3", l.settled && "opacity-50")}>
                <div className="flex justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{l.name}</p>
                    <p className="text-[11px] text-slate-400">
                      {LIABILITY_KIND_LABEL[l.kind]}
                      {l.monthlyPayment > 0 && ` · ${formatRupiah(l.monthlyPayment)}/bulan`}
                      {l.settled && " · lunas"}
                    </p>
                  </div>
                  <p className="font-mono text-sm font-bold">{formatRupiah(l.outstanding)}</p>
                </div>
                <div className="flex gap-3 mt-2 text-[11px] font-bold">
                  <button
                    className="text-emerald-700"
                    onClick={() => {
                      const v = window.prompt("Jumlah pokok yang dibayar (Rp). Catat uang keluarnya terpisah di Pengeluaran.");
                      if (v) payLiability(l.id, toNum(v));
                    }}
                  >
                    Kurangi sisa
                  </button>
                  <button
                    className="text-slate-600"
                    onClick={() => {
                      const v = window.prompt("Sisa kewajiban baru (Rp)", String(l.outstanding));
                      if (v !== null && v !== "") {
                        const n = toNum(v);
                        updateLiability(l.id, { outstanding: n, settled: n === 0 });
                      }
                    }}
                  >
                    Ubah sisa
                  </button>
                  <button
                    className="text-rose-600 ml-auto flex items-center gap-1"
                    onClick={() => window.confirm(`Hapus "${l.name}"?`) && deleteLiability(l.id)}
                  >
                    <Trash2 size={12} /> Hapus
                  </button>
                </div>
              </div>
            ))}
            <div className="text-xs text-slate-500 pt-2">
              Total sisa {formatRupiah(liabSum.total)} · cicilan rutin {formatRupiah(liabSum.monthlyTotal)}/bulan
              {liabSum.monthlyExtra > 0 && ` (${formatRupiah(liabSum.monthlyExtra)} belum masuk biaya tetap)`}
            </div>
          </div>
        )}
      </section>

      {/* ASET TETAP */}
      <section className="bg-white border border-slate-200 rounded-2xl p-5">
        <h3 className="flex items-center gap-2 font-bold text-slate-900 text-sm mb-3">
          <Wrench size={16} /> Aset tetap & penyusutan
        </h3>
        <form onSubmit={submitAsset} className="grid grid-cols-2 md:grid-cols-6 gap-2 mb-4">
          <input className={cn(inputCls, "col-span-2")} placeholder="Nama aset (mis. Mesin CNC)" value={aName} onChange={(e) => setAName(e.target.value)} />
          <select
            className={inputCls}
            value={aCat}
            onChange={(e) => {
              const c = e.target.value as AssetCategory;
              setACat(c);
              setALife(String(ASSET_DEFAULT_LIFE_MONTHS[c]));
            }}
          >
            {(Object.keys(ASSET_CATEGORY_LABEL) as AssetCategory[]).map((k) => (
              <option key={k} value={k}>{ASSET_CATEGORY_LABEL[k]}</option>
            ))}
          </select>
          <input type="date" className={inputCls} value={aDate} onChange={(e) => setADate(e.target.value)} />
          <input className={inputCls} inputMode="numeric" placeholder="Harga beli (Rp)" value={aCost} onChange={(e) => setACost(e.target.value)} />
          <button type="submit" className="flex items-center justify-center gap-1 bg-slate-900 text-white rounded-lg text-xs font-bold px-3 py-2">
            <Plus size={14} /> Tambah
          </button>
          <input className={inputCls} inputMode="numeric" placeholder="Umur (bulan)" value={aLife} onChange={(e) => setALife(e.target.value)} />
          <input className={inputCls} inputMode="numeric" placeholder="Nilai sisa (Rp)" value={aSalvage} onChange={(e) => setASalvage(e.target.value)} />
          <label className="col-span-2 flex items-center gap-2 text-[11px] text-slate-500">
            <input type="checkbox" checked={aEst} onChange={(e) => setAEst(e.target.checked)} />
            Harga masih perkiraan
          </label>
        </form>
        <p className="text-[10px] text-slate-400 mb-3">
          Umur ekonomis hanya usulan akuntansi (garis lurus), bukan ketentuan pajak. Penyusutan bukan uang keluar.
        </p>

        {fixedAssets.length === 0 ? (
          <p className="text-xs text-slate-400">Belum ada aset tetap. Mulai dari kendaraan, mesin, dan peralatan workshop.</p>
        ) : (
          <div className="space-y-2">
            {fixedAssets.map((a) => (
              <div key={a.id} className="border border-slate-100 rounded-xl p-3">
                <div className="flex justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{a.name}</p>
                    <p className="text-[11px] text-slate-400">
                      {ASSET_CATEGORY_LABEL[a.category]} · beli {formatRupiah(a.cost)}
                      {a.estimated && " (perkiraan)"} · susut {formatRupiah(accumulatedDepreciation(a, now))}
                    </p>
                  </div>
                  <p className="font-mono text-sm font-bold">{formatRupiah(bookValue(a, now))}</p>
                </div>
                <button
                  className="text-rose-600 text-[11px] font-bold flex items-center gap-1 mt-2"
                  onClick={() => window.confirm(`Hapus "${a.name}"?`) && deleteFixedAsset(a.id)}
                >
                  <Trash2 size={12} /> Hapus
                </button>
              </div>
            ))}
            <div className="text-xs text-slate-500 pt-2">
              Nilai buku {formatRupiah(assetSum.book)} · penyusutan {formatRupiah(assetSum.monthlyDepreciation)}/bulan
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
