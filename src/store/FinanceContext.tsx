import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useMemo,
} from "react";
import {
  Project,
  Transaction,
  RekeningType,
  FilterPeriod,
  ProjectSupport,
  IncomeType,
  FinanceSettings,
  DEFAULT_SETTINGS,
  ProjectCategory,
  PaymentScheme,
} from "../types";
import { buildPlan } from "../plan";
import { PeriodInfo, inPeriod, periodCapacity, periodInfo, periodOfTs, shiftPeriod } from "../calendar";
import { generateId } from "../utils";
import {
  analyzeProject,
  buildAllocationTransfers,
  computeAllocation,
  computeBalances,
  computeMarketTarget,
  DebtSummary,
  inflowTo,
  MarketTarget,
  projectFund,
  summarizeDebt,
  isRealIncome,
  migrateTransactions,
  needsMigration,
  outstandingSupportFor,
  summarizeProject,
} from "../finance";

const KEY_PROJECTS = "seven_interior_projects_v3";
const KEY_TRANSACTIONS = "seven_interior_transactions_v3";
const KEY_SUPPORTS = "seven_interior_supports_v1";
const KEY_RECONCILE = "seven_interior_needs_reconcile";
const KEY_BACKUP_V1 = "seven_interior_backup_pre_v2";
const KEY_SETTINGS = "seven_interior_settings_v1";

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export interface PaymentInput {
  projectId: string;
  amount: number;
  date: number;
  incomeType: IncomeType;
  allocate: boolean; // langsung pindahkan dari Rek 1 ke Rek 2/3/4 sesuai SOP
  description?: string;
  settleSupports?: boolean; // kembalikan talangan proyek ini sekaligus
}

export interface DebtProjectInput {
  estMaterial: number;
  estLabour: number;
  spentMaterial: number; // bahan yang sudah dibeli untuk proyek ini
  spentLabour: number; // labour yang sudah dibayar
  remainingFund: number; // dana proyek yang benar-benar masih ada (biasanya 0)
  expectedSettlementAt?: number;
}

export interface PlanInput {
  category: ProjectCategory;
  scheme: PaymentScheme;
  handover?: number; // isi bila serah terima disepakati berbeda dari jadwal standar
}

export interface BackupData {
  app: "seven-interior-finance";
  version: 2;
  exportedAt: number;
  projects: Project[];
  transactions: Transaction[];
  supports: ProjectSupport[];
  settings?: FinanceSettings;
}

interface FinanceState {
  projects: Project[]; // semua proyek termasuk arsip
  activeProjects: Project[]; // proyek yang tidak diarsipkan
  transactions: Transaction[];
  filteredTransactions: Transaction[];
  supports: ProjectSupport[];
  filterPeriod: FilterPeriod;
  setFilterPeriod: (period: FilterPeriod) => void;
  isInPeriod: (ts: number) => boolean;
  settings: FinanceSettings;
  updateSettings: (data: Partial<FinanceSettings>) => void;
  debt: DebtSummary;
  marketTarget: MarketTarget;
  addProject: (
    name: string,
    totalValue: number,
    clientNotes?: string,
    firstPayment?: Omit<PaymentInput, "projectId">,
    debtInput?: DebtProjectInput,
    planInput?: PlanInput,
  ) => void;
  setProjectPlan: (projectId: string, input: PlanInput & { dpDate?: number }) => void;
  // Arahan transfer: alokasi yang belum dikerjakan di bank
  pendingTransfers: Transaction[];
  confirmTransfers: (ids: string[], date?: number) => void;
  // Periode cut-off (26 -> 25) & tutup buku
  currentPeriod: PeriodInfo;
  isLocked: (ts: number) => boolean;
  closePeriod: (key: string) => { ok: boolean; message: string };
  reopenPeriod: () => void;
  updateProject: (
    id: string,
    data: Partial<
      Pick<Project, "name" | "totalValue" | "clientNotes" | "estMaterial" | "estLabour" | "expectedSettlementAt">
    >,
  ) => void;
  setDebtStatus: (projectId: string, isDebt: boolean, remainingFund?: number) => void;
  fundFromRecovery: (projectId: string, amount: number) => void;
  receivePayment: (input: PaymentInput) => void;
  completeProject: (projectId: string, date: number) => void;
  reopenProject: (projectId: string) => void;
  archiveProject: (projectId: string, archived: boolean) => void;
  deleteProject: (id: string) => boolean; // hanya bisa jika belum ada transaksi
  addExpense: (
    account: RekeningType,
    amount: number,
    description: string,
    category: string,
    projectId?: string,
    date?: number,
  ) => void;
  addTransfer: (
    from: RekeningType,
    to: RekeningType,
    amount: number,
    description: string,
    date?: number,
    projectId?: string,
  ) => void;
  addSupport: (
    fromProjectId: string | undefined,
    fromProjectName: string,
    toProjectId: string | undefined,
    toProjectName: string,
    amount: number,
    description: string,
    account?: RekeningType,
    date?: number,
    toAccount?: RekeningType,
  ) => void;
  settleSupport: (supportId: string, date?: number) => void;
  deleteSupport: (supportId: string) => void;
  balances: {
    rek1: number;
    rek2: number;
    rek3: number;
    rek4: number;
    totalOmset: number;
    opexCollectedThisMonth: number;
    totalPiutangPelunasan: number; // total sisa tagihan ke klien (semua proyek aktif)
    totalOutstandingSupport: number;
  };
  filteredBalances: { totalOmset: number; opexCollected: number };
  deleteTransaction: (id: string) => void;
  updateTransaction: (id: string, data: Partial<Transaction>) => void;
  adjustBalance: (account: RekeningType, newBalance: number) => void;
  needsReconcile: boolean;
  dismissReconcile: () => void;
  exportData: () => BackupData;
  importData: (data: unknown) => { ok: boolean; message: string };
}

const FinanceContext = createContext<FinanceState | undefined>(undefined);

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>(() => readJson(KEY_PROJECTS, []));

  const [needsReconcile, setNeedsReconcile] = useState<boolean>(
    () => localStorage.getItem(KEY_RECONCILE) === "true",
  );

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = readJson<Transaction[]>(KEY_TRANSACTIONS, []);
    if (needsMigration(saved)) {
      // Simpan cadangan data lama sebelum dikonversi
      try {
        localStorage.setItem(
          KEY_BACKUP_V1,
          JSON.stringify({
            projects: readJson(KEY_PROJECTS, []),
            transactions: saved,
            supports: readJson(KEY_SUPPORTS, []),
            savedAt: Date.now(),
          }),
        );
        localStorage.setItem(KEY_RECONCILE, "true");
      } catch {
        /* abaikan jika penyimpanan penuh */
      }
      return migrateTransactions(saved);
    }
    return saved;
  });

  const [supports, setSupports] = useState<ProjectSupport[]>(() => readJson(KEY_SUPPORTS, []));

  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>("THIS_CUTOFF");
  const [settings, setSettings] = useState<FinanceSettings>(() => {
    const saved = readJson<Partial<FinanceSettings>>(KEY_SETTINGS, {});
    return {
      ...DEFAULT_SETTINGS,
      ...saved,
      shares: { ...DEFAULT_SETTINGS.shares, ...(saved.shares || {}) },
    };
  });

  const updateSettings: FinanceState["updateSettings"] = (data) => {
    setSettings((prev) => ({ ...prev, ...data, shares: { ...prev.shares, ...(data.shares || {}) } }));
  };

  // Periode yang sudah tutup buku tidak boleh berubah lagi
  const isLocked = (ts: number) => !!settings.closedThrough && periodOfTs(ts).key <= settings.closedThrough;

  useEffect(() => {
    // Status ini bisa diset saat migrasi di inisialisasi state transaksi
    if (localStorage.getItem(KEY_RECONCILE) === "true") setNeedsReconcile(true);
  }, []);

  useEffect(() => {
    localStorage.setItem(KEY_PROJECTS, JSON.stringify(projects));
  }, [projects]);
  useEffect(() => {
    localStorage.setItem(KEY_TRANSACTIONS, JSON.stringify(transactions));
  }, [transactions]);
  useEffect(() => {
    localStorage.setItem(KEY_SUPPORTS, JSON.stringify(supports));
  }, [supports]);
  useEffect(() => {
    localStorage.setItem(KEY_SETTINGS, JSON.stringify(settings));
  }, [settings]);

  const dismissReconcile = () => {
    localStorage.removeItem(KEY_RECONCILE);
    setNeedsReconcile(false);
  };

  // ---------- Proyek & pembayaran ----------

  const buildPayment = (
    project: Project,
    input: Omit<PaymentInput, "projectId">,
    existing: Transaction[],
  ): Transaction[] => {
    const income: Transaction = {
      id: generateId(),
      date: input.date,
      createdAt: Date.now(),
      description:
        input.description?.trim() ||
        `${input.incomeType === "DP" ? "DP" : input.incomeType === "TERMIN" ? "Termin" : input.incomeType === "PELUNASAN" ? "Pelunasan" : "Pembayaran"} - ${project.name}`,
      type: "INCOME",
      amount: input.amount,
      projectId: project.id,
      incomeType: input.incomeType,
      account: "REK1",
    };
    if (!input.allocate) return [income];
    // Utang project: pelunasan mengisi kebutuhan proyeknya dulu (waterfall)
    const debtNeed = project.isDebtProject
      ? analyzeProject(project, existing, supports, settings.shares).need
      : undefined;
    const alreadyReceived = existing
      .filter((t) => t.projectId === project.id && isRealIncome(t))
      .reduce((sum, t) => sum + t.amount, 0);
    const split = computeAllocation(input.amount, settings.shares, {
      contract: project.totalValue,
      alreadyReceived,
      debtNeed,
    });
    // Transfer alokasi menjadi ARAHAN: saldo baru berubah setelah admin konfirmasi sudah transfer
    return [income, ...buildAllocationTransfers(income, split, project.name, true)];
  };

  const addProject: FinanceState["addProject"] = (
    name,
    totalValue,
    clientNotes,
    firstPayment,
    debtInput,
    planInput,
  ) => {
    const createdAt = firstPayment?.date ?? Date.now();
    if (firstPayment && firstPayment.amount > 0 && isLocked(firstPayment.date)) return;
    const newProject: Project = {
      id: generateId(),
      name,
      type: "PROJECT",
      status: "ONGOING",
      totalValue,
      createdAt,
      clientNotes,
    };
    if (planInput) {
      newProject.category = planInput.category;
      newProject.paymentScheme = planInput.scheme;
      // Rencana otomatis dibuat begitu DP masuk (proyek reguler, bukan utang project)
      if (!debtInput && firstPayment && firstPayment.amount > 0) {
        newProject.plan = buildPlan(planInput.category, planInput.scheme, totalValue, firstPayment.date, planInput.handover);
      }
    }
    if (debtInput) {
      // Utang project: DP sudah terpakai, jadi DP dicatat tanpa alokasi dan
      // dana HPP proyek dikoreksi menjadi sebesar dana yang benar-benar masih ada.
      newProject.isDebtProject = true;
      newProject.estMaterial = debtInput.estMaterial;
      newProject.estLabour = debtInput.estLabour;
      newProject.expectedSettlementAt = debtInput.expectedSettlementAt;
      newProject.fundAdjustment =
        debtInput.spentMaterial + debtInput.spentLabour + debtInput.remainingFund;
    }
    setProjects((prev) => [newProject, ...prev]);

    const opening: Transaction[] = [];
    if (debtInput) {
      const mk = (amount: number, category: string, label: string): Transaction => ({
        id: generateId(),
        date: createdAt,
        createdAt: Date.now(),
        description: `${label} (sudah keluar) - ${name}`,
        type: "EXPENSE",
        amount,
        expenseAccount: "REK1",
        expenseCategory: category,
        projectId: newProject.id,
      });
      if (debtInput.spentMaterial > 0)
        opening.push(mk(debtInput.spentMaterial, "HPP - Biaya Bahan Baku", "Bahan"));
      if (debtInput.spentLabour > 0)
        opening.push(mk(debtInput.spentLabour, "HPP - Upah Labour (Termasuk Instalasi)", "Labour"));
    }
    setTransactions((prev) => {
      const pay =
        firstPayment && firstPayment.amount > 0
          ? buildPayment(newProject, debtInput ? { ...firstPayment, allocate: false } : firstPayment, prev)
          : [];
      return [...pay, ...opening, ...prev];
    });
  };

  const setDebtStatus: FinanceState["setDebtStatus"] = (projectId, isDebt, remainingFund = 0) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== projectId) return p;
        if (!isDebt) return { ...p, isDebtProject: false };
        // Koreksi agar dana HPP proyek = dana yang benar-benar masih ada
        const current = projectFund(p, transactions);
        return {
          ...p,
          isDebtProject: true,
          fundAdjustment: (p.fundAdjustment || 0) + (remainingFund - current),
        };
      }),
    );
  };

  const fundFromRecovery: FinanceState["fundFromRecovery"] = (projectId, amount) => {
    const project = projects.find((p) => p.id === projectId);
    if (!project || amount <= 0) return;
    addTransfer("REK4", "REK2", amount, `Dana Pemulihan (Rek 4) untuk ${project.name}`, Date.now(), projectId);
  };

  const updateProject: FinanceState["updateProject"] = (id, data) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const next = { ...p, ...data };
        // Nilai kontrak berubah -> nominal tagihan rencana ikut menyesuaikan
        if (next.plan && data.totalValue !== undefined && data.totalValue !== p.totalValue) {
          next.plan = {
            ...next.plan,
            payments: next.plan.payments.map((x) => ({ ...x, amount: Math.round((next.totalValue * x.pct) / 100) })),
          };
        }
        return next;
      }),
    );
  };

  const setProjectPlan: FinanceState["setProjectPlan"] = (projectId, input) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id !== projectId) return p;
        const firstIncome = transactions
          .filter((t) => t.projectId === p.id && isRealIncome(t))
          .reduce<number | undefined>((m, t) => (m === undefined || t.date < m ? t.date : m), undefined);
        const dpDate = input.dpDate ?? firstIncome ?? p.createdAt;
        return {
          ...p,
          category: input.category,
          paymentScheme: input.scheme,
          plan: buildPlan(input.category, input.scheme, p.totalValue, dpDate, input.handover),
        };
      }),
    );
  };

  const confirmTransfers: FinanceState["confirmTransfers"] = (ids, date = Date.now()) => {
    const set = new Set(ids);
    // Tanggal = hari admin benar-benar transfer di bank (tidak boleh masuk periode yang sudah ditutup)
    setTransactions((prev) =>
      prev.map((t) =>
        set.has(t.id) && t.pending
          ? { ...t, pending: undefined, date: Math.max(date, t.date) }
          : t,
      ),
    );
  };

  const settleSupportTx = (sup: ProjectSupport, date: number): Transaction[] => [
    {
      id: generateId(),
      date,
      createdAt: Date.now(),
      description: `Penerimaan Pengembalian Talangan dari ${sup.toProjectName}`,
      type: "INCOME",
      amount: sup.amount,
      projectId: sup.fromProjectId,
      account: sup.account || "REK2",
      supportId: sup.id,
    },
    {
      id: generateId(),
      date,
      createdAt: Date.now(),
      description: `Pengembalian Talangan ke ${sup.fromProjectName} (${sup.description})`,
      type: "EXPENSE",
      amount: sup.amount,
      expenseAccount: sup.toAccount || sup.account || "REK2",
      expenseCategory: "Pengembalian Talangan Proyek",
      projectId: sup.toProjectId,
      supportId: sup.id,
    },
  ];

  const receivePayment: FinanceState["receivePayment"] = (input) => {
    const project = projects.find((p) => p.id === input.projectId);
    if (!project || isLocked(input.date)) return;
    let extra: Transaction[] = [];
    if (input.settleSupports) {
      const outstanding = outstandingSupportFor(supports, project.id);
      if (outstanding.length > 0) {
        const ids = new Set(outstanding.map((s) => s.id));
        setSupports((prev) =>
          prev.map((s) => (ids.has(s.id) ? { ...s, status: "RETURNED", returnedAt: input.date } : s)),
        );
        extra = outstanding.flatMap((s) => settleSupportTx(s, input.date));
      }
    }
    setTransactions((prev) => [...buildPayment(project, input, prev), ...extra, ...prev]);
  };

  const completeProject: FinanceState["completeProject"] = (projectId, date) => {
    if (isLocked(date)) return;
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, status: "COMPLETED", completedAt: date } : p)),
    );
  };

  const reopenProject: FinanceState["reopenProject"] = (projectId) => {
    const p0 = projects.find((p) => p.id === projectId);
    if (p0?.completedAt && isLocked(p0.completedAt)) return;
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId ? { ...p, status: "ONGOING", completedAt: undefined } : p,
      ),
    );
  };

  const archiveProject: FinanceState["archiveProject"] = (projectId, archived) => {
    setProjects((prev) => prev.map((p) => (p.id === projectId ? { ...p, archived } : p)));
  };

  const deleteProject: FinanceState["deleteProject"] = (id) => {
    const hasData =
      transactions.some((t) => t.projectId === id) ||
      supports.some((s) => s.fromProjectId === id || s.toProjectId === id);
    if (hasData) return false;
    setProjects((prev) => prev.filter((p) => p.id !== id));
    return true;
  };

  // ---------- Pengeluaran & transfer ----------

  const addExpense: FinanceState["addExpense"] = (
    account,
    amount,
    description,
    category,
    projectId,
    date = Date.now(),
  ) => {
    if (isLocked(date)) return;
    setTransactions((prev) => [
      {
        id: generateId(),
        date,
        createdAt: Date.now(),
        description,
        type: "EXPENSE",
        amount,
        expenseAccount: account,
        expenseCategory: category,
        projectId,
      },
      ...prev,
    ]);
  };

  const addTransfer: FinanceState["addTransfer"] = (
    from,
    to,
    amount,
    description,
    date = Date.now(),
    projectId,
  ) => {
    if (from === to || isLocked(date)) return;
    setTransactions((prev) => [
      {
        id: generateId(),
        date,
        createdAt: Date.now(),
        description: description || `Transfer ${from} → ${to}`,
        type: "TRANSFER",
        amount,
        fromAccount: from,
        toAccount: to,
        projectId,
      },
      ...prev,
    ]);
  };

  // ---------- Talangan ----------

  const addSupport: FinanceState["addSupport"] = (
    fromProjectId,
    fromProjectName,
    toProjectId,
    toProjectName,
    amount,
    description,
    account = "REK2",
    date = Date.now(),
    toAccount,
  ) => {
    if (isLocked(date)) return;
    const supportId = generateId();
    const destAccount = toAccount || account;
    const newSupport: ProjectSupport = {
      id: supportId,
      fromProjectId,
      fromProjectName,
      toProjectId,
      toProjectName,
      amount,
      description,
      date,
      status: "OUTSTANDING",
      account,
      toAccount: destAccount,
    };
    // Talangan antarproyek di Rek 2 hanya memindah "jatah" (saldo rekening tetap);
    // talangan dari Rek 3/Rek 4 benar-benar memindahkan uang ke Rek 2.
    const lenderExpense: Transaction = {
      id: generateId(),
      date,
      createdAt: Date.now(),
      description: `Talangan Keluar: untuk ${toProjectName} (${description})`,
      type: "EXPENSE",
      amount,
      expenseAccount: account,
      expenseCategory: "Subsidi Silang / Talangan Antar Proyek",
      projectId: fromProjectId,
      supportId,
    };
    const borrowerIncome: Transaction = {
      id: generateId(),
      date,
      createdAt: Date.now(),
      description: `Penerimaan Talangan: dari ${fromProjectName} (${description})`,
      type: "INCOME",
      amount,
      projectId: toProjectId,
      account: destAccount,
      supportId,
    };
    setSupports((prev) => [newSupport, ...prev]);
    setTransactions((prev) => [borrowerIncome, lenderExpense, ...prev]);
  };

  const settleSupport: FinanceState["settleSupport"] = (supportId, date = Date.now()) => {
    const sup = supports.find((s) => s.id === supportId);
    if (!sup || sup.status === "RETURNED" || isLocked(date)) return;
    setSupports((prev) =>
      prev.map((s) => (s.id === supportId ? { ...s, status: "RETURNED", returnedAt: date } : s)),
    );
    setTransactions((prev) => [...settleSupportTx(sup, date), ...prev]);
  };

  const deleteSupport: FinanceState["deleteSupport"] = (supportId) => {
    if (transactions.some((t) => t.supportId === supportId && isLocked(t.date))) return;
    setSupports((prev) => prev.filter((s) => s.id !== supportId));
    setTransactions((prev) => prev.filter((t) => t.supportId !== supportId));
  };

  // ---------- Rekonsiliasi saldo ----------

  const adjustBalance: FinanceState["adjustBalance"] = (account, newBalance) => {
    const current = computeBalances(transactions)[account];
    const diff = Math.round(newBalance - current);
    if (diff === 0) return;
    const base = {
      id: generateId(),
      date: Date.now(),
      createdAt: Date.now(),
      description: `Penyesuaian Saldo Manual (${account})`,
      amount: Math.abs(diff),
      isAdjustment: true,
    };
    const tx: Transaction =
      diff > 0
        ? { ...base, type: "INCOME", account }
        : { ...base, type: "EXPENSE", expenseAccount: account, expenseCategory: "Penyesuaian Manual" };
    setTransactions((prev) => [tx, ...prev]);
  };

  // ---------- Edit / hapus transaksi ----------

  const deleteTransaction: FinanceState["deleteTransaction"] = (id) => {
    // Menghapus uang masuk juga menghapus transfer alokasinya
    const t0 = transactions.find((t) => t.id === id);
    if (!t0 || isLocked(t0.date)) return;
    setTransactions((prev) => prev.filter((t) => t.id !== id && t.parentId !== id));
  };

  const updateTransaction: FinanceState["updateTransaction"] = (id, data) => {
    setTransactions((prev) => {
      const orig = prev.find((t) => t.id === id);
      if (!orig || isLocked(orig.date) || (data.date !== undefined && isLocked(data.date))) return prev;
      const amountChanged =
        data.amount !== undefined && data.amount !== orig.amount && orig.amount > 0;
      const ratio = amountChanged ? (data.amount as number) / orig.amount : 1;
      return prev.map((t) => {
        if (t.id === id) return { ...t, ...data };
        // Transfer alokasi ikut menyesuaikan (proporsional) & ikut tanggal induknya
        if (t.parentId === id) {
          return {
            ...t,
            amount: amountChanged ? Math.round(t.amount * ratio) : t.amount,
            date: data.date ?? t.date,
          };
        }
        return t;
      });
    });
  };

  // ---------- Tutup buku ----------

  const currentPeriod = useMemo(() => periodOfTs(Date.now()), []);

  const closePeriod: FinanceState["closePeriod"] = (key) => {
    const [y, m] = key.split("-").map(Number);
    const p = periodInfo(y, m);
    if (p.end.getTime() >= periodOfTs(Date.now()).start.getTime()) {
      return { ok: false, message: `Periode ${p.label} belum selesai (cut-off ${p.end.getDate()} ${p.label}).` };
    }
    if (settings.closedThrough) {
      const [cy, cm] = settings.closedThrough.split("-").map(Number);
      const next = shiftPeriod(periodInfo(cy, cm), 1);
      if (key !== next.key) return { ok: false, message: `Tutup buku harus berurutan. Periode berikutnya: ${next.label}.` };
    }
    const pend = transactions.filter((t) => t.pending && inPeriod(p, t.date)).length;
    if (pend > 0) {
      return { ok: false, message: `Masih ada ${pend} arahan transfer di periode ${p.label} yang belum dikonfirmasi.` };
    }
    setSettings((prev) => ({ ...prev, closedThrough: key }));
    return { ok: true, message: `Periode ${p.label} sudah tutup buku.` };
  };

  const reopenPeriod = () => {
    if (!settings.closedThrough) return;
    const [cy, cm] = settings.closedThrough.split("-").map(Number);
    const p = periodInfo(cy, cm);
    const prev = shiftPeriod(p, -1);
    setSettings((s) => ({ ...s, closedThrough: s.closedThrough === p.key ? prev.key : s.closedThrough }));
  };

  // ---------- Backup ----------

  const exportData = (): BackupData => ({
    app: "seven-interior-finance",
    version: 2,
    exportedAt: Date.now(),
    projects,
    transactions,
    supports,
    settings,
  });

  const importData: FinanceState["importData"] = (data) => {
    const d = data as Partial<BackupData>;
    if (!d || !Array.isArray(d.projects) || !Array.isArray(d.transactions)) {
      return { ok: false, message: "File backup tidak valid." };
    }
    const tx = needsMigration(d.transactions) ? migrateTransactions(d.transactions) : d.transactions;
    setProjects(d.projects);
    setTransactions(tx);
    setSupports(Array.isArray(d.supports) ? d.supports : []);
    if (d.settings) updateSettings(d.settings);
    return {
      ok: true,
      message: `Berhasil memulihkan ${d.projects.length} proyek dan ${tx.length} transaksi.`,
    };
  };

  // ---------- Perhitungan ----------

  const isInPeriod = useMemo(() => {
    return (ts: number) => {
      const now = new Date();
      const d = new Date(ts);
      if (filterPeriod === "THIS_CUTOFF") return inPeriod(periodOfTs(now.getTime()), ts);
      if (filterPeriod === "LAST_CUTOFF") return inPeriod(shiftPeriod(periodOfTs(now.getTime()), -1), ts);
      if (filterPeriod === "7_DAYS") {
        return (now.getTime() - d.getTime()) / (1000 * 3600 * 24) <= 7;
      } else if (filterPeriod === "THIS_MONTH") {
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      } else if (filterPeriod === "6_MONTHS") {
        return d >= new Date(now.getFullYear(), now.getMonth() - 5, 1);
      } else if (filterPeriod === "THIS_YEAR") {
        return d.getFullYear() === now.getFullYear();
      }
      return true;
    };
  }, [filterPeriod]);

  const sortedTransactions = useMemo(
    () => [...transactions].sort((a, b) => b.date - a.date || (b.createdAt || 0) - (a.createdAt || 0)),
    [transactions],
  );

  const filteredTransactions = useMemo(
    () => sortedTransactions.filter((t) => isInPeriod(t.date)),
    [sortedTransactions, isInPeriod],
  );

  const activeProjects = useMemo(() => projects.filter((p) => !p.archived), [projects]);

  const balances = useMemo(() => {
    const b = computeBalances(transactions);
    // "Bulan ini" = periode cut-off berjalan (26 -> 25)
    const thisMonth = transactions.filter((t) => inPeriod(currentPeriod, t.date));
    return {
      rek1: b.REK1,
      rek2: b.REK2,
      rek3: b.REK3,
      rek4: b.REK4,
      totalOmset: transactions.filter(isRealIncome).reduce((s, t) => s + t.amount, 0),
      opexCollectedThisMonth: inflowTo(thisMonth, "REK3"),
      totalPiutangPelunasan: activeProjects.reduce(
        (s, p) => s + summarizeProject(p, transactions).outstanding,
        0,
      ),
      totalOutstandingSupport: supports
        .filter((s) => s.status === "OUTSTANDING")
        .reduce((sum, s) => sum + s.amount, 0),
    };
  }, [transactions, supports, activeProjects, currentPeriod]);

  const pendingTransfers = useMemo(
    () => sortedTransactions.filter((t) => t.pending),
    [sortedTransactions],
  );

  const debt = useMemo(
    () => summarizeDebt(projects, transactions, supports, settings.shares),
    [projects, transactions, supports, settings.shares],
  );
  const marketTarget = useMemo(
    () => computeMarketTarget(settings, debt.totalHole, projects, periodCapacity(currentPeriod, settings)),
    [settings, debt.totalHole, projects, currentPeriod],
  );

  const filteredBalances = useMemo(
    () => ({
      totalOmset: filteredTransactions.filter(isRealIncome).reduce((s, t) => s + t.amount, 0),
      opexCollected: inflowTo(filteredTransactions, "REK3"),
    }),
    [filteredTransactions],
  );

  return (
    <FinanceContext.Provider
      value={{
        projects,
        activeProjects,
        transactions: sortedTransactions,
        filteredTransactions,
        supports,
        filterPeriod,
        setFilterPeriod,
        isInPeriod,
        settings,
        updateSettings,
        debt,
        marketTarget,
        setDebtStatus,
        fundFromRecovery,
        addProject,
        updateProject,
        setProjectPlan,
        pendingTransfers,
        confirmTransfers,
        currentPeriod,
        isLocked,
        closePeriod,
        reopenPeriod,
        receivePayment,
        completeProject,
        reopenProject,
        archiveProject,
        deleteProject,
        addExpense,
        addTransfer,
        addSupport,
        settleSupport,
        deleteSupport,
        balances,
        filteredBalances,
        deleteTransaction,
        updateTransaction,
        adjustBalance,
        needsReconcile,
        dismissReconcile,
        exportData,
        importData,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinance() {
  const context = useContext(FinanceContext);
  if (context === undefined) {
    throw new Error("useFinance must be used within a FinanceProvider");
  }
  return context;
}
