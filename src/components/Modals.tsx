import React, { useState } from "react";
import { useFinance } from "../store/FinanceContext";
import { RekeningType } from "../types";
import { formatRupiah } from "../utils";
import { ShieldAlert, ArrowLeftRight, CheckCircle2 } from "lucide-react";

export function Modals({
  activeModal,
  close,
}: {
  activeModal:
    | "NEW_PROJECT"
    | "NEW_EXPENSE"
    | "NEW_SUPPORT"
    | "CHANGE_PASSWORD"
    | null;
  close: () => void;
}) {
  const { addProject, addExpense, addSupport, projects } = useFinance();
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [notes, setNotes] = useState("");
  const [account, setAccount] = useState<RekeningType>("REK2");
  const [category, setCategory] = useState("HPP - Biaya Bahan Baku");
  const [customCategory, setCustomCategory] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");

  // Support / Talangan fields
  const [fromProjectId, setFromProjectId] = useState("");
  const [toProjectId, setToProjectId] = useState("");
  const [supportAmount, setSupportAmount] = useState("");
  const [supportDesc, setSupportDesc] = useState("");

  // Password fields
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  if (!activeModal) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (activeModal === "CHANGE_PASSWORD") {
      if (password !== confirmPassword) {
        return alert("Konfirmasi sandi baru tidak cocok.");
      }
      localStorage.setItem("adminPassword", password);
      alert("Kata sandi berhasil diubah.");
      close();
      return;
    }

    if (activeModal === "NEW_SUPPORT") {
      const numAmt = Number(supportAmount.replace(/\D/g, ""));
      if (!numAmt || numAmt <= 0) {
        return alert("Nominal talangan harus lebih dari 0.");
      }
      if (fromProjectId === toProjectId && fromProjectId !== "") {
        return alert("Proyek sumber dan proyek penerima tidak boleh sama.");
      }

      const fromProj = projects.find((p) => p.id === fromProjectId);
      const toProj = projects.find((p) => p.id === toProjectId);

      const fromName = fromProj ? fromProj.name : "Operasional Kantor (Kas Perusahaan)";
      const toName = toProj ? toProj.name : "Operasional Kantor (Kas Perusahaan)";

      addSupport(
        fromProjectId || undefined,
        fromName,
        toProjectId || undefined,
        toName,
        numAmt,
        supportDesc || "Talangan modal kerja proyek",
        "REK2"
      );

      alert(`Talangan sebesar ${formatRupiah(numAmt)} berhasil dicatat dari ${fromName} ke ${toName}.`);
      close();
      return;
    }

    const numValue = Number(value.replace(/\D/g, ""));
    if (!numValue || numValue <= 0) return alert("Nilai nominal tidak valid.");

    if (activeModal === "NEW_PROJECT") {
      addProject(name, numValue, notes || undefined);
    } else if (activeModal === "NEW_EXPENSE") {
      let finalCategory = category;
      if (category === "CUSTOM") {
        finalCategory = customCategory || "Pengeluaran Lainnya";
      }

      addExpense(
        account,
        numValue,
        name,
        finalCategory,
        selectedProjectId || undefined
      );
    }

    close();
  };

  const isExpense = activeModal === "NEW_EXPENSE";
  const numPreview = Number(value.replace(/\D/g, "")) || 0;

  return (
    <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden my-8">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h4 className="font-bold text-slate-800 text-base">
              {activeModal === "NEW_PROJECT" && "Input Proyek Baru"}
              {activeModal === "NEW_EXPENSE" && "Catat Pengeluaran Baru"}
              {activeModal === "NEW_SUPPORT" && "Catat Talangan / Subsidi Silang"}
              {activeModal === "CHANGE_PASSWORD" && "Ubah Kata Sandi Admin"}
            </h4>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {activeModal === "NEW_PROJECT" && "Pencatatan kontrak baru dengan firewall DP 60% (53% HPP & 7% Opex)."}
              {activeModal === "NEW_EXPENSE" && "Pengurangan kas sesuai rekening & kategori pos anggaran Seven Interior."}
              {activeModal === "NEW_SUPPORT" && "Pencatatan pinjaman modal kerja antar proyek & liabilitas pengembalian."}
              {activeModal === "CHANGE_PASSWORD" && "Perbarui kredensial akses dashboard finance."}
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* MODAL: CHANGE PASSWORD */}
          {activeModal === "CHANGE_PASSWORD" && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">
                  Sandi Baru
                </label>
                <input
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500 text-sm font-medium text-slate-800"
                  placeholder="Masukkan kata sandi baru"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">
                  Konfirmasi Sandi Baru
                </label>
                <input
                  required
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500 text-sm font-medium text-slate-800"
                  placeholder="Ulangi kata sandi baru"
                />
              </div>
            </>
          )}

          {/* MODAL: NEW SUPPORT (TALANGAN / SUBSIDI SILANG) */}
          {activeModal === "NEW_SUPPORT" && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">
                  Proyek Sumber (Pemberi Talangan)
                </label>
                <select
                  value={fromProjectId}
                  onChange={(e) => setFromProjectId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500 text-sm font-medium text-slate-800"
                >
                  <option value="">-- Operasional Kantor (Kas Umum) --</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.status === "ONGOING" ? "Ongoing" : "Completed"})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  *Dana akan dipotong dari saldo Rek 2 (HPP) proyek ini.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">
                  Proyek Tujuan (Penerima Talangan)
                </label>
                <select
                  value={toProjectId}
                  onChange={(e) => setToProjectId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500 text-sm font-medium text-slate-800"
                >
                  <option value="">-- Operasional Kantor (Kas Umum) --</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.status === "ONGOING" ? "Ongoing" : "Completed"})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  *Dana akan masuk sebagai modal kerja di Rek 2 proyek penerima.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">
                  Nominal Talangan (Rp)
                </label>
                <input
                  required
                  type="number"
                  value={supportAmount}
                  onChange={(e) => setSupportAmount(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500 font-mono text-sm font-medium text-slate-800"
                  placeholder="Contoh: 15000000"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">
                  Keperluan / Catatan Talangan
                </label>
                <input
                  required
                  type="text"
                  value={supportDesc}
                  onChange={(e) => setSupportDesc(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500 text-sm font-medium text-slate-800"
                  placeholder="Contoh: Pembelian material HPL darurat sebelum termin cair"
                />
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 leading-relaxed">
                <span className="font-bold block mb-0.5">Aturan SOP Seven Interior:</span>
                Sistem akan mencatat transaksi ini dengan status <strong>OUTSTANDING</strong>. Saat proyek penerima menerima Pelunasan 40%, sistem akan mengingatkan untuk mengembalikan dana ini ke proyek asal.
              </div>
            </>
          )}

          {/* MODAL: NEW EXPENSE */}
          {isExpense && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">
                  Ambil dari Rekening
                </label>
                <select
                  value={account}
                  onChange={(e) => setAccount(e.target.value as RekeningType)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500 text-sm font-medium text-slate-800"
                >
                  <option value="REK1">Rek 1 - Rek BCA (Transit / Omset)</option>
                  <option value="REK2">Rek 2 - Lock Proyek (HPP: Bahan & Labour)</option>
                  <option value="REK3">Rek 3 - Lock OpEx (Operasional Kantor & Kontingensi)</option>
                  <option value="REK4">Rek 4 - Lock Profit (Utang / Dividen / Cadangan Aset)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">
                  Kategori Pengeluaran
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500 text-sm font-medium text-slate-800"
                >
                  <optgroup label="HPP Proyek (Lock 53%)">
                    <option value="HPP - Biaya Bahan Baku">HPP - Biaya Bahan Baku (Multipleks, HPL, Aksesoris)</option>
                    <option value="HPP - Upah Labour (Termasuk Instalasi)">HPP - Upah Labour / Tukang & Instalasi</option>
                  </optgroup>
                  <optgroup label="Biaya Operasional (Opex 7%)">
                    <option value="Opex - Biaya Operasional Kantor">Opex - Biaya Operasional Kantor (ATK, Listrik, Konsumsi)</option>
                    <option value="Opex - Biaya Kontingensi (Overhead, Tak Terduga, Revisi)">Opex - Biaya Kontingensi (Overhead 2%, Tak Terduga, Revisi)</option>
                    <option value="Opex - Biaya Transportasi (Oli, Ban, Pajak, Survey)">Opex - Biaya Transportasi (Bensin, Tol, Oli, Survey)</option>
                    <option value="Opex - Prive (Kunci Opex 1-2%)">Opex - Prive (Kunci Opex 2%)</option>
                  </optgroup>
                  <optgroup label="Biaya Tetap Expense (Lock 20%)">
                    <option value="Opex Tetap - Biaya Marketing">Opex Tetap - Biaya Marketing & Iklan</option>
                    <option value="Opex Tetap - Biaya Expense/Tetap (Utang, Salary)">Opex Tetap - Biaya Expense/Tetap (Sewa Workshop, Salary Staff)</option>
                  </optgroup>
                  <optgroup label="Pemisahan Modal">
                    <option value="Tax Reserve / Pajak">Tax Reserve / Pajak</option>
                  </optgroup>
                  <optgroup label="Lainnya">
                    <option value="CUSTOM">Lainnya (Tulis Kategori Manual)</option>
                  </optgroup>
                </select>
              </div>

              {category === "CUSTOM" && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">
                    Nama Kategori Baru
                  </label>
                  <input
                    required
                    type="text"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500 text-sm font-medium text-slate-800"
                    placeholder="Contoh: Pemeliharaan Mesin Workshop"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">
                  Tautkan ke Proyek (Opsional)
                </label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500 text-sm font-medium text-slate-800"
                >
                  <option value="">-- Pengeluaran Umum (Tanpa Proyek) --</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">
                  Deskripsi / Keterangan Pengeluaran
                </label>
                <input
                  required
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500 text-sm font-medium text-slate-800"
                  placeholder="Contoh: Beli Multipleks 18mm 15 Lembar"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">
                  Nominal Pengeluaran (Rp)
                </label>
                <input
                  required
                  type="number"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500 font-mono text-sm font-medium text-slate-800"
                  placeholder="Contoh: 3500000"
                />
              </div>
            </>
          )}

          {/* MODAL: NEW PROJECT */}
          {activeModal === "NEW_PROJECT" && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">
                  Nama Proyek / Klien
                </label>
                <input
                  required
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500 text-sm font-medium text-slate-800"
                  placeholder="Contoh: Kitchen Set Ibu Ratna - Citraland"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">
                  Total Nilai Kontrak (Rp)
                </label>
                <input
                  required
                  type="number"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500 font-mono text-sm font-medium text-slate-800"
                  placeholder="Contoh: 50000000"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider">
                  Catatan Proyek (Opsional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500 text-sm font-medium text-slate-800"
                  placeholder="Contoh: Finishing duco putih, estimasi pengerjaan 3 minggu"
                />
              </div>

              {numPreview > 0 && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2.5">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                    <span className="font-bold text-slate-800">
                      Simulasi Firewall Alokasi Dana:
                    </span>
                    <span className="font-bold font-mono text-navy-700">
                      {formatRupiah(numPreview)}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-emerald-700 font-semibold">
                      <span>✓ DP 60% Diterima:</span>
                      <span className="font-mono">{formatRupiah(numPreview * 0.6)}</span>
                    </div>
                    <div className="pl-3 text-[11px] text-slate-600 space-y-0.5">
                      <div className="flex justify-between">
                        <span>• Rek 2 (Lock HPP 53%):</span>
                        <span className="font-mono">{formatRupiah(numPreview * 0.53)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>• Rek 3 (Lock OpEx 7%):</span>
                        <span className="font-mono">{formatRupiah(numPreview * 0.07)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1 pt-1.5 border-t border-slate-200">
                    <div className="flex justify-between text-blue-700 font-semibold">
                      <span>✓ Pelunasan 40% (Saat Selesai):</span>
                      <span className="font-mono">{formatRupiah(numPreview * 0.4)}</span>
                    </div>
                    <div className="pl-3 text-[11px] text-slate-600 space-y-0.5">
                      <div className="flex justify-between">
                        <span>• Rek 3 (Biaya Tetap 20%):</span>
                        <span className="font-mono">{formatRupiah(numPreview * 0.2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>• Rek 4 (Lock Margin Profit 20%):</span>
                        <span className="font-mono">{formatRupiah(numPreview * 0.2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          <div className="pt-2">
            <button
              type="submit"
              className="w-full bg-navy-600 hover:bg-navy-700 text-white text-xs font-bold uppercase tracking-widest py-3.5 rounded-xl transition-all shadow-sm"
            >
              {activeModal === "CHANGE_PASSWORD" && "Simpan Sandi Baru"}
              {activeModal === "NEW_PROJECT" && "Simpan & Alokasikan DP 60%"}
              {activeModal === "NEW_EXPENSE" && "Catat Pengeluaran Kas"}
              {activeModal === "NEW_SUPPORT" && "Simpan Transaksi Talangan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
