// Matriks wewenang (sesuai dokumen SOP Seven Finance).
import type { Role } from "./types";

export type Action =
  | "closePeriod" // tutup buku periode
  | "reopenPeriod" // buka kembali periode yang sudah tutup buku
  | "approve" // menyetujui / menolak pengeluaran di atas batas
  | "restore" // memulihkan data dari file backup / mengunggah data lokal
  | "editSettings" // mengubah pengaturan keuangan, alokasi, target
  | "void" // membatalkan transaksi
  | "deleteProject"
  | "archiveProject";

const MATRIX: Record<Action, Role[]> = {
  closePeriod: ["OWNER"],
  reopenPeriod: ["OWNER"],
  approve: ["OWNER"],
  restore: ["OWNER"],
  editSettings: ["OWNER"],
  void: ["OWNER", "FINANCE"],
  deleteProject: ["OWNER", "FINANCE"],
  archiveProject: ["OWNER", "FINANCE"],
};

export function roleCan(role: Role | undefined, action: Action): boolean {
  return !!role && MATRIX[action].includes(role);
}

export const ACTION_DENIED: Record<Action, string> = {
  closePeriod: "Hanya Owner yang dapat menutup buku.",
  reopenPeriod: "Hanya Owner yang dapat membuka kembali periode yang sudah tutup buku.",
  approve: "Hanya Owner yang dapat menyetujui atau menolak pengeluaran.",
  restore: "Hanya Owner yang dapat memulihkan data dari backup.",
  editSettings: "Hanya Owner yang dapat mengubah pengaturan keuangan.",
  void: "Hanya Owner atau Finance & Client Relation yang dapat membatalkan transaksi.",
  deleteProject: "Hanya Owner atau Finance & Client Relation yang dapat menghapus proyek.",
  archiveProject: "Hanya Owner atau Finance & Client Relation yang dapat mengarsipkan proyek.",
};
