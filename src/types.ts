export type ProjectType = "PROJECT";
export type ProjectStatus = "ONGOING" | "COMPLETED";

export interface Project {
  id: string;
  name: string;
  type: ProjectType;
  status: ProjectStatus;
  totalValue: number;
  createdAt: number;
  completedAt?: number;
  clientNotes?: string;
}

export type RekeningType = "REK1" | "REK2" | "REK3" | "REK4";

export interface IncomeSplits {
  rek2: number;
  rek3: number;
  rek4: number;
}

export interface Transaction {
  id: string;
  date: number;
  description: string;
  type: "INCOME" | "EXPENSE";
  // Untuk transaksi income, ini adalah jumlah yang diterima (DP, Pelunasan, atau Retail)
  // Untuk transaksi expense, ini adalah jumlah pengeluaran
  amount: number;

  // Khusus INCOME
  projectId?: string;
  incomeType?: "DP_60" | "PELUNASAN_40";
  splits?: IncomeSplits; // Pemecahan masuk ke rekening mana saja

  // Khusus EXPENSE
  expenseAccount?: "REK1" | "REK2" | "REK3" | "REK4";
  expenseCategory?: string;
  // projectId di atas sudah mencakup untuk mengaitkan pengeluaran ke proyek tertentu
  supportId?: string; // Jika transaksi terkait talangan / subsidi silang
}

// Inter-Project Support (Subsidi Silang / Talangan Antar Proyek)
export interface ProjectSupport {
  id: string;
  fromProjectId?: string; // ID proyek yang menalangi (atau undefined/'OPERASIONAL')
  fromProjectName: string;
  toProjectId?: string; // ID proyek yang ditalangi (atau undefined/'OPERASIONAL')
  toProjectName: string;
  amount: number;
  description: string;
  date: number;
  status: "OUTSTANDING" | "RETURNED";
  returnedAt?: number;
  account?: RekeningType; // default REK2
}

// Konfigurasi Target Sesuai SOP Seven Interior
export type FilterPeriod = "7_DAYS" | "THIS_MONTH" | "6_MONTHS" | "THIS_YEAR";
export type TargetScenario = "SKENARIO_A" | "SKENARIO_B";

export const OPEX_TARGET_BULANAN = 73650000;
export const TARGET_SKENARIO_A = 300000000; // Skenario A: All Interior (Rp 300 Juta)
export const TARGET_SKENARIO_B = 270000000; // Skenario B: Reguler 9 Proyek @ Rp 30 Juta (Rp 270 Juta)
