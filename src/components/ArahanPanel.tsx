import React, { useMemo, useState } from "react";
import { useFinance } from "../store/FinanceContext";
import { formatRupiah, cn, toDateInput, fromDateInput } from "../utils";
import { REKENING_LABEL, Transaction } from "../types";
import { analyzeProject } from "../finance";
import { planStatus } from "../plan";
import { atNoon, fmtDay, PeriodInfo, shiftPeriod } from "../calendar";
import { Compass, ArrowRight, CheckCircle2, HandCoins, Hammer, CalendarCheck, AlertTriangle, BookLock } from "lucide-react";

const DAY = 24 * 3600 * 1000;

interface CalTask {
  date: Date;
  title: string;
  detail?: string;
  action?: "RECAP";
}

function calendarTasks(cp: PeriodInfo, ctx: { gaji: number; rek3: number; closedThrough?: string }): CalTask[] {
  const out: CalTask[] = [];
  for (const k of [-1, 0, 1]) {
    const p = shiftPeriod(cp, k);
    out.push(
      { date: p.marketingClose, title: `Closing marketing ${p.label}`, detail: "Deal setelah ini dijadwalkan untuk periode berikutnya." },
      { date: p.workshopTarget, title: `Target workshop ${p.label}`, detail: "Produksi periode ini sebaiknya sudah selesai (2 hari cadangan)." },
      { date: p.productionLock, title: `Kunci produksi ${p.label}`, detail: "Pekerjaan yang belum selesai pindah ke periode berikutnya." },
      { date: p.cutoff, title: `Cut-off keuangan ${p.label}`, detail: "Semua transaksi periode ini harus sudah dicatat hari ini." },
      { date: p.validasiKas, title: `Validasi kas ${p.label}`, detail: "Cocokkan saldo 4 rekening dengan mutasi bank, konfirmasi semua arahan transfer." },
      {
        date: p.alokasiGaji,
        title: `Alokasi gaji ${p.label}`,
        detail:
          ctx.rek3 >= ctx.gaji
            ? `Siapkan ${formatRupiah(ctx.gaji)} dari Rek 3 (saldo cukup).`
            : `Butuh ${formatRupiah(ctx.gaji)}, saldo Rek 3 baru ${formatRupiah(ctx.rek3)} — kurang ${formatRupiah(ctx.gaji - ctx.rek3)}.`,
      },
      { date: p.gajiCair, title: `Gaji cair (periode ${p.label})` },
    );
    if (!ctx.closedThrough || p.key > ctx.closedThrough) {
      out.push({ date: p.tutupBuku, title: `Batas tutup buku ${p.label}`, detail: "Buka Rekap Periode lalu tekan Tutup Buku.", action: "RECAP" });
    }
  }
  return out;
}

export function ArahanPanel({ onPayment, onRecap }: { onPayment: (projectId: string) => void; onRecap: () => void }) {
  const {
    pendingTransfers,
    confirmTransfers,
    activeProjects,
    transactions,
    supports,
    settings,
    balances,
    currentPeriod: cp,
    isLocked,
  } = useFinance();
  const [confirmDate, setConfirmDate] = useState(toDateInput());
  const today = atNoon(Date.now());
  const todayTs = today.getTime();

  // 1. Arahan transfer, dikelompokkan per uang masuk
  const groups = useMemo(() => {
    const map = new Map<string, { parent?: Transaction; items: Transaction[] }>();
    for (const t of pendingTransfers) {
      const key = t.parentId || t.id;
      if (!map.has(key)) map.set(key, { parent: transactions.find((x) => x.id === t.parentId), items: [] });
      map.get(key)!.items.push(t);
    }
    return [...map.entries()];
  }, [pendingTransfers, transactions]);
  const pendingTotal = pendingTransfers.reduce((s, t) => s + t.amount, 0);

  // 2. Tagihan klien sesuai rencana (lewat jatuh tempo atau dalam 3 hari)
  const bills = useMemo(() => {
    const out: { projectId: string; name: string; label: string; amount: number; due: number; overdue: boolean }[] = [];
    for (const p of activeProjects) {
      const st = planStatus(p, transactions);
      const n = st?.next;
      if (n && n.due <= todayTs + 3 * DAY) {
        out.push({ projectId: p.id, name: p.name, label: n.label, amount: n.remaining, due: n.due, overdue: n.overdue });
      }
    }
    return out.sort((a, b) => a.due - b.due);
  }, [activeProjects, transactions, todayTs]);

  // 3. Anggaran belanja bahan per proyek berjalan
  const materials = useMemo(
    () =>
      activeProjects
        .filter((p) => p.status === "ONGOING")
        .map((p) => {
          const a = analyzeProject(p, transactions, supports, settings.shares);
          return { p, rem: a.remMaterial, fund: a.fund, limit: Math.max(0, Math.min(a.remMaterial, a.fund)) };
        })
        .filter((x) => x.rem > 0),
    [activeProjects, transactions, supports, settings.shares],
  );

  // 4. Jadwal kalender 7 hari ke depan
  const tasks = useMemo(() => {
    const list = calendarTasks(cp, { gaji: settings.monthlyExpense, rek3: balances.rek3, closedThrough: settings.closedThrough })
      .filter((t) => t.date.getTime() >= todayTs && t.date.getTime() <= todayTs + 7 * DAY)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    if (today.getDay() === 1) {
      list.unshift({ date: today, title: "Laporan mingguan & backup", detail: "Cocokkan mutasi minggu lalu, lalu tekan tombol Backup." });
    }
    return list;
  }, [cp, settings.monthlyExpense, settings.closedThrough, balances.rek3, todayTs]);

  // 5. Peringatan
  const warnings: string[] = [];
  for (const p of activeProjects) {
    const st = planStatus(p, transactions);
    if (st?.handoverLate) warnings.push(`${p.name}: jadwal serah terima ${fmtDay(new Date(p.plan!.handover))} sudah lewat. Serah terima atau ubah rencananya.`);
  }
  (["rek1", "rek2", "rek3", "rek4"] as const).forEach((k) => {
    if (balances[k] < 0) warnings.push(`Saldo ${REKENING_LABEL[k.toUpperCase() as "REK1"]} minus ${formatRupiah(-balances[k])}. Cek pencatatan atau isi dari rekening lain.`);
  });

  const nothing = groups.length === 0 && bills.length === 0 && tasks.length === 0 && warnings.length === 0;
  const confirmTs = fromDateInput(confirmDate);

  return (
    <div className="bg-white rounded-2xl border-2 border-indigo-200 shadow-sm mb-8 overflow-hidden">
      <div className="px-6 py-4 bg-indigo-50 border-b border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="p-2 bg-indigo-600 text-white rounded-xl shrink-0">
            <Compass size={18} />
          </span>
          <div>
            <h4 className="font-bold text-indigo-950">Arahan Admin · {fmtDay(today)}</h4>
            <p className="text-xs text-indigo-800">
              Periode {cp.label} ({fmtDay(cp.start)} – {fmtDay(cp.end)}). Kerjakan dari atas ke bawah.
            </p>
          </div>
        </div>
        {pendingTotal > 0 && (
          <span className="text-xs font-bold text-indigo-900 bg-white border border-indigo-200 rounded-xl px-3 py-1.5 self-start sm:self-auto whitespace-nowrap">
            Belum ditransfer: {formatRupiah(pendingTotal)}
          </span>
        )}
      </div>

      <div className="p-6 space-y-6">
        {nothing && (
          <p className="text-sm text-slate-500 flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-500" /> Tidak ada arahan. Semua sudah dikerjakan.
          </p>
        )}

        {groups.length > 0 && (
          <section>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700">Transfer alokasi di bank</h5>
              <label className="text-[11px] text-slate-500 flex items-center gap-2">
                Tanggal transfer
                <input
                  type="date"
                  value={confirmDate}
                  max={toDateInput()}
                  onChange={(e) => setConfirmDate(e.target.value)}
                  className="px-2 py-1 border border-slate-200 rounded-lg text-xs"
                />
              </label>
            </div>
            <div className="space-y-3">
              {groups.map(([key, g]) => (
                <div key={key} className="rounded-xl border border-slate-200 p-3">
                  <p className="text-xs font-semibold text-slate-700 mb-2">
                    {g.parent ? g.parent.description : "Alokasi"}
                    {g.parent && <span className="text-slate-400 font-normal"> · masuk {fmtDay(new Date(g.parent.date))} · {formatRupiah(g.parent.amount)}</span>}
                  </p>
                  <ul className="space-y-1.5">
                    {g.items.map((t) => (
                      <li key={t.id} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                        <span className="font-mono font-bold text-slate-900">{formatRupiah(t.amount)}</span>
                        <span className="text-slate-500">dari {t.fromAccount}</span>
                        <ArrowRight size={12} className="text-slate-400" />
                        <span className="font-semibold text-indigo-700">{t.toAccount && REKENING_LABEL[t.toAccount]}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => {
                      if (isLocked(confirmTs)) return alert("Tanggal transfer ada di periode yang sudah tutup buku.");
                      confirmTransfers(g.items.map((t) => t.id), confirmTs);
                    }}
                    className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold"
                  >
                    <CheckCircle2 size={14} /> Sudah saya transfer
                  </button>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Saldo rekening di aplikasi baru berubah setelah tombol ditekan, sehingga selalu sama dengan bank.
            </p>
          </section>
        )}

        {bills.length > 0 && (
          <section>
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">Tagih klien sesuai rencana</h5>
            <ul className="space-y-2">
              {bills.map((b) => (
                <li
                  key={b.projectId + b.label}
                  className={cn(
                    "flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border p-3 text-xs",
                    b.overdue ? "border-rose-200 bg-rose-50" : "border-slate-200",
                  )}
                >
                  <span>
                    <b>{b.label}</b> {b.name} · <span className="font-mono font-bold">{formatRupiah(b.amount)}</span>
                    <span className={cn("block text-[11px]", b.overdue ? "text-rose-700 font-semibold" : "text-slate-500")}>
                      {b.overdue ? "Lewat jatuh tempo " : "Jatuh tempo "}
                      {fmtDay(new Date(b.due))}
                    </span>
                  </span>
                  <button
                    onClick={() => onPayment(b.projectId)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold self-start sm:self-auto whitespace-nowrap"
                  >
                    <HandCoins size={14} /> Catat pembayaran
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {materials.length > 0 && (
          <section>
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
              <Hammer size={13} /> Batas belanja bahan dari Rek 2
            </h5>
            <ul className="divide-y divide-slate-100 text-xs">
              {materials.map((m) => (
                <li key={m.p.id} className="py-1.5 flex flex-col sm:flex-row sm:justify-between gap-0.5">
                  <span className="text-slate-700">{m.p.name}</span>
                  <span>
                    <b className="font-mono">{formatRupiah(m.limit)}</b>
                    <span className="text-slate-400">
                      {" "}
                      · sisa anggaran {formatRupiah(m.rem)} · dana proyek {formatRupiah(m.fund)}
                    </span>
                    {m.fund < m.rem && <span className="block sm:inline text-rose-600 font-semibold"> · kurang {formatRupiah(m.rem - Math.max(0, m.fund))}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {tasks.length > 0 && (
          <section>
            <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
              <CalendarCheck size={13} /> Jadwal 7 hari ke depan
            </h5>
            <ul className="space-y-1.5 text-xs">
              {tasks.map((t, i) => {
                const isToday = t.date.getTime() === todayTs;
                return (
                  <li key={i} className={cn("flex gap-3 rounded-lg p-2", isToday && "bg-amber-50 border border-amber-200")}>
                    <span className={cn("w-24 shrink-0 font-semibold", isToday ? "text-amber-800" : "text-slate-500")}>
                      {isToday ? "Hari ini" : fmtDay(t.date)}
                    </span>
                    <span className="flex-1">
                      <b className="text-slate-800">{t.title}</b>
                      {t.detail && <span className="block text-slate-500">{t.detail}</span>}
                      {t.action === "RECAP" && (
                        <button onClick={onRecap} className="mt-1 inline-flex items-center gap-1 text-indigo-700 font-bold hover:underline">
                          <BookLock size={12} /> Buka Rekap Periode
                        </button>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {warnings.length > 0 && (
          <section className="space-y-1.5">
            {warnings.map((w) => (
              <p key={w} className="flex items-start gap-2 text-xs text-rose-800 bg-rose-50 border border-rose-200 rounded-lg p-2">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" /> {w}
              </p>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
