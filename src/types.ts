export type ProjectType = "PROJECT";
// ONGOING   = proyek sedang dikerjakan (pendapatan BELUM diakui, uang klien = uang muka)
// COMPLETED = sudah serah terima (pendapatan & HPP diakui, sisa tagihan = piutang)
export type ProjectStatus = "ONGOING" | "COMPLETED";

export interface Project {
  id: string;
  name: string;
  type: ProjectType;
  status: ProjectStatus;
  totalValue: number;
  createdAt: number;
  completedAt?: number; // tanggal serah terima
  clientNotes?: string;
  archived?: boolean; // proyek diarsipkan (tidak dihapus agar jejak keuangan tetap ada)

  // ---- Utang Project ----
  // Proyek yang DP-nya sudah terpakai (untuk keperluan lain), sehingga bahan &
  // labour-nya harus didanai dari sumber lain dan ditutup dari pelunasannya.
  isDebtProject?: boolean;
  estMaterial?: number; // estimasi total biaya bahan (default 40% kontrak)
  estLabour?: number; // estimasi total labour (default 13% kontrak)
  expectedSettlementAt?: number; // perkiraan tanggal pelunasan
  // Koreksi saldo "dana HPP proyek" agar sesuai uang yang benar-benar masih ada
  // (mis. DP sudah terpakai -> dana tersedia = 0).
  fundAdjustment?: number;

  // ---- Rencana otomatis (dibuat saat DP masuk) ----
  category?: ProjectCategory;
  paymentScheme?: PaymentScheme;
  plan?: ProjectPlan;
}

export type ProjectCategory = "REGULER" | "PREMIUM";
export type PaymentScheme = "50_50" | "30_40_30";

export const CATEGORY_LABEL: Record<ProjectCategory, string> = {
  REGULER: "Reguler",
  PREMIUM: "Premium / All Interior",
};
export const SCHEME_LABEL: Record<PaymentScheme, string> = {
  "50_50": "DP 50% · Pelunasan 50%",
  "30_40_30": "DP 30% · Termin 40% · Pelunasan 30%",
};

export interface PlannedPayment {
  label: "DP" | "Termin 2" | "Pelunasan";
  pct: number; // persen dari nilai kontrak
  amount: number;
  due: number; // timestamp jatuh tempo
}

export interface ProjectPlan {
  dpDate: number;
  productionStart: number;
  productionEnd: number;
  installEnd: number;
  handover: number; // rencana serah terima (BAST)
  payments: PlannedPayment[];
  handoverManual?: boolean; // tanggal serah terima diubah manual
}

export type RekeningType = "REK1" | "REK2" | "REK3" | "REK4";

export const REKENING_LABEL: Record<RekeningType, string> = {
  REK1: "Rek 1 - Transit / Omset",
  REK2: "Rek 2 - Lock Proyek (HPP)",
  REK3: "Rek 3 - Lock OpEx",
  REK4: "Rek 4 - Lock Profit",
};

// Data lama (sebelum versi 2). Hanya dipakai untuk migrasi.
export interface IncomeSplits {
  rek2: number;
  rek3: number;
  rek4: number;
}

// DP / TERMIN / PELUNASAN = pembayaran klien. DP_60 & PELUNASAN_40 = format lama.
export type IncomeType =
  | "DP"
  | "TERMIN"
  | "PELUNASAN"
  | "LAINNYA"
  | "DP_60"
  | "PELUNASAN_40";

export const INCOME_TYPE_LABEL: Record<IncomeType, string> = {
  DP: "DP",
  TERMIN: "Termin",
  PELUNASAN: "Pelunasan",
  LAINNYA: "Lainnya",
  DP_60: "DP",
  PELUNASAN_40: "Pelunasan",
};

export interface Transaction {
  id: string;
  date: number; // tanggal transaksi sebenarnya (bisa diisi mundur)
  createdAt?: number; // kapan dicatat di aplikasi
  description: string;
  // INCOME   = uang masuk ke salah satu rekening
  // EXPENSE  = uang keluar dari salah satu rekening
  // TRANSFER = pemindahan antar rekening (tidak mengubah total kas)
  type: "INCOME" | "EXPENSE" | "TRANSFER";
  amount: number;
  projectId?: string;

  // INCOME
  incomeType?: IncomeType;
  account?: RekeningType; // rekening tujuan uang masuk (default REK1)
  splits?: IncomeSplits; // format lama, dikonversi saat migrasi

  // EXPENSE
  expenseAccount?: RekeningType;
  expenseCategory?: string;

  // TRANSFER
  fromAccount?: RekeningType;
  toAccount?: RekeningType;
  parentId?: string; // transfer alokasi otomatis yang berasal dari satu uang masuk

  supportId?: string; // terkait talangan / subsidi silang
  isAdjustment?: boolean; // penyesuaian saldo (rekonsiliasi), bukan omset/biaya
  pending?: boolean; // TRANSFER arahan yang belum dikerjakan admin di bank (belum mengubah saldo)
}

// Inter-Project Support (Subsidi Silang / Talangan Antar Proyek)
export interface ProjectSupport {
  id: string;
  fromProjectId?: string;
  fromProjectName: string;
  toProjectId?: string;
  toProjectName: string;
  amount: number;
  description: string;
  date: number;
  status: "OUTSTANDING" | "RETURNED";
  returnedAt?: number;
  account?: RekeningType; // rekening sumber dana (default REK2)
  toAccount?: RekeningType; // rekening penerima (default sama dengan sumber)
}

// ---------- Kewajiban & Aset Tetap ----------

export type LiabilityKind = "SUPPLIER" | "REFUND" | "KREDIT" | "INVESTOR" | "LEGAL" | "LAINNYA";

export const LIABILITY_KIND_LABEL: Record<LiabilityKind, string> = {
  SUPPLIER: "Utang supplier / vendor",
  REFUND: "Refund klien",
  KREDIT: "Kredit / cicilan",
  INVESTOR: "Dana investor",
  LEGAL: "Kontrak legal",
  LAINNYA: "Lainnya",
};

/**
 * Kewajiban di luar uang muka pelanggan dan talangan antar proyek
 * (keduanya sudah dihitung otomatis dari transaksi proyek).
 */
export interface Liability {
  id: string;
  name: string;
  kind: LiabilityKind;
  outstanding: number; // sisa yang masih harus dibayar (sisa pokok)
  monthlyPayment: number; // cicilan / imbal hasil per bulan (0 bila tidak rutin)
  dueDay?: number; // tanggal jatuh tempo tiap bulan (1-31)
  inFixedExpense?: boolean; // pembayaran bulanannya sudah termasuk di "biaya tetap" pada pengaturan
  notes?: string;
  createdAt: number;
  settled?: boolean;
}

export type AssetCategory = "KENDARAAN" | "MESIN" | "PERALATAN" | "KOMPUTER" | "FURNITUR" | "LAINNYA";

export const ASSET_CATEGORY_LABEL: Record<AssetCategory, string> = {
  KENDARAAN: "Kendaraan",
  MESIN: "Mesin produksi",
  PERALATAN: "Peralatan kerja",
  KOMPUTER: "Komputer & elektronik",
  FURNITUR: "Furnitur kantor / workshop",
  LAINNYA: "Lainnya",
};

/** Umur ekonomis usulan (bulan). Ini usulan akuntansi, bukan ketentuan pajak: sesuaikan dengan konsultan pajak. */
export const ASSET_DEFAULT_LIFE_MONTHS: Record<AssetCategory, number> = {
  KENDARAAN: 96,
  MESIN: 96,
  PERALATAN: 48,
  KOMPUTER: 48,
  FURNITUR: 48,
  LAINNYA: 48,
};

export interface FixedAsset {
  id: string;
  name: string;
  category: AssetCategory;
  purchaseDate: number;
  cost: number; // harga beli (boleh perkiraan, lihat estimated)
  usefulLifeMonths: number; // 0 = tidak disusutkan
  salvageValue: number; // nilai sisa di akhir umur ekonomis
  estimated?: boolean; // harga masih perkiraan
  notes?: string;
}

export type FilterPeriod = "THIS_CUTOFF" | "LAST_CUTOFF" | "7_DAYS" | "THIS_MONTH" | "6_MONTHS" | "THIS_YEAR";

// ---------- Pengaturan keuangan (bisa diubah di aplikasi) ----------

/** Porsi alokasi setiap uang masuk, dalam persen (total 100). */
export interface AllocationShares {
  bahan: number; // HPP bahan            -> Rek 2
  labour: number; // HPP labour/tukang   -> Rek 2
  ops: number; // operasional kantor     -> Rek 3
  kontingensi: number; //                -> Rek 3
  prive: number; //                      -> Rek 3
  expense: number; // biaya tetap/bulan  -> Rek 3
  profit: number; //                     -> Rek 4
}

export interface FinanceSettings {
  shares: AllocationShares;
  monthlyExpense: number; // biaya tetap (gaji, sewa, dll) per bulan
  monthlyOffice: number; // biaya operasional kantor per bulan
  avgProjectValue: number; // rata-rata nilai kontrak (0 = hitung otomatis)
  recoveryMonths: number; // target lama menutup lubang utang project
  slotValue: number; // nilai 1 slot kapasitas (Rp)
  slotsPerPeriod: number; // kapasitas produksi penuh per periode
  baseWorkdays: number; // hari kerja periode penuh
  closedThrough?: string; // periode terakhir yang sudah tutup buku, mis. "2026-11"
  emergencyMonths: number; // target dana darurat operasional, dalam bulan kebutuhan tetap
}

export const DEFAULT_SETTINGS: FinanceSettings = {
  shares: { bahan: 40, labour: 13, ops: 3, kontingensi: 2, prive: 2, expense: 20, profit: 20 },
  monthlyExpense: 60000000,
  monthlyOffice: 13650000,
  avgProjectValue: 0,
  recoveryMonths: 6,
  slotValue: 30000000,
  slotsPerPeriod: 12,
  baseWorkdays: 26,
  emergencyMonths: 1,
};

/** Durasi standar (hari kerja) setelah DP / kick off. */
export const DURATIONS: Record<ProjectCategory, { produksi: number; instalasi: number }> = {
  REGULER: { produksi: 7, instalasi: 1 },
  PREMIUM: { produksi: 10, instalasi: 3 },
};
