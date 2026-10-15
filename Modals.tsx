import React, { useMemo, useState } from "react";
import { useFinance } from "../store/FinanceContext";
import { IncomeType, RekeningType, REKENING_LABEL } from "../types";
import { formatRupiah, fromDateInput, toDateInput } from "../utils";
import { computeSopAllocation, isRealIncome, outstandingSupportFor } from "../finance";

export type ModalType =
  | "NEW_PROJECT"
  | "NEW_PAYMENT"
  | "NEW_EXPENSE"
  | "NEW_TRANSFER"
  | "NEW_SUPPORT"
  | "CHANGE_PASSWORD";

const inputCls =
  "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500 text-sm font-medium text-slate-800";
const labelCls = "block text-xs font-bold text-slate-600 mb-1 uppercase tracking-wider";

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      {children}
      {hint && <p className="text-[10px] text-slate-400 mt-1">{hint}</p>}
    </div>
  );
}

function AllocationPreview({ split }: { split: Record<"REK2" | "REK3" | "REK4", number> }) {
  return (
    <div className="pl-3 text-[11px] text-slate-600 space-y-0.5">
      {(["REK2", "REK3", "REK4"] as const).map((k) =>
        split[k] > 0 ? (
          <div key={k} className="flex justify-between">
            <span>• {REKENING_LABEL[k]}</span>
            <span className="font-mono">{formatRupiah(split[k])}</span>
          </div>
        ) : null,
      )}
    </div>
  );
}

const parseNum = (v: string) => Number(String(v).replace(/\D/g, "")) || 0;

export function Modals({
  activeModal,
  close,
  initialProjectId,
}: {
  activeModal: ModalType | null;
  close: () => void;
  initialProjectId?: string;
}) {
  if (!activeModal) return null;
  // key -> form selalu mulai bersih setiap kali modal dibuka
  return (
    <React.Fragment key={activeModal + (initialProjectId || "")}>
      <ModalBody activeModal={activeModal} close={close} initialProjectId={initialProjectId} />
    </React.Fragment>
  );
}

function ModalBody({
  activeModal,
  close,
  initialProjectId,
}: {
  activeModal: ModalType;
  close: () => void;
  initialProjectId?: string;
}) {
  const {
    addProject,
    addExpense,
    addSupport,
    addTransfer,
    receivePayment,
    activeProjects,
    transactions,
    supports,
  } = useFinance();

  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(toDateInput());
  const [account, setAccount] = useState<RekeningType>("REK2");
  const [toAccount, setToAccount] = useState<RekeningType>("REK2");
  const [category, setCategory] = useState("HPP - Biaya Bahan Baku");
  const [customCategory, setCustomCategory] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId || "");

  // Pembayaran
  const [payAmount, setPayAmount] = useState("");
  const [payType, setPayType] = useState<IncomeType>("DP");
  const [allocate, setAllocate] = useState(true);
  const [withDp, setWithDp] = useState(true);
  const [settleSupports, setSettleSupports] = useState(true);

  // Talangan
  const [fromProjectId, setFromProjectId] = useState("");
  const [toProjectId, setToProjectId] = useState("");

  // Password
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const contractValue = parseNum(value);
  const payNum = parseNum(payAmount);
  const payProject = activeProjects.find((p) => p.id === selectedProjectId);
  const alreadyReceived = useMemo(
    () =>
      payProject
        ? transactions
            .filter((t) => t.projectId === payProject.id && isRealIncome(t))
            .reduce((s, t) => s + t.amount, 0)
        : 0,
    [payProject, transactions],
  );
  const payProjectSupports = payProject ? outstandingSupportFor(supports, payProject.id) : [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ts = fromDateInput(date);

    if (activeModal === "CHANGE_PASSWORD") {
      if (password.length < 6) return alert("Kata sandi minimal 6 karakter.");
      if (password !== confirmPassword) return alert("Konfirmasi sandi baru tidak cocok.");
      localStorage.setItem("adminPassword", password);
      alert("Kata sandi berhasil diubah.");
      return close();
    }

    if (activeModal === "NEW_PROJECT") {
      if (!contractValue) return alert("Nilai kontrak tidak valid.");
      addProject(
        name,
        contractValue,
        notes || undefined,
        withDp && payNum > 0
          ? { amount: payNum, date: ts, incomeType: "DP", allocate }
          : undefined,
      );
      return close();
    }

    if (activeModal === "NEW_PAYMENT") {
      if (!payProject) return alert("Pilih proyek terlebih dahulu.");
      if (!payNum) return alert("Nominal pembayaran tidak valid.");
      receivePayment({
        projectId: payProject.id,
        amount: payNum,
        date: ts,
        incomeType: payType,
        allocate,
        description: notes || undefined,
        settleSupports: payType === "PELUNASAN" && settleSupports,
      });
      return close();
    }

    const num = parseNum(value);
    if (!num) return alert("Nilai nominal tidak valid.");

    if (activeModal === "NEW_EXPENSE") {
      const finalCategory = category === "CUSTOM" ? customCategory || "Pengeluaran Lainnya" : category;
      addExpense(account, num, name, finalCategory, selectedProjectId || undefined, ts);
    } else if (activeModal === "NEW_TRANSFER") {
      if (account === toAccount) return alert("Rekening asal dan tujuan tidak boleh sama.");
      addTransfer(account, toAccount, num, name, ts);
    } else if (activeModal === "NEW_SUPPORT") {
      if (fromProjectId === toProjectId) return alert("Sumber dan penerima talangan tidak boleh sama.");
      const fromProj = activeProjects.find((p) => p.id === fromProjectId);
      const toProj = activeProjects.find((p) => p.id === toProjectId);
      const fromName = fromProj ? fromProj.name : "Operasional Kantor (Kas Perusahaan)";
      const toName = toProj ? toProj.name : "Operasional Kantor (Kas Perusahaan)";
      addSupport(
        fromProjectId || undefined,
        fromName,
        toProjectId || undefined,
        toName,
        num,
        name || "Talangan modal kerja proyek",
        "REK2",
        ts,
      );
    }
    close();
  };

  const title: Record<ModalType, [string, string]> = {
    NEW_PROJECT: ["Input Proyek Baru", "Daftarkan kontrak. DP dicatat sesuai nominal yang benar-benar masuk."],
    NEW_PAYMENT: ["Terima Pembayaran Klien", "Catat DP / termin / pelunasan sesuai uang yang masuk ke rekening."],
    NEW_EXPENSE: ["Catat Pengeluaran", "Uang keluar dari rekening sesuai pos anggaran."],
    NEW_TRANSFER: ["Transfer Antar Rekening", "Pemindahan dana antar rekening (tidak mengubah total kas)."],
    NEW_SUPPORT: ["Catat Talangan / Subsidi Silang", "Pinjaman modal kerja antar proyek yang wajib dikembalikan."],
    CHANGE_PASSWORD: ["Ubah Kata Sandi Admin", "Perbarui kredensial akses dashboard finance."],
  };
  const submitLabel: Record<ModalType, string> = {
    NEW_PROJECT: "Simpan Proyek",
    NEW_PAYMENT: "Catat Pembayaran",
    NEW_EXPENSE: "Catat Pengeluaran",
    NEW_TRANSFER: "Catat Transfer",
    NEW_SUPPORT: "Simpan Talangan",
    CHANGE_PASSWORD: "Simpan Sandi Baru",
  };

  const dateField = (
    <Field label="Tanggal Transaksi" hint="Isi sesuai tanggal di mutasi rekening / nota.">
      <input type="date" required value={date} max={toDateInput()} onChange={(e) => setDate(e.target.value)} className={inputCls} />
    </Field>
  );

  return (
    <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden my-8">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h4 className="font-bold text-slate-800 text-base">{title[activeModal][0]}</h4>
            <p className="text-xs text-slate-500 font-medium mt-0.5">{title[activeModal][1]}</p>
          </div>
          <button type="button" onClick={close} className="text-slate-400 hover:text-slate-600 font-bold p-1 rounded-lg">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {activeModal === "CHANGE_PASSWORD" && (
            <>
              <Field label="Sandi Baru">
                <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} placeholder="Minimal 6 karakter" />
              </Field>
              <Field label="Konfirmasi Sandi Baru">
                <input required type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputCls} placeholder="Ulangi kata sandi baru" />
              </Field>
            </>
          )}

          {activeModal === "NEW_PROJECT" && (
            <>
              <Field label="Nama Proyek / Klien">
                <input required type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Contoh: Kitchen Set Ibu Ratna - Citraland" />
              </Field>
              <Field label="Total Nilai Kontrak (Rp)">
                <input
                  required
                  type="number"
                  value={value}
                  onChange={(e) => {
                    setValue(e.target.value);
                    const v = parseNum(e.target.value);
                    setPayAmount(v ? String(Math.round(v * 0.6)) : "");
                  }}
                  className={`${inputCls} font-mono`}
                  placeholder="Contoh: 50000000"
                />
              </Field>
              <Field label="Catatan Proyek (Opsional)">
                <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} placeholder="Contoh: Finishing duco putih, estimasi 3 minggu" />
              </Field>

              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                <input type="checkbox" checked={withDp} onChange={(e) => setWithDp(e.target.checked)} />
                DP sudah diterima
              </label>

              {withDp && (
                <>
                  <Field label="Nominal DP yang Masuk (Rp)" hint="Otomatis 60% dari kontrak, ubah jika klien membayar berbeda.">
                    <input type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className={`${inputCls} font-mono`} />
                  </Field>
                  {dateField}
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input type="checkbox" checked={allocate} onChange={(e) => setAllocate(e.target.checked)} />
                    Langsung alokasikan dari Rek 1 ke Rek 2/3/4 sesuai SOP
                  </label>
                  {allocate && contractValue > 0 && payNum > 0 && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                      <div className="flex justify-between font-bold text-slate-800">
                        <span>Alokasi DP ({((payNum / contractValue) * 100).toFixed(0)}% kontrak):</span>
                        <span className="font-mono">{formatRupiah(payNum)}</span>
                      </div>
                      <AllocationPreview split={computeSopAllocation(contractValue, 0, payNum)} />
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {activeModal === "NEW_PAYMENT" && (
            <>
              <Field label="Proyek">
                <select required value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)} className={inputCls}>
                  <option value="">-- Pilih proyek --</option>
                  {activeProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </Field>
              {payProject && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                  <div className="flex justify-between"><span className="text-slate-500">Nilai kontrak</span><span className="font-mono font-bold">{formatRupiah(payProject.totalValue)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Sudah diterima</span><span className="font-mono font-bold text-emerald-600">{formatRupiah(alreadyReceived)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Sisa tagihan</span><span className="font-mono font-bold text-blue-600">{formatRupiah(Math.max(0, payProject.totalValue - alreadyReceived))}</span></div>
                </div>
              )}
              <Field label="Jenis Pembayaran">
                <select
                  value={payType}
                  onChange={(e) => {
                    const t = e.target.value as IncomeType;
                    setPayType(t);
                    if (t === "PELUNASAN" && payProject) {
                      setPayAmount(String(Math.max(0, payProject.totalValue - alreadyReceived)));
                    }
                  }}
                  className={inputCls}
                >
                  <option value="DP">DP</option>
                  <option value="TERMIN">Termin</option>
                  <option value="PELUNASAN">Pelunasan</option>
                  <option value="LAINNYA">Lainnya (pekerjaan tambah, dll.)</option>
                </select>
              </Field>
              <Field label="Nominal yang Masuk (Rp)">
                <input required type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className={`${inputCls} font-mono`} placeholder="Sesuai mutasi rekening" />
              </Field>
              {dateField}
              <Field label="Keterangan (Opsional)">
                <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} placeholder="Contoh: Termin 2 setelah pemasangan kabinet atas" />
              </Field>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input type="checkbox" checked={allocate} onChange={(e) => setAllocate(e.target.checked)} />
                Langsung alokasikan dari Rek 1 ke Rek 2/3/4 sesuai SOP
              </label>
              {allocate && payProject && payNum > 0 && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <AllocationPreview split={computeSopAllocation(payProject.totalValue, alreadyReceived, payNum)} />
                </div>
              )}
              {payType === "PELUNASAN" && payProjectSupports.length > 0 && (
                <label className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 cursor-pointer">
                  <input type="checkbox" className="mt-0.5" checked={settleSupports} onChange={(e) => setSettleSupports(e.target.checked)} />
                  <span>
                    Kembalikan talangan proyek ini sekaligus (
                    <span className="font-mono font-bold">
                      {formatRupiah(payProjectSupports.reduce((s, x) => s + x.amount, 0))}
                    </span>
                    )
                  </span>
                </label>
              )}
            </>
          )}

          {activeModal === "NEW_EXPENSE" && (
            <>
              <Field label="Ambil dari Rekening">
                <select value={account} onChange={(e) => setAccount(e.target.value as RekeningType)} className={inputCls}>
                  {(Object.keys(REKENING_LABEL) as RekeningType[]).map((k) => (
                    <option key={k} value={k}>{REKENING_LABEL[k]}</option>
                  ))}
                </select>
              </Field>
              <Field label="Kategori Pengeluaran">
                <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
                  <optgroup label="HPP Proyek (Lock 53%)">
                    <option value="HPP - Biaya Bahan Baku">HPP - Biaya Bahan Baku (Multipleks, HPL, Aksesoris)</option>
                    <option value="HPP - Upah Labour (Termasuk Instalasi)">HPP - Upah Labour / Tukang & Instalasi</option>
                  </optgroup>
                  <optgroup label="Biaya Operasional (Opex 7%)">
                    <option value="Opex - Biaya Operasional Kantor">Opex - Biaya Operasional Kantor (ATK, Listrik, Konsumsi)</option>
                    <option value="Opex - Biaya Kontingensi (Overhead, Tak Terduga, Revisi)">Opex - Biaya Kontingensi (Overhead, Tak Terduga, Revisi)</option>
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
              </Field>
              {category === "CUSTOM" && (
                <Field label="Nama Kategori Baru">
                  <input required type="text" value={customCategory} onChange={(e) => setCustomCategory(e.target.value)} className={inputCls} placeholder="Contoh: Pemeliharaan Mesin Workshop" />
                </Field>
              )}
              <Field label="Tautkan ke Proyek" hint={category.startsWith("HPP") ? "Biaya HPP sebaiknya selalu ditautkan ke proyek agar laba proyek akurat." : undefined}>
                <select value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)} className={inputCls}>
                  <option value="">-- Pengeluaran Umum (Tanpa Proyek) --</option>
                  {activeProjects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Deskripsi / Keterangan">
                <input required type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Contoh: Beli Multipleks 18mm 15 Lembar" />
              </Field>
              <Field label="Nominal Pengeluaran (Rp)">
                <input required type="number" value={value} onChange={(e) => setValue(e.target.value)} className={`${inputCls} font-mono`} placeholder="Contoh: 3500000" />
              </Field>
              {dateField}
            </>
          )}

          {activeModal === "NEW_TRANSFER" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Dari">
                  <select value={account} onChange={(e) => setAccount(e.target.value as RekeningType)} className={inputCls}>
                    {(Object.keys(REKENING_LABEL) as RekeningType[]).map((k) => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Ke">
                  <select value={toAccount} onChange={(e) => setToAccount(e.target.value as RekeningType)} className={inputCls}>
                    {(Object.keys(REKENING_LABEL) as RekeningType[]).map((k) => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Nominal (Rp)">
                <input required type="number" value={value} onChange={(e) => setValue(e.target.value)} className={`${inputCls} font-mono`} />
              </Field>
              <Field label="Keterangan (Opsional)">
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Contoh: Alokasi manual DP proyek X" />
              </Field>
              {dateField}
            </>
          )}

          {activeModal === "NEW_SUPPORT" && (
            <>
              <Field label="Sumber (Pemberi Talangan)">
                <select value={fromProjectId} onChange={(e) => setFromProjectId(e.target.value)} className={inputCls}>
                  <option value="">-- Operasional Kantor (Kas Umum) --</option>
                  {activeProjects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Penerima Talangan">
                <select value={toProjectId} onChange={(e) => setToProjectId(e.target.value)} className={inputCls}>
                  <option value="">-- Operasional Kantor (Kas Umum) --</option>
                  {activeProjects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Nominal Talangan (Rp)">
                <input required type="number" value={value} onChange={(e) => setValue(e.target.value)} className={`${inputCls} font-mono`} placeholder="Contoh: 15000000" />
              </Field>
              <Field label="Keperluan">
                <input required type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Contoh: Beli HPL darurat sebelum termin cair" />
              </Field>
              {dateField}
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 leading-relaxed">
                Talangan dicatat <strong>OUTSTANDING</strong> sampai dikembalikan. Saat pelunasan proyek penerima dicatat,
                sistem menawarkan pengembalian otomatis.
              </div>
            </>
          )}

          <div className="pt-2">
            <button type="submit" className="w-full bg-navy-600 hover:bg-navy-700 text-white text-xs font-bold uppercase tracking-widest py-3.5 rounded-xl transition-all shadow-sm">
              {submitLabel[activeModal]}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
