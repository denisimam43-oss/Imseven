// Logika keuangan inti Seven Interior (fungsi murni, mudah diuji).
import {
  Project,
  ProjectSupport,
  RekeningType,
  AllocationShares,
  FinanceSettings,
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
  if (t.pending) return {}; // arahan transfer yang belum dikerjakan
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

// ---------- Alokasi uang masuk ----------

export type Split = Record<"REK2" | "REK3" | "REK4", number>;

/** Porsi per rekening (dalam pecahan 0-1) dari pengaturan persen. */
export function accountShares(s: AllocationShares) {
  const rek2 = s.bahan + s.labour;
  const rek3 = s.ops + s.kontingensi + s.prive + s.expense;
  const rek4 = s.profit;
  const total = rek2 + rek3 + rek4 || 1;
  return { REK2: rek2 / total, REK3: rek3 / total, REK4: rek4 / total };
}

function roundSplit(raw: Split, amount: number): Split {
  const r = { REK2: Math.round(raw.REK2), REK3: Math.round(raw.REK3), REK4: Math.round(raw.REK4) };
  const diff = Math.round(amount) - (r.REK2 + r.REK3 + r.REK4);
  if (diff !== 0) {
    if (r.REK4 > 0) r.REK4 += diff;
    else if (r.REK3 > 0) r.REK3 += diff;
    else r.REK2 += diff;
  }
  return r;
}

/**
 * Membagi satu uang masuk ke Rek 2/3/4.
 * - Proyek biasa: BAHAN DULU. Uang masuk (dihitung kumulatif per proyek) mengisi
 *   seluruh kebutuhan bahan di Rek 2 lebih dulu. Setelah bahan aman, sisanya
 *   dibagi ke labour (Rek 2), operasional (Rek 3) dan profit (Rek 4) sesuai porsi.
 *   Total akhir per proyek tetap sama dengan porsi SOP (mis. 53 / 27 / 20).
 * - Utang project (debtNeed diisi): WATERFALL -> Rek 2 diisi dulu sampai kebutuhan
 *   proyek tertutup (labour, pengembalian talangan, sisa bahan), sisanya baru
 *   dibagi ke Rek 3 & Rek 4 dengan perbandingan porsinya.
 */
export function computeAllocation(
  amount: number,
  shares: AllocationShares,
  opts: { contract?: number; alreadyReceived?: number; debtNeed?: number } = {},
): Split {
  if (amount <= 0) return { REK2: 0, REK3: 0, REK4: 0 };
  const p = accountShares(shares);

  if (opts.debtNeed !== undefined) {
    const toRek2 = Math.min(amount, Math.max(0, opts.debtNeed));
    const rest = amount - toRek2;
    const r34 = p.REK3 + p.REK4 || 1;
    return roundSplit({ REK2: toRek2, REK3: (rest * p.REK3) / r34, REK4: (rest * p.REK4) / r34 }, amount);
  }

  const contract = opts.contract || 0;
  if (contract <= 0) {
    // Tanpa nilai kontrak: bagi proporsional biasa
    return roundSplit({ REK2: amount * p.REK2, REK3: amount * p.REK3, REK4: amount * p.REK4 }, amount);
  }

  const total = shares.bahan + shares.labour + shares.ops + shares.kontingensi + shares.prive + shares.expense + shares.profit || 1;
  const materialEnd = (contract * shares.bahan) / total; // batas tahap "bahan dulu"
  const restTotal = total - shares.bahan || 1;
  const fLabour = shares.labour / restTotal;
  const fRek3 = (shares.ops + shares.kontingensi + shares.prive + shares.expense) / restTotal;
  const fRek4 = shares.profit / restTotal;

  const start = Math.max(0, opts.alreadyReceived || 0);
  const end = start + amount;
  const out = { REK2: 0, REK3: 0, REK4: 0 };

  // Tahap 1: isi kebutuhan bahan
  const s1 = Math.max(0, Math.min(end, materialEnd) - Math.min(start, materialEnd));
  out.REK2 += s1;
  // Tahap 2: sisa kontrak dibagi labour / operasional / profit
  const s2 = Math.max(0, Math.min(end, contract) - Math.max(start, materialEnd));
  out.REK2 += s2 * fLabour;
  out.REK3 += s2 * fRek3;
  out.REK4 += s2 * fRek4;
  // Kelebihan di atas kontrak (pekerjaan tambah): proporsional biasa
  const over = Math.max(0, end - Math.max(start, contract));
  out.REK2 += over * p.REK2;
  out.REK3 += over * p.REK3;
  out.REK4 += over * p.REK4;

  return roundSplit(out, amount);
}

/** Membuat transaksi TRANSFER Rek 1 -> Rek 2/3/4 untuk satu uang masuk. */
export function buildAllocationTransfers(
  income: Transaction,
  split: Split,
  projectName?: string,
  pending = false,
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
      pending: pending || undefined,
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

/** Pengambilan pemilik (prive, dividen) bukan beban usaha. */
export const isOwnerWithdrawal = (t: Transaction) =>
  !!t.expenseCategory && (t.expenseCategory.includes("Prive") || t.expenseCategory.startsWith("Profit"));

export interface ProfitLoss {
  revenue: number; // nilai kontrak proyek yang serah terima di periode
  projectCost: number; // seluruh biaya proyek-proyek tsb (kapan pun dikeluarkan)
  grossProfit: number;
  opex: number; // biaya non-proyek di periode (tanpa prive/dividen)
  netProfit: number;
  ownerDraw: number; // prive & pengambilan profit oleh pemilik di periode
  retained: number; // laba bersih - pengambilan pemilik
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
  // Biaya non-proyek. Prive & dividen adalah pengambilan pemilik, bukan beban.
  const periodExp = allTransactions.filter((t) => isRealExpense(t) && !t.projectId && inPeriod(t.date));
  const opex = periodExp.filter((t) => !isOwnerWithdrawal(t)).reduce((s, t) => s + t.amount, 0);
  const ownerDraw = allTransactions
    .filter((t) => isRealExpense(t) && isOwnerWithdrawal(t) && inPeriod(t.date))
    .reduce((s, t) => s + t.amount, 0);
  const grossProfit = revenue - projectCost;
  return {
    revenue,
    projectCost,
    grossProfit,
    opex,
    netProfit: grossProfit - opex,
    ownerDraw,
    retained: grossProfit - opex - ownerDraw,
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

// ---------- Strategi Utang Project ----------

const isMaterialCost = (t: Transaction) =>
  t.type === "EXPENSE" && !t.supportId && !t.isAdjustment && !!t.expenseCategory?.startsWith("HPP") &&
  !t.expenseCategory.includes("Labour");
const isLabourCost = (t: Transaction) =>
  t.type === "EXPENSE" && !t.supportId && !t.isAdjustment && !!t.expenseCategory?.includes("Labour");

/**
 * "Dana HPP proyek": uang yang saat ini masih dipegang untuk bahan & labour
 * sebuah proyek. = alokasi ke Rek 2 + talangan diterima + dana pemulihan
 * - biaya HPP - talangan yang diberikan/dikembalikan (+ koreksi manual).
 */
export function projectFund(project: Project, transactions: Transaction[]): number {
  let f = project.fundAdjustment || 0;
  for (const t of transactions) {
    if (t.projectId !== project.id || t.isAdjustment) continue;
    if (t.type === "TRANSFER") {
      if (t.toAccount === "REK2" && t.fromAccount !== "REK2") f += t.amount;
      if (t.fromAccount === "REK2" && t.toAccount !== "REK2") f -= t.amount;
    } else if (t.supportId) {
      f += t.type === "INCOME" ? t.amount : -t.amount;
    } else if (t.type === "EXPENSE" && t.expenseCategory?.startsWith("HPP")) {
      f -= t.amount;
    }
  }
  return f;
}

export interface DebtAnalysis {
  project: Project;
  contract: number;
  received: number; // uang klien yang sudah masuk
  outstanding: number; // sisa tagihan (pelunasan yang akan datang)
  estMaterial: number;
  estLabour: number;
  spentMaterial: number;
  spentLabour: number;
  remMaterial: number; // bahan yang masih harus dibeli
  remLabour: number; // labour yang masih harus dibayar
  talanganIn: number; // talangan diterima & belum dikembalikan
  talanganOut: number; // talangan diberikan ke proyek lain & belum kembali
  fund: number; // dana HPP proyek yang masih ada
  need: number; // total uang yang masih dibutuhkan (termasuk kembalikan talangan)
  coverage: number; // sisa tagihan - kebutuhan (>= 0 aman)
  hole: number; // kekurangan yang TIDAK bisa ditutup pelunasan
  materialGap: number; // bahan yang saat ini belum ada dananya
  fromRecovery: number; // bagian bahan yang sebaiknya didanai Dana Pemulihan (Rek 4)
  safeTalangan: number; // talangan antarproyek yang aman (bisa kembali dari pelunasan)
  settlementToRek2: number; // simulasi: pelunasan yang masuk Rek 2
  settlementToRek34: number; // simulasi: sisa pelunasan untuk Rek 3 & Rek 4
}

export function analyzeProject(
  project: Project,
  transactions: Transaction[],
  supports: ProjectSupport[],
  shares: AllocationShares,
): DebtAnalysis {
  const tx = transactions.filter((t) => t.projectId === project.id);
  const contract = project.totalValue;
  const received = tx.filter(isRealIncome).reduce((s, t) => s + t.amount, 0);
  const outstanding = Math.max(0, contract - received);
  const estMaterial = project.estMaterial ?? Math.round((contract * shares.bahan) / 100);
  const estLabour = project.estLabour ?? Math.round((contract * shares.labour) / 100);
  const spentMaterial = tx.filter(isMaterialCost).reduce((s, t) => s + t.amount, 0);
  const spentLabour = tx.filter(isLabourCost).reduce((s, t) => s + t.amount, 0);
  const remMaterial = Math.max(0, estMaterial - spentMaterial);
  const remLabour = Math.max(0, estLabour - spentLabour);
  const talanganIn = supports
    .filter((s) => s.toProjectId === project.id && s.status === "OUTSTANDING")
    .reduce((s, x) => s + x.amount, 0);
  const talanganOut = supports
    .filter((s) => s.fromProjectId === project.id && s.status === "OUTSTANDING")
    .reduce((s, x) => s + x.amount, 0);
  const fund = projectFund(project, transactions);
  const need = Math.max(0, remMaterial + remLabour + talanganIn - talanganOut - fund);
  const coverage = outstanding - need;
  const hole = Math.max(0, -coverage);
  const materialGap = Math.max(0, remMaterial - Math.max(0, fund));
  const fromRecovery = Math.min(materialGap, hole);
  const safeTalangan = Math.max(0, materialGap - fromRecovery);
  const settlementToRek2 = Math.min(outstanding, need);
  return {
    project,
    contract,
    received,
    outstanding,
    estMaterial,
    estLabour,
    spentMaterial,
    spentLabour,
    remMaterial,
    remLabour,
    talanganIn,
    talanganOut,
    fund,
    need,
    coverage,
    hole,
    materialGap,
    fromRecovery,
    safeTalangan,
    settlementToRek2,
    settlementToRek34: Math.max(0, outstanding - settlementToRek2),
  };
}

export interface DebtSummary {
  projects: DebtAnalysis[];
  totalHole: number;
  totalMaterialGap: number;
  totalTalanganIn: number;
  totalOutstanding: number;
}

export function summarizeDebt(
  projects: Project[],
  transactions: Transaction[],
  supports: ProjectSupport[],
  shares: AllocationShares,
): DebtSummary {
  const list = projects
    .filter((p) => p.isDebtProject && !p.archived)
    .map((p) => analyzeProject(p, transactions, supports, shares));
  return {
    projects: list,
    totalHole: list.reduce((s, a) => s + a.hole, 0),
    totalMaterialGap: list.reduce((s, a) => s + a.materialGap, 0),
    totalTalanganIn: list.reduce((s, a) => s + a.talanganIn, 0),
    totalOutstanding: list.reduce((s, a) => s + a.outstanding, 0),
  };
}

// ---------- Target pasar ----------

export interface MarketTarget {
  fixedNeed: number; // expense + operasional kantor per bulan
  coverPct: number; // porsi omset yang menutup biaya tetap (expense + ops)
  baseTarget: number; // titik impas: omset untuk menutup biaya tetap
  monthlyRecovery: number; // cicilan lubang utang project per bulan
  recoveryTarget: number; // tambahan omset untuk cicilan itu (dari porsi profit)
  minimumTarget: number; // impas + cicilan lubang
  capacityTarget: number; // target periode dari kapasitas slot & hari kerja
  capacitySlots: number;
  totalTarget: number; // target yang dikejar = target kapasitas
  belowMinimum: boolean; // kapasitas periode ini di bawah kebutuhan minimum
  avgProjectValue: number;
  projectsNeeded: number;
}

export function computeMarketTarget(
  settings: FinanceSettings,
  totalHole: number,
  projects: Project[],
  capacity: { slots: number; target: number },
): MarketTarget {
  const s = settings.shares;
  const fixedNeed = settings.monthlyExpense + settings.monthlyOffice;
  const coverPct = (s.expense + s.ops) / 100;
  const baseTarget = coverPct > 0 ? fixedNeed / coverPct : 0;
  const monthlyRecovery = settings.recoveryMonths > 0 ? totalHole / settings.recoveryMonths : 0;
  const recoveryTarget = s.profit > 0 ? monthlyRecovery / (s.profit / 100) : 0;
  const minimumTarget = baseTarget + recoveryTarget;
  const real = projects.filter((p) => !p.archived && p.totalValue > 0);
  const autoAvg = real.length ? real.reduce((x, p) => x + p.totalValue, 0) / real.length : 0;
  const avgProjectValue = settings.avgProjectValue || autoAvg || settings.slotValue;
  return {
    fixedNeed,
    coverPct,
    baseTarget,
    monthlyRecovery,
    recoveryTarget,
    minimumTarget,
    capacityTarget: capacity.target,
    capacitySlots: capacity.slots,
    totalTarget: capacity.target,
    belowMinimum: capacity.target < minimumTarget,
    avgProjectValue,
    projectsNeeded: avgProjectValue > 0 ? Math.ceil(capacity.target / avgProjectValue) : 0,
  };
}
