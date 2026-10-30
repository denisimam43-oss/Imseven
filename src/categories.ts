// Daftar kategori pengeluaran baku dan cara membacanya.
//
// Sebelumnya setiap laporan menebak jenis biaya dari potongan teks ("HPP", "Prive", ...)
// di banyak file. Sekarang semua pengelompokan lewat satu tempat ini, sehingga laporan
// tidak bisa saling berbeda. Nilai (value) kategori sengaja sama persis dengan yang sudah
// tersimpan di data lama, jadi transaksi lama tetap terbaca benar.

export type CategoryKind =
  | "BAHAN" // HPP: bahan baku
  | "LABOUR" // HPP: upah tukang & instalasi
  | "KANTOR" // Beban usaha: operasional kantor
  | "TRANSPORT" // Beban usaha: transportasi
  | "KONTINGENSI" // Beban usaha: cadangan tak terduga
  | "MARKETING" // Beban usaha tetap: iklan
  | "TETAP" // Beban usaha tetap: gaji, sewa
  | "PRIVE" // Pengambilan pemilik (bukan beban)
  | "DIVIDEN" // Pengambilan pemilik dari profit (bukan beban)
  | "PAJAK" // Cadangan pajak (dipisah dari omset bersih)
  | "LAINNYA"; // Kategori manual / tidak dikenal -> beban usaha

export interface ExpenseCategory {
  value: string; // disimpan di transaksi (jangan diubah, data lama memakainya)
  label: string; // tampilan di pilihan
  group: string; // judul kelompok di pilihan
  kind: CategoryKind;
}

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  {
    value: "HPP - Biaya Bahan Baku",
    label: "HPP - Biaya Bahan Baku (Multipleks, HPL, Aksesoris)",
    group: "HPP Proyek (Lock 53%)",
    kind: "BAHAN",
  },
  {
    value: "HPP - Upah Labour (Termasuk Instalasi)",
    label: "HPP - Upah Labour / Tukang & Instalasi",
    group: "HPP Proyek (Lock 53%)",
    kind: "LABOUR",
  },
  {
    value: "Opex - Biaya Operasional Kantor",
    label: "Opex - Biaya Operasional Kantor (ATK, Listrik, Konsumsi)",
    group: "Biaya Operasional (Opex 7%)",
    kind: "KANTOR",
  },
  {
    value: "Opex - Biaya Kontingensi (Overhead, Tak Terduga, Revisi)",
    label: "Opex - Biaya Kontingensi (Overhead, Tak Terduga, Revisi)",
    group: "Biaya Operasional (Opex 7%)",
    kind: "KONTINGENSI",
  },
  {
    value: "Opex - Biaya Transportasi (Oli, Ban, Pajak, Survey)",
    label: "Opex - Biaya Transportasi (Bensin, Tol, Oli, Survey)",
    group: "Biaya Operasional (Opex 7%)",
    kind: "TRANSPORT",
  },
  {
    value: "Opex - Prive (Kunci Opex 1-2%)",
    label: "Opex - Prive (Kunci Opex 2%)",
    group: "Biaya Operasional (Opex 7%)",
    kind: "PRIVE",
  },
  {
    value: "Opex Tetap - Biaya Marketing",
    label: "Opex Tetap - Biaya Marketing & Iklan",
    group: "Biaya Tetap Expense (Lock 20%)",
    kind: "MARKETING",
  },
  {
    value: "Opex Tetap - Biaya Expense/Tetap (Utang, Salary)",
    label: "Opex Tetap - Biaya Expense/Tetap (Sewa Workshop, Salary Staff)",
    group: "Biaya Tetap Expense (Lock 20%)",
    kind: "TETAP",
  },
  {
    value: "Profit - Pengambilan / Dividen",
    label: "Profit - Pengambilan / Dividen Owner",
    group: "Lock Profit (Rek 4)",
    kind: "DIVIDEN",
  },
  {
    value: "Tax Reserve / Pajak",
    label: "Tax Reserve / Pajak",
    group: "Pemisahan Modal",
    kind: "PAJAK",
  },
];

/** Pilihan untuk kategori manual. Nilainya selalu diawali ini agar jelas masuk beban usaha. */
export const CUSTOM_PREFIX = "Lainnya - ";
export const CUSTOM_OPTION = "CUSTOM";

export const DEFAULT_EXPENSE_CATEGORY = EXPENSE_CATEGORIES[0].value;

export function customCategoryValue(name: string): string {
  const clean = name.trim();
  return `${CUSTOM_PREFIX}${clean || "Pengeluaran Lainnya"}`;
}

/** Kelompok pilihan, berurutan, untuk <optgroup>. */
export function categoryGroups(): { group: string; items: ExpenseCategory[] }[] {
  const out: { group: string; items: ExpenseCategory[] }[] = [];
  for (const c of EXPENSE_CATEGORIES) {
    const last = out[out.length - 1];
    if (last && last.group === c.group) last.items.push(c);
    else out.push({ group: c.group, items: [c] });
  }
  return out;
}

const BY_VALUE = new Map(EXPENSE_CATEGORIES.map((c) => [c.value, c]));

/** True bila kategori ada di daftar baku. */
export const isStandardCategory = (cat?: string) => !!cat && BY_VALUE.has(cat);

/**
 * Jenis sebuah kategori. Kategori baku dibaca dari daftar; selain itu (data lama atau
 * kategori manual) dibaca dengan aturan teks yang sama seperti sebelumnya, supaya
 * angka laporan lama tidak bergeser.
 */
export function categoryKind(cat?: string): CategoryKind | undefined {
  if (!cat) return undefined;
  const exact = BY_VALUE.get(cat);
  if (exact) return exact.kind;
  if (cat.startsWith("HPP")) return cat.includes("Labour") ? "LABOUR" : "BAHAN";
  if (cat.includes("Prive")) return "PRIVE";
  if (cat.startsWith("Profit")) return "DIVIDEN";
  if (cat.includes("Tax Reserve") || cat.includes("Markup")) return "PAJAK";
  if (cat.includes("Kontingensi")) return "KONTINGENSI";
  if (cat.startsWith("Opex Tetap")) return cat.includes("Marketing") ? "MARKETING" : "TETAP";
  if (cat.startsWith("Opex -")) return cat.includes("Transportasi") ? "TRANSPORT" : "KANTOR";
  return "LAINNYA";
}

export const isHppCategory = (cat?: string) => {
  const k = categoryKind(cat);
  return k === "BAHAN" || k === "LABOUR";
};
export const isMaterialCategory = (cat?: string) => categoryKind(cat) === "BAHAN";
export const isLabourCategory = (cat?: string) => categoryKind(cat) === "LABOUR";
export const isPriveCategory = (cat?: string) => categoryKind(cat) === "PRIVE";
export const isContingencyCategory = (cat?: string) => categoryKind(cat) === "KONTINGENSI";
/** Pengambilan pemilik (prive, dividen): bukan beban usaha. */
export const isOwnerCategory = (cat?: string) => {
  const k = categoryKind(cat);
  return k === "PRIVE" || k === "DIVIDEN";
};
/** Cadangan pajak: dipisahkan dari omset bersih. */
export const isReserveCategory = (cat?: string) => categoryKind(cat) === "PAJAK";
/** Opex tetap: marketing + gaji/sewa. */
export const isFixedOpexCategory = (cat?: string) => {
  const k = categoryKind(cat);
  return k === "MARKETING" || k === "TETAP";
};
/** Opex kantor untuk kontrol anggaran: operasional kantor + transportasi. */
export const isOfficeOpexCategory = (cat?: string) => {
  const k = categoryKind(cat);
  return k === "KANTOR" || k === "TRANSPORT";
};
