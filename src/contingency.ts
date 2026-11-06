// Dana tak terduga (kontingensi) per proyek. Fungsi murni, mudah diuji.
//
// Uangnya tetap satu kantong bersama (Rek 3). Yang per proyek adalah JATAH (catatan):
//   jatah   = porsi kontingensi (bawaan 2%) x nilai kontrak
//   plafon  = batas kerugian per proyek (bawaan 7%) x nilai kontrak
// Pemakaian di atas jatah memakai dana bersama; di atas plafon perlu persetujuan owner dan
// dianggap kerugian proyek.
import { isContingencyCategory } from "./categories";
import { isRealExpense } from "./finance";
import { FinanceSettings, LossCause, Project, Transaction } from "./types";

/** Peringatan pertama saat jatah terpakai sebesar ini (70%). */
export const WARN_AT = 0.7;

export type ContingencyLevel = "OK" | "WASPADA" | "HABIS" | "LEWAT_PLAFON";

export const LEVEL_LABEL: Record<ContingencyLevel, string> = {
  OK: "Aman",
  WASPADA: "Waspada (70%+)",
  HABIS: "Jatah habis",
  LEWAT_PLAFON: "Lewat plafon",
};

const LEVEL_RANK: Record<ContingencyLevel, number> = { OK: 0, WASPADA: 1, HABIS: 2, LEWAT_PLAFON: 3 };

export type CauseKey = LossCause | "TANPA_SEBAB";

/** Biaya kontingensi yang ditautkan ke proyek. */
export const isContingencyCost = (t: Transaction) =>
  isRealExpense(t) && !!t.projectId && isContingencyCategory(t.expenseCategory);

/** Biaya kontingensi lama yang belum ditautkan ke proyek (sebelum aturan wajib proyek). */
export const isUnlinkedContingency = (t: Transaction) =>
  isRealExpense(t) && !t.projectId && isContingencyCategory(t.expenseCategory);

export function contingencyLimits(contract: number, settings: FinanceSettings) {
  const allowance = Math.round((contract * settings.shares.kontingensi) / 100);
  const cap = Math.round((contract * (settings.contingencyCapPct ?? 7)) / 100);
  return { allowance, cap: Math.max(cap, allowance) };
}

export function contingencyLevel(used: number, allowance: number, cap: number): ContingencyLevel {
  if (allowance <= 0 && cap <= 0) return "OK"; // proyek belum punya nilai kontrak
  if (used > cap) return "LEWAT_PLAFON";
  if (used >= allowance) return "HABIS";
  if (used >= allowance * WARN_AT) return "WASPADA";
  return "OK";
}

export interface ProjectContingency {
  project: Project;
  contract: number;
  allowance: number; // jatah
  cap: number; // plafon
  used: number;
  remaining: number; // sisa jatah (tidak negatif)
  overAllowance: number; // pemakaian di atas jatah (memakai dana bersama)
  overCap: number; // pemakaian di atas plafon (kerugian proyek)
  pctUsed: number; // terhadap jatah, 0 bila belum ada nilai kontrak
  level: ContingencyLevel;
  count: number;
  byCause: Record<CauseKey, number>;
}

const emptyCauses = (): Record<CauseKey, number> => ({
  INTERNAL: 0,
  VENDOR: 0,
  BISNIS: 0,
  EKSTERNAL: 0,
  TANPA_SEBAB: 0,
});

export function computeProjectContingency(
  project: Project,
  transactions: Transaction[],
  settings: FinanceSettings,
): ProjectContingency {
  const { allowance, cap } = contingencyLimits(project.totalValue, settings);
  const byCause = emptyCauses();
  let used = 0;
  let count = 0;
  for (const t of transactions) {
    if (t.projectId !== project.id || !isContingencyCost(t)) continue;
    used += t.amount;
    count++;
    byCause[t.lossCause ?? "TANPA_SEBAB"] += t.amount;
  }
  return {
    project,
    contract: project.totalValue,
    allowance,
    cap,
    used,
    remaining: Math.max(0, allowance - used),
    overAllowance: Math.max(0, used - allowance),
    overCap: Math.max(0, used - cap),
    pctUsed: allowance > 0 ? used / allowance : 0,
    level: contingencyLevel(used, allowance, cap),
    count,
    byCause,
  };
}

/** Keadaan proyek bila biaya sebesar `amount` ditambahkan (untuk peringatan di form). */
export function contingencyAfter(
  project: Project,
  transactions: Transaction[],
  settings: FinanceSettings,
  amount: number,
) {
  const now = computeProjectContingency(project, transactions, settings);
  const used = now.used + amount;
  return { now, used, level: contingencyLevel(used, now.allowance, now.cap) };
}

export interface ContingencySummary {
  projects: ProjectContingency[]; // terparah dulu
  totalAllowance: number;
  totalUsed: number;
  inPeriod: { total: number; byCause: Record<CauseKey, number>; count: number };
  unlinkedInPeriod: number; // kontingensi lama tanpa proyek
  levelCount: Record<ContingencyLevel, number>;
}

export function summarizeContingency(
  projects: Project[],
  transactions: Transaction[],
  settings: FinanceSettings,
  inPeriod: (ts: number) => boolean,
): ContingencySummary {
  const list = projects
    .filter((p) => !p.archived && p.totalValue > 0)
    .map((p) => computeProjectContingency(p, transactions, settings))
    .sort((a, b) => LEVEL_RANK[b.level] - LEVEL_RANK[a.level] || b.pctUsed - a.pctUsed);

  const byCause = emptyCauses();
  let total = 0;
  let count = 0;
  let unlinked = 0;
  for (const t of transactions) {
    if (!inPeriod(t.date)) continue;
    if (isContingencyCost(t)) {
      total += t.amount;
      count++;
      byCause[t.lossCause ?? "TANPA_SEBAB"] += t.amount;
    } else if (isUnlinkedContingency(t)) {
      unlinked += t.amount;
    }
  }
  const levelCount: Record<ContingencyLevel, number> = { OK: 0, WASPADA: 0, HABIS: 0, LEWAT_PLAFON: 0 };
  for (const c of list) levelCount[c.level]++;
  return {
    projects: list,
    totalAllowance: list.reduce((s, c) => s + c.allowance, 0),
    totalUsed: list.reduce((s, c) => s + c.used, 0),
    inPeriod: { total, byCause, count },
    unlinkedInPeriod: unlinked,
    levelCount,
  };
}
