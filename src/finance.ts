// Logika keuangan inti Seven Interior (fungsi murni, mudah diuji).
import {
  Project,
  ProjectSupport,
  RekeningType,
  SOP_ALLOCATION,
  Transaction,
} from "./types";
import { generateId } from "./utils";

export const ACCOUNTS: RekeningType[] = ["REK1", "REK2", "REK3", "REK4"];

// ---------- Predikat ----------

/** Uang masuk sungguhan dari klien/pihak luar (bukan talangan, bukan penyesuaian). */
export function isRealIncome(t: Transaction): boolean {
  return t.type === "INCOME" && !t.supportId && !t.isAdjustment;
}

/** Pengeluaran sungguhan (bukan talangan, bukan penyesuaian). */
export function isRealExpense(t: Transaction): boolean {
  return t.type === "EXPENSE" && !t.supportId && !t.isAdjustment;
}

export function isHpp(t: Transaction): boolean {
  return isRealExpense(t) && !!t.expenseCategory?.startsWith("HPP");
}

// ---------- Saldo rekening ----------

/** Efek satu transaksi terhadap saldo tiap rekening. */
export function accountEffects(t: Transaction): Partial<Record<RekeningType, number>> {
  if (t.type === "INCOME") return { [t.account || "REK1"]: t.amount };
  if (t.type === "EXPENSE") return { [t.expenseAccount || "REK1"]: -t.amount };
  if (t.type === "TRANSFER" && t.fromAccount && t.toAccount) {
    if (t.fromAccount === t.toAccount) return {};
    return { [t.fromAccount]: -t.amount, [t.toAccount]: t.amount };
  }
  return {};
}

export function computeBalances(transactions: Transaction[]): Record<RekeningType, number> {
  const b: Record<RekeningType, number> = { REK1: 0, REK2: 0, REK3: 0, REK4: 0 };
  for (const t of transactions) {
    const eff = accountEffects(t);
    for (const k of ACCOUNTS) b[k] += eff[k] || 0;
  }
  return b;
}

/** Total yang masuk ke sebuah rekening (uang masuk langsung + transfer masuk), tanpa penyesuaian. */
export function inflowTo(transactions: Transaction[], account: RekeningType): number {
  return transactions.reduce((sum, t) => {
    if (t.isAdjustment || t.supportId) return sum;
    if (t.type === "INCOME" && (t.account || "REK1") === account) return sum + t.amount;
    if (t.type === "TRANSFER" && t.toAccount === account && t.fromAccount !== account)
      return sum + t.amount;
    return sum;
  }, 0);
}

// ---------- Alokasi SOP ----------

/**
 * Mode alokasi uang masuk:
 * - "PROPORSIONAL": SETIAP pembayaran (DP, termin, pelunasan) langsung dibagi
 *   53% Rek 2 (HPP) / 27% Rek 3 (OpEx) / 20% Rek 4 (Profit).
 * - "BERTAHAP": 60% pertama kontrak -> Rek 2 & Rek 3, 40% sisanya -> Rek 3 & Rek 4.
 * Ganti nilai di bawah untuk berpindah mode. Total akhir per proyek sama saja.
 */
export const ALLOCATION_MODE: "PROPORSIONAL" | "BERTAHAP" = "PROPORSIONAL";

export const PROPORTIONAL_SHARES = { REK2: 0.53, REK3: 0.27, REK4: 0.2 };

function roundSplit(
  raw: Record<"REK2" | "REK3" | "REK4", number>,
  amount: number,
): Record<"REK2" | "REK3" | "REK4", number> {
  const r = { REK2: Math.round(raw.REK2), REK3: Math.round(raw.REK3), REK4: Math.round(raw.REK4) };
  const diff = Math.round(amount) - (r.REK2 + r.REK3 + r.REK4);
  if (diff !== 0) {
    if (r.REK4 > 0) r.REK4 += diff;
    else r.REK2 += diff;
  }
  return r;
}

export function computeSopAllocation(
  contractValue: number,
  alreadyReceived: number,
  amount: number,
): Record<"REK2" | "REK3" | "REK4", number> {
  if (ALLOCATION_MODE === "PROPORSIONAL") {
    if (amount <= 0) return { REK2: 0, REK3: 0, REK4: 0 };
    const p = PROPORTIONAL_SHARES;
    return roundSplit({ REK2: amount * p.REK2, REK3: amount * p.REK3, REK4: amount * p.REK4 }, amount);
  }
  return computeStagedAllocation(contractValue, alreadyReceived, amount);
}

/**
 * Mode BERTAHAP: pembagian berdasarkan posisi kumulatif pembayaran terhadap
 * nilai kontrak (sama dengan SOP lama untuk pola 60/40).
 */
export function computeStagedAllocation(
  contractValue: number,
  alreadyReceived: number,
  amount: number,
): Record<"REK2" | "REK3" | "REK4", number> {
  const out = { REK2: 0, REK3: 0, REK4: 0 };
  if (contractValue <= 0 || amount <= 0) return out;
  const stage1End = contractValue * SOP_ALLOCATION.firstStagePct;
  const start = Math.max(0, alreadyReceived);
  const end = start + amount;

  // Porsi tahap 1 (0 - 60%)
  const s1 = Math.max(0, Math.min(end, stage1End) - Math.min(start, stage1End));
  if (s1 > 0) {
    const tot = SOP_ALLOCATION.firstStage.REK2 + SOP_ALLOCATION.firstStage.REK3;
    out.REK2 += (s1 * SOP_ALLOCATION.firstStage.REK2) / tot;
    out.REK3 += (s1 * SOP_ALLOCATION.firstStage.REK3) / tot;
  }
  // Porsi tahap 2 (60% - 100%)
  const s2 = Math.max(0, Math.min(end, contractValue) - Math.max(start, stage1End));
  if (s2 > 0) {
    const tot = SOP_ALLOCATION.secondStage.REK3 + SOP_ALLOCATION.secondStage.REK4;
    out.REK3 += (s2 * SOP_ALLOCATION.secondStage.REK3) / tot;
    out.REK4 += (s2 * SOP_ALLOCATION.secondStage.REK4) / tot;
  }
  // Kelebihan bayar di atas nilai kontrak (mis. pekerjaan tambah) -> Rek 4
  const over = Math.max(0, end - Math.max(start, contractValue));
  out.REK4 += over;

  return roundSplit(out, amount);
}

/** Membuat transaksi TRANSFER Rek 1 -> Rek 2/3/4 untuk satu uang masuk. */
export function buildAllocationTransfers(
  income: Transaction,
  split: Record<"REK2" | "REK3" | "REK4", number>,
  projectName?: string,
): Transaction[] {
  const from = income.account || "REK1";
  return (Object.keys(split) as ("REK2" | "REK3" | "REK4")[])
    .filter((k) => split[k] > 0 && k !== from)
    .map((k) => ({
      id: generateId(),
      date: income.date,
      createdAt: Date.now(),
      description: `Alokasi ${from} → ${k}${projectName ? ` - ${projectName}` : ""}`,
      type: "TRANSFER" as const,
      amount: split[k],
      fromAccount: from,
      toAccount: k,
      projectId: income.projectId,
      parentId: income.id,
    }));
}

// ---------- Proyek ----------

export interface ProjectSummary {
  received: number; // total uang klien yang sudah masuk
  outstanding: number; // sisa tagihan (nilai kontrak - diterima)
  hpp: number; // biaya bahan + tukang
  otherCost: number; // biaya lain yang ditautkan ke proyek
  totalCost: number;
  recognized: boolean; // pendapatan sudah diakui (sudah serah terima)
  revenue: number; // pendapatan diakui (0 jika belum serah terima)
  profit: number; // laba proyek diakui
  margin: number; // % dari nilai kontrak
  estimatedProfit: number; // estimasi laba (nilai kontrak - biaya sejauh ini)
}

export function summarizeProject(project: Project, transactions: Transaction[]): ProjectSummary {
  const tx = transactions.filter((t) => t.projectId === project.id);
  const received = tx.filter(isRealIncome).reduce((s, t) => s + t.amount, 0);
  const hpp = tx.filter(isHpp).reduce((s, t) => s + t.amount, 0);
  const totalCost = tx.filter(isRealExpense).reduce((s, t) => s + t.amount, 0);
  const recognized = project.status === "COMPLETED";
  const revenue = recognized ? project.totalValue : 0;
  const estimatedProfit = project.totalValue - totalCost;
  return {
    received,
    outstanding: Math.max(0, project.totalValue - received),
    hpp,
    otherCost: totalCost - hpp,
    totalCost,
    recognized,
    revenue,
    profit: recognized ? revenue - totalCost : 0,
    margin: project.totalValue > 0 ? (estimatedProfit / project.totalValue) * 100 : 0,
    estimatedProfit,
  };
}

// ---------- Laporan laba rugi & posisi keuangan ----------

export interface ProfitLoss {
  revenue: number; // nilai kontrak proyek yang serah terima di periode
  projectCost: number; // seluruh biaya proyek-proyek tsb (kapan pun dikeluarkan)
  grossProfit: number;
  opex: number; // biaya non-proyek di periode
  netProfit: number;
  completedCount: number;
}

export function computeProfitLoss(
  projects: Project[],
  allTransactions: Transaction[],
  inPeriod: (ts: number) => boolean,
): ProfitLoss {
  const completed = projects.filter(
    (p) => p.status === "COMPLETED" && p.completedAt && inPeriod(p.completedAt),
  );
  const ids = new Set(completed.map((p) => p.id));
  const revenue = completed.reduce((s, p) => s + p.totalValue, 0);
  const projectCost = allTransactions
    .filter((t) => isRealExpense(t) && t.projectId && ids.has(t.projectId))
    .reduce((s, t) => s + t.amount, 0);
  // Biaya non-proyek, tidak termasuk pemindahan modal (pajak/prive dicatat sebagai beban)
  const opex = allTransactions
    .filter((t) => isRealExpense(t) && !t.projectId && inPeriod(t.date))
    .reduce((s, t) => s + t.amount, 0);
  const grossProfit = revenue - projectCost;
  return {
    revenue,
    projectCost,
    grossProfit,
    opex,
    netProfit: grossProfit - opex,
    completedCount: completed.length,
  };
}

export interface BalanceSheet {
  cash: number; // total saldo 4 rekening
  receivables: number; // piutang: proyek sudah serah terima tapi belum lunas
  wip: number; // biaya proyek berjalan (proyek dalam pengerjaan)
  customerAdvances: number; // uang muka pelanggan (uang klien untuk proyek belum serah terima)
}

export function computeBalanceSheet(projects: Project[], transactions: Transaction[]): BalanceSheet {
  const bal = computeBalances(transactions);
  let receivables = 0;
  let wip = 0;
  let customerAdvances = 0;
  for (const p of projects) {
    const s = summarizeProject(p, transactions);
    if (p.status === "COMPLETED") receivables += s.outstanding;
    else {
      wip += s.totalCost;
      customerAdvances += s.received;
    }
  }
  return {
    cash: ACCOUNTS.reduce((s, k) => s + bal[k], 0),
    receivables,
    wip,
    customerAdvances,
  };
}

// ---------- Migrasi data versi lama ----------

/**
 * Versi lama mencatat setiap uang masuk penuh di Rek 1 DAN sekaligus memecahnya
 * ke Rek 2-4 (dihitung dua kali). Versi baru: uang masuk ke Rek 1, lalu dipindah
 * ke Rek 2-4 lewat transaksi TRANSFER.
 */
export function migrateTransactions(old: Transaction[]): Transaction[] {
  const out: Transaction[] = [];
  for (const t of old) {
    if (t.type !== "INCOME" || (t.account && !t.splits)) {
      out.push(t);
      continue;
    }
    const splits = t.splits || { rek2: 0, rek3: 0, rek4: 0 };
    const target: RekeningType | null =
      splits.rek2 > 0 ? "REK2" : splits.rek3 > 0 ? "REK3" : splits.rek4 > 0 ? "REK4" : null;
    const isAdj = t.isAdjustment || t.description.includes("Penyesuaian Saldo");
    const { splits: _drop, ...rest } = t;

    if (t.supportId || isAdj) {
      // Talangan & penyesuaian: masuk langsung ke rekening tujuannya, tidak lewat Rek 1
      out.push({
        ...rest,
        account: target || "REK1",
        isAdjustment: isAdj || undefined,
        incomeType: isAdj ? undefined : t.incomeType,
      });
      continue;
    }
    const income: Transaction = {
      ...rest,
      account: "REK1",
      incomeType:
        t.incomeType === "DP_60" ? "DP" : t.incomeType === "PELUNASAN_40" ? "PELUNASAN" : t.incomeType,
    };
    out.push(income);
    out.push(
      ...buildAllocationTransfers(income, {
        REK2: splits.rek2,
        REK3: splits.rek3,
        REK4: splits.rek4,
      }),
    );
  }
  return out;
}

export function needsMigration(transactions: Transaction[]): boolean {
  return transactions.some((t) => t.type === "INCOME" && (!!t.splits || !t.account));
}

// ---------- Talangan ----------

export function outstandingSupportFor(supports: ProjectSupport[], projectId: string) {
  return supports.filter((s) => s.toProjectId === projectId && s.status === "OUTSTANDING");
}
