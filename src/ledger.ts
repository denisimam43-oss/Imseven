// Kewajiban, aset tetap, neraca lengkap, dan ketahanan kas (fungsi murni, mudah diuji).
import {
  FinanceSettings,
  FixedAsset,
  Liability,
  LiabilityKind,
  Project,
  Transaction,
} from "./types";
import { BalanceSheet, computeBalanceSheet, computeBalances } from "./finance";

// ---------- Aset tetap & penyusutan (garis lurus) ----------

/** Selisih bulan penuh antara dua tanggal (bulan berjalan yang belum genap tidak dihitung). */
export function monthsBetween(from: number, to: number): number {
  const a = new Date(from);
  const b = new Date(to);
  let m = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  if (b.getDate() < a.getDate()) m -= 1;
  return Math.max(0, m);
}

export function depreciableBase(a: FixedAsset): number {
  return Math.max(0, a.cost - (a.salvageValue || 0));
}

export function monthlyDepreciation(a: FixedAsset): number {
  if (!a.usefulLifeMonths || a.usefulLifeMonths <= 0) return 0;
  return depreciableBase(a) / a.usefulLifeMonths;
}

export function accumulatedDepreciation(a: FixedAsset, asOf = Date.now()): number {
  if (!a.usefulLifeMonths || a.usefulLifeMonths <= 0) return 0;
  const months = Math.min(a.usefulLifeMonths, monthsBetween(a.purchaseDate, asOf));
  return Math.min(depreciableBase(a), Math.round(monthlyDepreciation(a) * months));
}

export function bookValue(a: FixedAsset, asOf = Date.now()): number {
  return Math.max(0, a.cost - accumulatedDepreciation(a, asOf));
}

export interface AssetSummary {
  cost: number; // total harga beli
  accumulated: number; // total akumulasi penyusutan
  book: number; // total nilai buku
  monthlyDepreciation: number; // beban penyusutan per bulan (bukan arus kas)
  count: number;
}

export function summarizeAssets(assets: FixedAsset[], asOf = Date.now()): AssetSummary {
  const accumulated = assets.reduce((s, a) => s + accumulatedDepreciation(a, asOf), 0);
  const cost = assets.reduce((s, a) => s + a.cost, 0);
  return {
    cost,
    accumulated,
    book: cost - accumulated,
    monthlyDepreciation: assets.reduce((s, a) => s + monthlyDepreciation(a), 0),
    count: assets.length,
  };
}

// ---------- Kewajiban ----------

export interface LiabilitySummary {
  active: Liability[];
  total: number; // total sisa kewajiban terdaftar
  byKind: Record<LiabilityKind, number>;
  monthlyTotal: number; // seluruh pembayaran rutin per bulan
  monthlyExtra: number; // pembayaran rutin yang BELUM termasuk di biaya tetap pengaturan
}

const EMPTY_KINDS = (): Record<LiabilityKind, number> => ({
  SUPPLIER: 0,
  REFUND: 0,
  KREDIT: 0,
  INVESTOR: 0,
  LEGAL: 0,
  LAINNYA: 0,
});

export function summarizeLiabilities(list: Liability[]): LiabilitySummary {
  const active = list.filter((l) => !l.settled && l.outstanding > 0);
  const byKind = EMPTY_KINDS();
  for (const l of active) byKind[l.kind] += l.outstanding;
  return {
    active,
    total: active.reduce((s, l) => s + l.outstanding, 0),
    byKind,
    monthlyTotal: active.reduce((s, l) => s + (l.monthlyPayment || 0), 0),
    monthlyExtra: active.filter((l) => !l.inFixedExpense).reduce((s, l) => s + (l.monthlyPayment || 0), 0),
  };
}

// ---------- Neraca lengkap ----------

export interface FullBalanceSheet extends BalanceSheet {
  fixedAssets: number; // nilai buku aset tetap
  totalAssets: number;
  registeredLiabilities: number; // kewajiban terdaftar (supplier, refund, kredit, investor, legal, dll)
  totalLiabilities: number; // uang muka pelanggan + kewajiban terdaftar
  equity: number; // total aset - total kewajiban
  hasLiabilityData: boolean;
  hasAssetData: boolean;
}

/**
 * Persamaan akuntansi: Aset = Kewajiban + Ekuitas.
 * Talangan antar proyek tidak dihitung karena hanya perpindahan di dalam perusahaan.
 */
export function computeFullBalanceSheet(
  projects: Project[],
  transactions: Transaction[],
  liabilities: Liability[],
  assets: FixedAsset[],
  asOf = Date.now(),
): FullBalanceSheet {
  const base = computeBalanceSheet(projects, transactions);
  const a = summarizeAssets(assets, asOf);
  const l = summarizeLiabilities(liabilities);
  const totalAssets = base.cash + base.receivables + base.wip + a.book;
  const totalLiabilities = base.customerAdvances + l.total;
  return {
    ...base,
    fixedAssets: a.book,
    totalAssets,
    registeredLiabilities: l.total,
    totalLiabilities,
    equity: totalAssets - totalLiabilities,
    hasLiabilityData: l.active.length > 0,
    hasAssetData: a.count > 0,
  };
}

// ---------- Ketahanan kas (dana darurat operasional) ----------

export interface CashResilience {
  freeCash: number; // kas di luar Rek 2 (Rek 2 = lock HPP proyek): Rek 1 + Rek 3 + Rek 4
  fixedExpense: number; // biaya tetap + operasional kantor per bulan (pengaturan)
  extraObligations: number; // pembayaran rutin kewajiban yang belum termasuk di biaya tetap
  monthlyNeed: number;
  runwayMonths: number; // berapa bulan kas bebas menutup kebutuhan tanpa proyek baru
  targetMonths: number;
  targetAmount: number;
  gap: number; // kekurangan terhadap target (>= 0)
  status: "KRITIS" | "TIPIS" | "AMAN";
}

export function computeCashResilience(
  transactions: Transaction[],
  settings: FinanceSettings,
  liabilities: Liability[],
): CashResilience {
  const bal = computeBalances(transactions);
  const freeCash = bal.REK1 + bal.REK3 + bal.REK4;
  const fixedExpense = settings.monthlyExpense + settings.monthlyOffice;
  const extraObligations = summarizeLiabilities(liabilities).monthlyExtra;
  const monthlyNeed = fixedExpense + extraObligations;
  const runwayMonths = monthlyNeed > 0 ? freeCash / monthlyNeed : 0;
  const targetMonths = Math.max(0, settings.emergencyMonths ?? 1);
  const targetAmount = Math.round(targetMonths * monthlyNeed);
  const status: CashResilience["status"] =
    runwayMonths < 1 ? "KRITIS" : runwayMonths < targetMonths ? "TIPIS" : "AMAN";
  return {
    freeCash,
    fixedExpense,
    extraObligations,
    monthlyNeed,
    runwayMonths,
    targetMonths,
    targetAmount,
    gap: Math.max(0, targetAmount - freeCash),
    status,
  };
}
