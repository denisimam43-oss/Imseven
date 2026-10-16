import React, { useMemo, useState } from "react";
import { useFinance } from "../store/FinanceContext";
import { IncomeType, RekeningType, REKENING_LABEL } from "../types";
import { formatRupiah, fromDateInput, toDateInput } from "../utils";
import { analyzeProject, computeAllocation, isRealIncome, outstandingSupportFor } from "../finance";

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
    settings,
    debt,
    balances,
  } = useFinance();
  const shares = settings.shares;

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

  // Utang project
  const [isDebt, setIsDebt] = useState(false);
  const [estMat, setEstMat] = useState("");
  const [estLab, setEstLab] = useState("");
  const [spentMat, setSpentMat] = useState("");
  const [spentLab, setSpentLab] = useState("");
  const [remainingFund, setRemainingFund] = useState("");
  const [settleDate, setSettleDate] = useState("");

  // Talangan: sumber "REK4" | "REK3" | id proyek
  const [supportSource, setSupportSource] = useState<string>("REK4");
  const [toProjectId, setToProjectId] = useState(initialProjectId || "");

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
  const payAnalysis = payProject?.isDebtProject
    ? analyzeProject(payProject, transactions, supports, shares)
    : undefined;

  // Nilai default estimasi utang project dari porsi SOP
  const defMat = Math.round((contractValue * shares.bahan) / 100);
  const defLab = Math.round((contractValue * shares.labour) / 100);
  const estMatNum = estMat === "" ? defMat : parseNum(estMat);
  const estLabNum = estLab === "" ? defLab : parseNum(estLab);
  const debtPreview = (() => {
    if (!isDebt || !contractValue) return null;
    const outstanding = Math.max(0, contractValue - payNum);
    const remM = Math.max(0, estMatNum - parseNum(spentMat));
    const remL = Math.max(0, estLabNum - parseNum(spentLab));
    const need = Math.max(0, remM + remL - parseNum(remainingFund));
    return { outstanding, need, hole: Math.max(0, need - outstanding), cover: outstanding - need };
  })();

  // Talangan
  const supportTarget = activeProjects.find((p) => p.id === toProjectId);
  const supportLender = activeProjects.find((p) => p.id === supportSource);
  const targetAnalysis = supportTarget ? analyzeProject(supportTarget, transactions, supports, shares) : undefined;
  const lenderAnalysis = supportLender ? analyzeProject(supportLender, transactions, supports, shares) : undefined;
  const supportNum = parseNum(value);

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
        (withDp || isDebt) && payNum > 0
          ? { amount: payNum, date: ts, incomeType: "DP", allocate: isDebt ? false : allocate }
          : undefined,
        isDebt
          ? {
              estMaterial: estMatNum,
              estLabour: estLabNum,
              spentMaterial: parseNum(spentMat),
              spentLabour: parseNum(spentLab),
              remainingFund: parseNum(remainingFund),
              expectedSettlementAt: settleDate ? fromDateInput(settleDate) : undefined,
            }
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
      const takesProfit = finalCategory.includes("Prive") || finalCategory.startsWith("Profit");
      if (
        takesProfit &&
        debt.totalHole > 0 &&
        !window.confirm(
          `Masih ada lubang utang project ${formatRupiah(debt.totalHole)}.\nStrategi pemulihan menyarankan menahan prive/pengambilan profit sampai lubang tertutup.\n\nTetap catat pengeluaran ini?`,
        )
      )
        return;
      addExpense(account, num, name, finalCategory, selectedProjectId || undefined, ts);
    } else if (activeModal === "NEW_TRANSFER") {
      if (account === toAccount) return alert("Rekening asal dan tujuan tidak boleh sama.");
      addTransfer(account, toAccount, num, name, ts);
    } else if (activeModal === "NEW_SUPPORT") {
      if (supportSource === toProjectId) return alert("Sumber dan penerima talangan tidak boleh sama.");
      if (
        supportLender &&
        targetAnalysis &&
        num > targetAnalysis.safeTalangan &&
        !window.confirm(
          `Talangan ${formatRupiah(num)} melebihi batas aman ${formatRupiah(targetAnalysis.safeTalangan)}.\nBagian di atas batas ini tidak akan bisa dikembalikan dari pelunasan ${targetAnalysis.project.name}, sehingga proyek ${supportLender.name} ikut kekurangan dana (gali lubang tutup lubang).\n\nTetap lanjutkan?`,
        )
      )
        return;
      const fromName = supportLender
        ? supportLender.name
        : supportSource === "REK4"
          ? "Dana Pemulihan (Rek 4 - Cadangan Profit)"
          : "Kas Operasional (Rek 3)";
      const fromAccount: RekeningType = supportLender ? "REK2" : (supportSource as RekeningType);
      const toName = supportTarget ? supportTarget.name : "Operasional Kantor (Kas Perusahaan)";
      addSupport(
        supportLender ? supportLender.id : undefined,
        fromName,
        supportTarget ? supportTarget.id : undefined,
        toName,
        num,
        name || "Talangan modal kerja proyek",
        fromAccount,
        ts,
        supportTarget ? "REK2" : "REK3",
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

              <label className="flex items-start gap-2 p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-900 cursor-pointer">
                <input type="checkbox" className="mt-0.5" checked={isDebt} onChange={(e) => setIsDebt(e.target.checked)} />
                <span>
                  <b>Utang Project</b> — DP sudah diterima tapi sudah terpakai untuk keperluan lain, sehingga bahan &
                  labour proyek ini masih harus didanai.
                </span>
              </label>

              {isDebt && (
                <>
                  <Field label="DP yang Dulu Diterima (Rp)">
                    <input type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className={`${inputCls} font-mono`} />
                  </Field>
                  {dateField}
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Bahan Sudah Dibeli (Rp)">
                      <input type="number" value={spentMat} onChange={(e) => setSpentMat(e.target.value)} className={`${inputCls} font-mono`} placeholder="0" />
                    </Field>
                    <Field label="Labour Sudah Dibayar (Rp)">
                      <input type="number" value={spentLab} onChange={(e) => setSpentLab(e.target.value)} className={`${inputCls} font-mono`} placeholder="0" />
                    </Field>
                    <Field label={`Estimasi Total Bahan (${shares.bahan}%)`}>
                      <input type="number" value={estMat} onChange={(e) => setEstMat(e.target.value)} className={`${inputCls} font-mono`} placeholder={String(defMat)} />
                    </Field>
                    <Field label={`Estimasi Total Labour (${shares.labour}%)`}>
                      <input type="number" value={estLab} onChange={(e) => setEstLab(e.target.value)} className={`${inputCls} font-mono`} placeholder={String(defLab)} />
                    </Field>
                    <Field label="Dana Proyek Masih Ada (Rp)" hint="Biasanya 0 karena DP sudah terpakai.">
                      <input type="number" value={remainingFund} onChange={(e) => setRemainingFund(e.target.value)} className={`${inputCls} font-mono`} placeholder="0" />
                    </Field>
                    <Field label="Perkiraan Pelunasan">
                      <input type="date" value={settleDate} onChange={(e) => setSettleDate(e.target.value)} className={inputCls} />
                    </Field>
                  </div>
                  {debtPreview && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                      <div className="flex justify-between"><span className="text-slate-500">Sisa tagihan (pelunasan nanti)</span><span className="font-mono font-bold text-blue-600">{formatRupiah(debtPreview.outstanding)}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Kebutuhan bahan + labour tersisa</span><span className="font-mono font-bold text-rose-600">{formatRupiah(debtPreview.need)}</span></div>
                      <div className={`flex justify-between pt-1 border-t border-slate-200 font-bold ${debtPreview.hole > 0 ? "text-rose-700" : "text-emerald-700"}`}>
                        <span>{debtPreview.hole > 0 ? "Lubang (tidak tertutup pelunasan)" : "Pelunasan cukup menutup kebutuhan"}</span>
                        <span className="font-mono">{formatRupiah(debtPreview.hole > 0 ? debtPreview.hole : debtPreview.cover)}</span>
                      </div>
                    </div>
                  )}
                </>
              )}

              {!isDebt && (
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                <input type="checkbox" checked={withDp} onChange={(e) => setWithDp(e.target.checked)} />
                DP sudah diterima
              </label>
              )}

              {!isDebt && withDp && (
                <>
                  <Field label="Nominal DP yang Masuk (Rp)" hint="Otomatis 60% dari kontrak, ubah jika klien membayar berbeda.">
                    <input type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className={`${inputCls} font-mono`} />
                  </Field>
                  {dateField}
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input type="checkbox" checked={allocate} onChange={(e) => setAllocate(e.target.checked)} />
                    Langsung alokasikan ke Rek 2/3/4 (bahan diamankan dulu)
                  </label>
                  {allocate && contractValue > 0 && payNum > 0 && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                      <div className="flex justify-between font-bold text-slate-800">
                        <span>Alokasi DP ({((payNum / contractValue) * 100).toFixed(0)}% kontrak):</span>
                        <span className="font-mono">{formatRupiah(payNum)}</span>
                      </div>
                      <AllocationPreview split={computeAllocation(payNum, shares, { contract: contractValue })} />
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
                Langsung alokasikan ke Rek 2/3/4 (bahan diamankan dulu)
              </label>
              {allocate && payProject && payNum > 0 && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
                  {payAnalysis && (
                    <p className="text-[11px] text-rose-800 leading-relaxed">
                      <b>Utang project — waterfall:</b> Rek 2 diisi dulu {formatRupiah(payAnalysis.need)} (labour{" "}
                      {formatRupiah(payAnalysis.remLabour)}, kembalikan talangan {formatRupiah(payAnalysis.talanganIn)}, sisa
                      bahan), baru sisanya ke Rek 3 & Rek 4.
                    </p>
                  )}
                  <AllocationPreview split={computeAllocation(payNum, shares, { contract: payProject.totalValue, alreadyReceived, debtNeed: payAnalysis?.need })} />
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
                  <optgroup label="Lock Profit (Rek 4)">
                    <option value="Profit - Pengambilan / Dividen">Profit - Pengambilan / Dividen Owner</option>
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
              <Field label="Penerima Talangan">
                <select value={toProjectId} onChange={(e) => setToProjectId(e.target.value)} className={inputCls}>
                  <option value="">-- Operasional Kantor (Kas Umum) --</option>
                  {activeProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.isDebtProject ? "[Utang Project] " : ""}
                      {p.name}
                    </option>
                  ))}
                </select>
              </Field>

              {targetAnalysis && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                  <div className="flex justify-between"><span className="text-slate-500">Bahan belum ada dananya</span><span className="font-mono font-bold">{formatRupiah(targetAnalysis.materialGap)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Sisa tagihan proyek ini</span><span className="font-mono font-bold text-blue-600">{formatRupiah(targetAnalysis.outstanding)}</span></div>
                  <div className="flex justify-between text-emerald-700"><span>Batas talangan aman (kembali dari pelunasan)</span><span className="font-mono font-bold">{formatRupiah(targetAnalysis.safeTalangan)}</span></div>
                  {targetAnalysis.hole > 0 && (
                    <div className="flex justify-between text-rose-700"><span>Lubang — danai dari Rek 4, tidak kembali</span><span className="font-mono font-bold">{formatRupiah(targetAnalysis.hole)}</span></div>
                  )}
                </div>
              )}

              <Field label="Sumber Dana">
                <select value={supportSource} onChange={(e) => setSupportSource(e.target.value)} className={inputCls}>
                  <option value="REK4">Dana Pemulihan — Rek 4 Cadangan Profit (saldo {formatRupiah(balances.rek4)})</option>
                  <option value="REK3">Kas Operasional — Rek 3 (saldo {formatRupiah(balances.rek3)})</option>
                  <optgroup label="Dana HPP proyek lain (Rek 2)">
                    {activeProjects
                      .filter((p) => p.id !== toProjectId)
                      .map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                  </optgroup>
                </select>
              </Field>

              {lenderAnalysis && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
                  <div className="flex justify-between"><span>Dana HPP {lenderAnalysis.project.name}</span><span className="font-mono font-bold">{formatRupiah(lenderAnalysis.fund)}</span></div>
                  <div className="flex justify-between"><span>Kebutuhan bahan + labour proyek itu sendiri</span><span className="font-mono font-bold">{formatRupiah(lenderAnalysis.remMaterial + lenderAnalysis.remLabour)}</span></div>
                  {lenderAnalysis.fund < lenderAnalysis.remMaterial ? (
                    <p className="font-bold text-rose-700 pt-1">
                      Dana HPP proyek ini sendiri belum cukup untuk bahannya. Talangan akan memperbesar kekurangannya —
                      lebih aman dari Rek 4.
                    </p>
                  ) : (
                    supportNum > 0 &&
                    lenderAnalysis.fund - supportNum < lenderAnalysis.remMaterial && (
                      <p className="font-bold text-rose-700 pt-1">
                        Setelah talangan, bahan proyek pemberi tidak lagi terdanai penuh. Pastikan pelunasan penerima datang
                        sebelum bahan proyek ini harus dibeli.
                      </p>
                    )
                  )}
                </div>
              )}
              {supportLender && targetAnalysis && supportNum > targetAnalysis.safeTalangan && (
                <p className="text-xs font-bold text-rose-700">
                  Melebihi batas aman {formatRupiah(targetAnalysis.safeTalangan)} — kelebihannya sebaiknya dari Rek 4.
                </p>
              )}

              <Field label="Nominal Talangan (Rp)">
                <input required type="number" value={value} onChange={(e) => setValue(e.target.value)} className={`${inputCls} font-mono`} placeholder="Contoh: 15000000" />
              </Field>
              <Field label="Keperluan">
                <input required type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Contoh: Beli HPL untuk utang project" />
              </Field>
              {dateField}
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 leading-relaxed">
                Talangan dicatat <strong>OUTSTANDING</strong> dan otomatis dikembalikan ke sumbernya saat pelunasan proyek
                penerima dicatat.
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
