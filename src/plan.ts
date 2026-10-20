// Rencana otomatis proyek & rekapitulasi periode cut-off.
import {
  DURATIONS,
  FinanceSettings,
  PaymentScheme,
  PlannedPayment,
  Project,
  ProjectCategory,
  ProjectPlan,
  Transaction,
} from "./types";
import { isOwnerWithdrawal, isRealExpense, isRealIncome } from "./finance";
import {
  addWorkdays,
  atNoon,
  inPeriod,
  nextWorkday,
  periodCapacity,
  PeriodInfo,
  periodOfTs,
  shiftPeriod,
} from "./calendar";

// ---------- Rencana proyek ----------

export const SCHEME_PCTS: Record<PaymentScheme, { label: PlannedPayment["label"]; pct: number }[]> = {
  "50_50": [
    { label: "DP", pct: 50 },
    { label: "Pelunasan", pct: 50 },
  ],
  "30_40_30": [
    { label: "DP", pct: 30 },
    { label: "Termin 2", pct: 40 },
    { label: "Pelunasan", pct: 30 },
  ],
};

export const dpPct = (scheme: PaymentScheme) => SCHEME_PCTS[scheme][0].pct;

/**
 * Menyusun rencana dari tanggal DP:
 * kick off = hari kerja DP -> produksi mulai H+1 -> instalasi -> serah terima.
 * Termin 2 (pola 30/40/30) jatuh tempo saat produksi mulai, pelunasan saat serah terima.
 */
export function buildPlan(
  category: ProjectCategory,
  scheme: PaymentScheme,
  contract: number,
  dpTs: number,
  handoverOverride?: number,
): ProjectPlan {
  const d = DURATIONS[category];
  const kickoff = nextWorkday(atNoon(dpTs));
  const productionStart = addWorkdays(kickoff, 1);
  const productionEnd = addWorkdays(productionStart, d.produksi - 1);
  const installEnd = addWorkdays(productionEnd, d.instalasi);
  const autoHandover = addWorkdays(installEnd, 1);
  const handover = handoverOverride ? atNoon(handoverOverride) : autoHandover;
  const payments = SCHEME_PCTS[scheme].map((x) => ({
    label: x.label,
    pct: x.pct,
    amount: Math.round((contract * x.pct) / 100),
    due:
      x.label === "DP"
        ? atNoon(dpTs).getTime()
        : x.label === "Termin 2"
          ? productionStart.getTime()
          : handover.getTime(),
  }));
  return {
    dpDate: atNoon(dpTs).getTime(),
    productionStart: productionStart.getTime(),
    productionEnd: productionEnd.getTime(),
    installEnd: installEnd.getTime(),
    handover: handover.getTime(),
    payments,
    handoverManual: !!handoverOverride,
  };
}

export interface PaymentStatus extends PlannedPayment {
  paid: number;
  remaining: number;
  state: "LUNAS" | "SEBAGIAN" | "BELUM";
  overdue: boolean;
}

export interface PlanStatus {
  payments: PaymentStatus[];
  next?: PaymentStatus;
  received: number;
  harvest: PeriodInfo; // periode panen (serah terima & pelunasan)
  dpPeriod: PeriodInfo;
  rollsOver: boolean; // panen di periode setelah periode DP
  handoverLate: boolean; // rencana serah terima sudah lewat tapi belum serah terima
}

export function planStatus(project: Project, transactions: Transaction[], today = Date.now()): PlanStatus | undefined {
  const plan = project.plan;
  if (!plan) return undefined;
  const received = transactions
    .filter((t) => t.projectId === project.id && isRealIncome(t))
    .reduce((s, t) => s + t.amount, 0);
  const todayD = atNoon(today).getTime();
  let before = 0;
  const payments: PaymentStatus[] = plan.payments.map((p) => {
    const paid = Math.max(0, Math.min(p.amount, received - before));
    before += p.amount;
    const remaining = p.amount - paid;
    return {
      ...p,
      paid,
      remaining,
      state: remaining <= 0 ? "LUNAS" : paid > 0 ? "SEBAGIAN" : "BELUM",
      overdue: remaining > 0 && p.due < todayD,
    };
  });
  const harvest = periodOfTs(plan.handover);
  const dpPeriod = periodOfTs(plan.dpDate);
  return {
    payments,
    next: payments.find((p) => p.remaining > 0),
    received,
    harvest,
    dpPeriod,
    rollsOver: harvest.key !== dpPeriod.key,
    handoverLate: project.status === "ONGOING" && plan.handover < todayD,
  };
}

// ---------- Rekap periode ----------

export { isOwnerWithdrawal };

const HPP_EST_PCT = (s: FinanceSettings) => (s.shares.bahan + s.shares.labour) / 100;

function projectCost(projectId: string, transactions: Transaction[]) {
  return transactions
    .filter((t) => t.projectId === projectId && isRealExpense(t))
    .reduce((s, t) => s + t.amount, 0);
}

function firstIncomeTs(projectId: string, transactions: Transaction[]) {
  const t = transactions
    .filter((x) => x.projectId === projectId && isRealIncome(x))
    .reduce<number | undefined>((m, x) => (m === undefined || x.date < m ? x.date : m), undefined);
  return t;
}

export interface PeriodRecap {
  period: PeriodInfo;
  target: number;
  slotsCapacity: number;
  // Kas
  cashIn: number;
  cashOut: { hpp: number; opex: number; owner: number; other: number; total: number };
  netCash: number;
  // Marketing
  deals: { project: Project; contract: number; slots: number }[];
  dealValue: number;
  dealSlots: number;
  // Produksi / serah terima
  handovers: { project: Project; revenue: number; cost: number; profit: number }[];
  handoverSlots: number;
  // Laba
  revenue: number;
  projectCost: number;
  grossProfit: number;
  opex: number;
  netProfit: number;
  ownerDraw: number;
  retained: number;
  // Rencana (untuk periode yang belum selesai)
  plannedIn: { project: Project; label: string; amount: number; due: number; overdue: boolean }[];
  plannedInTotal: number;
  plannedHandovers: { project: Project; due: number; estProfit: number }[];
  estProfit: number;
  closed: boolean;
}

export function computePeriodRecap(
  period: PeriodInfo,
  projects: Project[],
  transactions: Transaction[],
  settings: FinanceSettings,
  today = Date.now(),
): PeriodRecap {
  const tx = transactions.filter((t) => inPeriod(period, t.date));
  const cap = periodCapacity(period, settings);
  const slot = settings.slotValue || 1;

  const cashIn = tx.filter(isRealIncome).reduce((s, t) => s + t.amount, 0);
  const exp = tx.filter(isRealExpense);
  const hpp = exp.filter((t) => t.expenseCategory?.startsWith("HPP")).reduce((s, t) => s + t.amount, 0);
  const owner = exp.filter(isOwnerWithdrawal).reduce((s, t) => s + t.amount, 0);
  const opexAll = exp
    .filter((t) => !t.expenseCategory?.startsWith("HPP") && !isOwnerWithdrawal(t))
    .reduce((s, t) => s + t.amount, 0);
  const total = exp.reduce((s, t) => s + t.amount, 0);

  const live = projects.filter((p) => !p.archived);
  const deals = live
    .map((p) => ({ p, first: firstIncomeTs(p.id, transactions) }))
    .filter((x) => x.first !== undefined && inPeriod(period, x.first!) && !x.p.isDebtProject)
    .map((x) => ({ project: x.p, contract: x.p.totalValue, slots: x.p.totalValue / slot }));

  const handovers = live
    .filter((p) => p.status === "COMPLETED" && p.completedAt && inPeriod(period, p.completedAt))
    .map((p) => {
      const cost = projectCost(p.id, transactions);
      return { project: p, revenue: p.totalValue, cost, profit: p.totalValue - cost };
    });

  const revenue = handovers.reduce((s, h) => s + h.revenue, 0);
  const pCost = handovers.reduce((s, h) => s + h.cost, 0);
  // Beban usaha periode = pengeluaran non-HPP yang tidak ditautkan ke proyek (bukan prive/dividen)
  const opex = exp
    .filter((t) => !t.projectId && !t.expenseCategory?.startsWith("HPP") && !isOwnerWithdrawal(t))
    .reduce((s, t) => s + t.amount, 0);
  const grossProfit = revenue - pCost;
  const netProfit = grossProfit - opex;

  // Rencana: tagihan terjadwal & serah terima terjadwal di periode ini (belum terjadi).
  // Yang sudah lewat jadwal tapi belum terjadi dianggap bergeser ke hari ini (periode berjalan).
  const todayD = atNoon(today).getTime();
  const eff = (ts: number) => Math.max(ts, todayD);
  const plannedIn: PeriodRecap["plannedIn"] = [];
  const plannedHandovers: PeriodRecap["plannedHandovers"] = [];
  for (const p of live) {
    const st = planStatus(p, transactions, today);
    if (!st) continue;
    for (const pay of st.payments) {
      if (pay.remaining > 0 && inPeriod(period, eff(pay.due))) {
        plannedIn.push({ project: p, label: pay.label, amount: pay.remaining, due: pay.due, overdue: pay.overdue });
      }
    }
    if (p.status === "ONGOING" && p.plan && inPeriod(period, eff(p.plan.handover))) {
      const cost = projectCost(p.id, transactions);
      const estCost = Math.max(cost, p.totalValue * HPP_EST_PCT(settings));
      plannedHandovers.push({ project: p, due: p.plan.handover, estProfit: p.totalValue - estCost });
    }
  }
  plannedIn.sort((a, b) => a.due - b.due);
  plannedHandovers.sort((a, b) => a.due - b.due);

  return {
    period,
    target: cap.target,
    slotsCapacity: cap.slots,
    cashIn,
    cashOut: { hpp, opex: opexAll, owner, other: Math.max(0, total - hpp - opexAll - owner), total },
    netCash: cashIn - total,
    deals,
    dealValue: deals.reduce((s, d) => s + d.contract, 0),
    dealSlots: deals.reduce((s, d) => s + d.slots, 0),
    handovers,
    handoverSlots: handovers.reduce((s, h) => s + h.revenue / slot, 0),
    revenue,
    projectCost: pCost,
    grossProfit,
    opex,
    netProfit,
    ownerDraw: owner,
    retained: netProfit - owner,
    plannedIn,
    plannedInTotal: plannedIn.reduce((s, x) => s + x.amount, 0),
    plannedHandovers,
    estProfit: plannedHandovers.reduce((s, x) => s + x.estProfit, 0),
    closed: !!settings.closedThrough && period.key <= settings.closedThrough,
  };
}

/** Proyeksi beberapa periode ke depan dari rencana proyek. */
export function forecast(
  from: PeriodInfo,
  n: number,
  projects: Project[],
  transactions: Transaction[],
  settings: FinanceSettings,
  today = Date.now(),
) {
  return Array.from({ length: n }, (_, i) => {
    const r = computePeriodRecap(shiftPeriod(from, i), projects, transactions, settings, today);
    return {
      period: r.period,
      target: r.target,
      realized: r.cashIn,
      plannedIn: r.plannedInTotal,
      handovers: r.handovers.length + r.plannedHandovers.length,
      profit: r.netProfit + r.estProfit,
    };
  });
}
