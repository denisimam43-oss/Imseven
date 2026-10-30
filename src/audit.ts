// Jejak perubahan: fungsi pembantu (murni, mudah diuji).
import { AuditAction, AuditEntry, Transaction } from "./types";
import { generateId } from "./utils";

/** Batas jumlah baris yang disimpan di perangkat. Yang terlama dibuang lebih dulu. */
export const MAX_AUDIT = 3000;

export const AUDIT_LABEL: Record<AuditAction, string> = {
  TX_ADD: "Tambah transaksi",
  TX_EDIT: "Ubah transaksi",
  TX_DELETE: "Hapus transaksi",
  PAYMENT: "Pembayaran klien",
  TRANSFER_CONFIRM: "Konfirmasi transfer",
  PROJECT_ADD: "Tambah proyek",
  PROJECT_STATUS: "Status proyek",
  PROJECT_DELETE: "Hapus proyek",
  SUPPORT: "Talangan",
  BALANCE_ADJUST: "Penyesuaian saldo",
  OPENING_BALANCE: "Saldo pembukaan",
  PERIOD_CLOSE: "Tutup buku",
  PERIOD_REOPEN: "Buka kembali periode",
  SETTINGS: "Ubah pengaturan",
  IMPORT: "Pulihkan backup",
};

/**
 * Pengguna yang sedang bekerja. Saat ini hanya ada satu akun admin; setelah login per
 * orang dipasang, cukup isi "seven_actor" di sessionStorage dengan nama pengguna.
 */
export function currentActor(): string {
  try {
    return sessionStorage.getItem("seven_actor") || "admin";
  } catch {
    return "admin";
  }
}

const TX_FIELDS: (keyof Transaction)[] = [
  "date",
  "description",
  "amount",
  "type",
  "incomeType",
  "account",
  "expenseAccount",
  "expenseCategory",
  "fromAccount",
  "toAccount",
  "projectId",
];

/** Ringkasan isi transaksi yang layak disimpan di jejak (tanpa id internal). */
export function snapshotTx(t: Partial<Transaction>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of TX_FIELDS) if (t[k] !== undefined) out[k] = t[k];
  return out;
}

/** Hanya bagian yang berubah, sebelum dan sesudah. */
export function diffFields(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): { before: Record<string, unknown>; after: Record<string, unknown> } {
  const b: Record<string, unknown> = {};
  const a: Record<string, unknown> = {};
  for (const k of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (JSON.stringify(before[k]) !== JSON.stringify(after[k])) {
      b[k] = before[k];
      a[k] = after[k];
    }
  }
  return { before: b, after: a };
}

export function makeAuditEntry(
  action: AuditAction,
  summary: string,
  extra: Partial<Pick<AuditEntry, "target" | "before" | "after">> = {},
  now = Date.now(),
): AuditEntry {
  return { id: generateId(), at: now, actor: currentActor(), action, summary, ...extra };
}

/** Tambah satu baris ke depan daftar, dengan batas jumlah. */
export function appendAudit(list: AuditEntry[], entry: AuditEntry): AuditEntry[] {
  return [entry, ...list].slice(0, MAX_AUDIT);
}

/**
 * Pengaturan bisa berubah puluhan kali berturut-turut saat diketik. Perubahan pengaturan
 * oleh orang yang sama dalam 60 detik digabung jadi satu baris (nilai awal dipertahankan).
 */
export function appendSettingsAudit(list: AuditEntry[], entry: AuditEntry): AuditEntry[] {
  const last = list[0];
  if (last && last.action === "SETTINGS" && last.actor === entry.actor && entry.at - last.at < 60_000) {
    const merged: AuditEntry = {
      ...last,
      at: entry.at,
      summary: entry.summary,
      before: { ...entry.before, ...last.before },
      after: { ...last.after, ...entry.after },
    };
    return [merged, ...list.slice(1)];
  }
  return appendAudit(list, entry);
}

/** Gabungkan jejak dari backup dengan yang ada: tanpa duplikat, terbaru di atas. */
export function mergeAudit(existing: AuditEntry[], incoming: AuditEntry[]): AuditEntry[] {
  const byId = new Map<string, AuditEntry>();
  for (const e of [...incoming, ...existing]) byId.set(e.id, e);
  return [...byId.values()].sort((x, y) => y.at - x.at).slice(0, MAX_AUDIT);
}
