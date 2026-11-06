import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
  useMemo,
} from "react";
import {
  AuditEntry,
  Project,
  Role,
  LossCause,
  Transaction,
  RekeningType,
  FilterPeriod,
  ProjectSupport,
  IncomeType,
  FinanceSettings,
  DEFAULT_SETTINGS,
  ProjectCategory,
  PaymentScheme,
  AuditAction,
} from "../types";
import { buildPlan } from "../plan";
import { LoadingScreen } from "../components/LoginScreen";
import { PeriodInfo, inPeriod, periodCapacity, periodInfo, periodOfTs, shiftPeriod } from "../calendar";
import { formatRupiah, generateId } from "../utils";
import { useAuth } from "../auth/AuthContext";
import { firebaseEnabled } from "../firebase";
import { Action, ACTION_DENIED, roleCan } from "../permissions";
import { useCollectionSync, useDocSync } from "./sync";
import {
  appendAudit,
  appendSettingsAudit,
  diffFields,
  makeAuditEntry,
  mergeAudit,
  snapshotTx,
} from "../audit";
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
  buildOpeningTransactions,
} from "../finance";

const KEY_PROJECTS = "seven_interior_projects_v3";
const KEY_TRANSACTIONS = "seven_interior_transactions_v3";
const KEY_SUPPORTS = "seven_interior_supports_v1";
const KEY_RECONCILE = "seven_interior_needs_reconcile";
const KEY_BACKUP_V1 = "seven_interior_backup_pre_v2";
const KEY_SETTINGS = "seven_interior_settings_v1";
const KEY_AUDIT = "seven_interior_audit_v1";

function mergeSettings(saved: Partial<FinanceSettings> | undefined): FinanceSettings {
  const sv = saved || {};
  return {
    ...DEFAULT_SETTINGS,
    ...sv,
    shares: { ...DEFAULT_SETTINGS.shares, ...(sv.shares || {}) },
  };
}

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
  evidenceUrl?: string; // link bukti transfer klien
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
  audit?: AuditEntry[]; // log aktivitas; digabung (bukan ditimpa) saat pemulihan
}

interface FinanceState {
  // ---- Pengguna, peran, dan sinkronisasi ----
  actor: { name: string; role: Role; email: string };
  can: (action: Action) => boolean;
  syncMode: "firebase" | "local";
  syncError?: string;
  legacyAvailable: boolean; // ada data lama di browser ini yang bisa diunggah ke penyimpanan online
  importLegacyLocal: () => { ok: boolean; message: string };
  // ---- Audit, bukti, persetujuan ----
  voidedTransactions: Transaction[];
  voidTransaction: (id: string, reason: string) => { ok: boolean; message: string };
  pendingApprovals: Transaction[]; // pengeluaran menunggu / ditolak owner
  approveExpense: (id: string, note?: string) => void;
  rejectExpense: (id: string, note: string) => void;
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
    evidenceUrl?: string,
    extra?: { lossCause?: LossCause; overCap?: boolean },
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
  updateTransaction: (id: string, data: Partial<Transaction>) => void;
  adjustBalance: (account: RekeningType, newBalance: number, reason?: string) => void;
  needsReconcile: boolean;
  dismissReconcile: () => void;
  exportData: () => BackupData;
  importData: (data: unknown) => { ok: boolean; message: string };
  audit: AuditEntry[];
  setOpeningBalances: (
    date: number,
    targets: Record<RekeningType, number>,
  ) => { ok: boolean; message: string };
}

const FinanceContext = createContext<FinanceState | undefined>(undefined);

export function FinanceProvider({ children }: { children: ReactNode }) {
  const authUser = useAuth().user as NonNullable<ReturnType<typeof useAuth>["user"]>;
  const actor = useMemo(
    () => ({ name: authUser.name, role: authUser.role, email: authUser.email }),
    [authUser.name, authUser.role, authUser.email],
  );
  const can = (action: Action) => roleCan(actor.role, action);
  try {
    sessionStorage.setItem("seven_actor", actor.name);
    sessionStorage.setItem("seven_role", actor.role);
  } catch {
    /* abaikan */
  }

  const [projects, setProjects] = useState<Project[]>(() => (firebaseEnabled ? [] : readJson(KEY_PROJECTS, [])));

  const [needsReconcile, setNeedsReconcile] = useState<boolean>(
    () => !firebaseEnabled && localStorage.getItem(KEY_RECONCILE) === "true",
  );

  // Semua transaksi termasuk yang dibatalkan (void). Yang dibatalkan tidak ikut perhitungan.
  const [rawTx, setRawTx] = useState<Transaction[]>(() => {
    if (firebaseEnabled) return [];
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

  // Data lama di browser ini (sebelum penyimpanan online), ditawarkan untuk diunggah sekali.
  const legacyRef = useRef<{
    projects: Project[];
    transactions: Transaction[];
    supports: ProjectSupport[];
    settings: FinanceSettings;
  } | null>(null);
  if (firebaseEnabled && legacyRef.current === null) {
    const lp = readJson<Project[]>(KEY_PROJECTS, []);
    const lt = readJson<Transaction[]>(KEY_TRANSACTIONS, []);
    if (lp.length > 0 || lt.length > 0) {
      legacyRef.current = {
        projects: lp,
        transactions: needsMigration(lt) ? migrateTransactions(lt) : lt,
        supports: readJson<ProjectSupport[]>(KEY_SUPPORTS, []),
        settings: mergeSettings(readJson<Partial<FinanceSettings>>(KEY_SETTINGS, {})),
      };
    }
  }

  const [supports, setSupports] = useState<ProjectSupport[]>(() =>
    firebaseEnabled ? [] : readJson(KEY_SUPPORTS, []),
  );
  const [audit, setAudit] = useState<AuditEntry[]>(() => (firebaseEnabled ? [] : readJson(KEY_AUDIT, [])));

  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>("THIS_CUTOFF");
  const [settings, setSettings] = useState<FinanceSettings>(() =>
    mergeSettings(firebaseEnabled ? undefined : readJson<Partial<FinanceSettings>>(KEY_SETTINGS, {})),
  );

  // ---------- Sinkronisasi online ----------
  const projSync = useCollectionSync<Project>({
    name: "projects",
    items: projects,
    setItems: setProjects,
    enabled: firebaseEnabled,
    canWrite: true,
    sort: (a, b) => b.createdAt - a.createdAt,
  });
  const txSync = useCollectionSync<Transaction>({
    name: "transactions",
    items: rawTx,
    setItems: setRawTx,
    enabled: firebaseEnabled,
    canWrite: true,
  });
  const supSync = useCollectionSync<ProjectSupport>({
    name: "supports",
    items: supports,
    setItems: setSupports,
    enabled: firebaseEnabled,
    canWrite: true,
    sort: (a, b) => b.date - a.date,
  });
  const auditSync = useCollectionSync<AuditEntry>({
    name: "auditLog",
    items: audit,
    setItems: setAudit,
    enabled: firebaseEnabled,
    canWrite: true,
    sort: (a, b) => b.at - a.at,
    recent: { field: "at", max: 1000 },
  });
  const settingsSync = useDocSync<FinanceSettings>({
    path: ["config", "settings"],
    value: settings,
    setValue: (raw) => setSettings(mergeSettings(raw as Partial<FinanceSettings> | undefined)),
    enabled: firebaseEnabled,
    canWrite: roleCan(actor.role, "editSettings"),
  });
  const syncReady =
    !firebaseEnabled ||
    (projSync.hydrated && txSync.hydrated && supSync.hydrated && auditSync.hydrated && settingsSync.hydrated);
  const syncError = projSync.error || txSync.error || supSync.error || auditSync.error || settingsSync.error;

  // ---------- Jejak audit ----------
  const denied = (action: Action) => {
    window.alert(ACTION_DENIED[action]);
  };

  // Setiap transaksi baru diberi nama penginput; yang diubah diberi nama pengubah.
  const stamp = (prev: Transaction[], next: Transaction[]): Transaction[] => {
    const before = new Map(prev.map((t) => [t.id, t]));
    const now = Date.now();
    return next.map((t) => {
      const old = before.get(t.id);
      if (!old) return t.createdBy ? t : { ...t, createdBy: actor.name };
      if (old === t) return t;
      return { ...t, updatedBy: actor.name, updatedAt: now };
    });
  };
  const setTransactions = (updater: (prev: Transaction[]) => Transaction[]) =>
    setRawTx((prev) => stamp(prev, updater(prev)));

  const transactions = useMemo(() => rawTx.filter((t) => !t.voided), [rawTx]);
  const voidedTransactions = useMemo(
    () => rawTx.filter((t) => t.voided).sort((a, b) => (b.voidedAt || 0) - (a.voidedAt || 0)),
    [rawTx],
  );

  const logAudit = (
    action: AuditAction,
    summary: string,
    extra?: { target?: string; before?: Record<string, unknown>; after?: Record<string, unknown> },
  ) => {
    const entry = makeAuditEntry(action, summary, extra);
    setAudit((prev) => appendAudit(prev, entry));
  };

  const updateSettings: FinanceState["updateSettings"] = (data) => {
    if (!can("editSettings")) return denied("editSettings");
    const before: Record<string, unknown> = {};
    const after: Record<string, unknown> = {};
    for (const k of Object.keys(data) as (keyof FinanceSettings)[]) {
      if (JSON.stringify(settings[k]) !== JSON.stringify(data[k])) {
        before[k] = settings[k];
        after[k] = data[k];
      }
    }
    if (Object.keys(after).length > 0) {
      const entry = makeAuditEntry("SETTINGS", `Pengaturan diubah: ${Object.keys(after).join(", ")}`, { before, after });
      setAudit((prev) => appendSettingsAudit(prev, entry));
    }
    setSettings((prev) => ({ ...prev, ...data, shares: { ...prev.shares, ...(data.shares || {}) } }));
  };

  // Periode yang sudah tutup buku tidak boleh berubah lagi
  const isLocked = (ts: number) => !!settings.closedThrough && periodOfTs(ts).key <= settings.closedThrough;

  useEffect(() => {
    // Status ini bisa diset saat migrasi di inisialisasi state transaksi
    if (!firebaseEnabled && localStorage.getItem(KEY_RECONCILE) === "true") setNeedsReconcile(true);
  }, []);

  // Penyimpanan lokal hanya dipakai pada mode lokal (tanpa Firebase)
  useEffect(() => {
    if (!firebaseEnabled) localStorage.setItem(KEY_PROJECTS, JSON.stringify(projects));
  }, [projects]);
  useEffect(() => {
    if (!firebaseEnabled) localStorage.setItem(KEY_TRANSACTIONS, JSON.stringify(rawTx));
  }, [rawTx]);
  useEffect(() => {
    if (!firebaseEnabled) localStorage.setItem(KEY_SUPPORTS, JSON.stringify(supports));
  }, [supports]);
  useEffect(() => {
    if (!firebaseEnabled) localStorage.setItem(KEY_SETTINGS, JSON.stringify(settings));
  }, [settings]);
  useEffect(() => {
    if (firebaseEnabled) return;
    try {
      localStorage.setItem(KEY_AUDIT, JSON.stringify(audit.slice(0, 1000)));
    } catch {
      /* penyimpanan penuh: jejak tidak boleh menghentikan pencatatan keuangan */
    }
  }, [audit]);

  const dismissReconcile = () => {
    if (!firebaseEnabled) localStorage.removeItem(KEY_RECONCILE);
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
      evidenceUrl: input.evidenceUrl?.trim() || undefined,
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
    logAudit("PROJECT_ADD", `Proyek baru: ${name} (${formatRupiah(totalValue)})`, {
      after: { name, totalValue, dp: firstPayment?.amount ?? 0 },
    });
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
    logAudit("TRANSFER_CONFIRM", `${ids.length} arahan transfer dikonfirmasi`, {
      after: { ids: ids.length, date },
    });
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
    logAudit("PAYMENT", `${project.name}: ${input.incomeType} ${formatRupiah(input.amount)}`, {
      target: project.id,
      after: { amount: input.amount, incomeType: input.incomeType, date: input.date, allocate: input.allocate },
    });
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
    const proj = projects.find((p) => p.id === projectId);
    logAudit("PROJECT_STATUS", `Serah terima proyek: ${proj?.name ?? projectId}`, {
      target: projectId,
      before: { status: proj?.status },
      after: { status: "COMPLETED", completedAt: date },
    });
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, status: "COMPLETED", completedAt: date } : p)),
    );
  };

  const reopenProject: FinanceState["reopenProject"] = (projectId) => {
    const p0 = projects.find((p) => p.id === projectId);
    if (p0?.completedAt && isLocked(p0.completedAt)) return;
    logAudit("PROJECT_STATUS", `Serah terima dibatalkan: ${p0?.name ?? projectId}`, {
      target: projectId,
      before: { status: p0?.status, completedAt: p0?.completedAt },
      after: { status: "ONGOING" },
    });
    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId ? { ...p, status: "ONGOING", completedAt: undefined } : p,
      ),
    );
  };

  const archiveProject: FinanceState["archiveProject"] = (projectId, archived) => {
    if (!can("archiveProject")) return denied("archiveProject");
    const pa = projects.find((p) => p.id === projectId);
    logAudit("PROJECT_STATUS", `${archived ? "Arsip" : "Buka arsip"} proyek: ${pa?.name ?? projectId}`, {
      target: projectId,
      before: { archived: !!pa?.archived },
      after: { archived },
    });
    setProjects((prev) => prev.map((p) => (p.id === projectId ? { ...p, archived } : p)));
  };

  const deleteProject: FinanceState["deleteProject"] = (id) => {
    const hasData =
      transactions.some((t) => t.projectId === id) ||
      supports.some((s) => s.fromProjectId === id || s.toProjectId === id);
    if (hasData) return false;
    if (!can("deleteProject")) {
      denied("deleteProject");
      return false;
    }
    const pd = projects.find((p) => p.id === id);
    logAudit("PROJECT_DELETE", `Hapus proyek: ${pd?.name ?? id}`, {
      target: id,
      before: { name: pd?.name, totalValue: pd?.totalValue },
    });
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
    evidenceUrl,
    extra,
  ) => {
    if (isLocked(date)) return;
    logAudit("TX_ADD", `Biaya ${formatRupiah(amount)}: ${description}`, {
      after: snapshotTx({ type: "EXPENSE", amount, description, expenseCategory: category, expenseAccount: account, projectId, date, evidenceUrl, ...extra }),
    });
    // Pengeluaran besar dan prive/dividen perlu persetujuan owner (owner sendiri otomatis disetujui)
    const isWithdrawal = category.includes("Prive") || category.startsWith("Profit");
    const needsApproval = amount > settings.approvalLimit || isWithdrawal;
    const byOwner = actor.role === "OWNER";
    const now = Date.now();
    setTransactions((prev) => [
      {
        id: generateId(),
        date,
        createdAt: now,
        description,
        type: "EXPENSE",
        amount,
        expenseAccount: account,
        expenseCategory: category,
        projectId,
        evidenceUrl: evidenceUrl?.trim() || undefined,
        approval: needsApproval ? (byOwner ? "APPROVED" : "PENDING") : undefined,
        approvedBy: needsApproval && byOwner ? actor.name : undefined,
        approvedAt: needsApproval && byOwner ? now : undefined,
        ...(extra?.lossCause ? { lossCause: extra.lossCause } : {}),
        ...(extra?.overCap ? { overCap: true } : {}),
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
    logAudit("TX_ADD", `Transfer ${from} → ${to} ${formatRupiah(amount)}`, {
      after: snapshotTx({ type: "TRANSFER", amount, description, fromAccount: from, toAccount: to, projectId, date }),
    });
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
    logAudit("SUPPORT", `Talangan ${formatRupiah(amount)}: ${fromProjectName} → ${toProjectName}`, {
      after: { amount, from: fromProjectName, to: toProjectName, date },
    });
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
    logAudit("SUPPORT", `Talangan dikembalikan ${formatRupiah(sup.amount)}: ${sup.toProjectName} → ${sup.fromProjectName}`, {
      target: supportId,
      before: { status: sup.status },
      after: { status: "RETURNED", date },
    });
    setSupports((prev) =>
      prev.map((s) => (s.id === supportId ? { ...s, status: "RETURNED", returnedAt: date } : s)),
    );
    setTransactions((prev) => [...settleSupportTx(sup, date), ...prev]);
  };

  const deleteSupport: FinanceState["deleteSupport"] = (supportId) => {
    if (!can("void")) return denied("void");
    if (transactions.some((t) => t.supportId === supportId && isLocked(t.date))) return;
    const sup = supports.find((s) => s.id === supportId);
    const now = Date.now();
    logAudit("SUPPORT", `Talangan dihapus: ${sup ? `${sup.fromProjectName} → ${sup.toProjectName}` : supportId}`, {
      target: supportId,
      before: sup ? { amount: sup.amount, status: sup.status } : undefined,
    });
    setSupports((prev) => prev.filter((s) => s.id !== supportId));
    // Transaksi talangan dibatalkan (void), tidak dihapus, agar jejaknya tetap ada
    setTransactions((prev) =>
      prev.map((t) =>
        t.supportId === supportId && !t.voided
          ? { ...t, voided: true, voidReason: "Talangan dihapus", voidedBy: actor.name, voidedAt: now }
          : t,
      ),
    );
  };

  // ---------- Rekonsiliasi saldo ----------

  const adjustBalance: FinanceState["adjustBalance"] = (account, newBalance, reason) => {
    const current = computeBalances(transactions)[account];
    const diff = Math.round(newBalance - current);
    if (diff === 0) return;
    logAudit("BALANCE_ADJUST", `Penyesuaian saldo ${account}: ${formatRupiah(current)} → ${formatRupiah(newBalance)}${reason ? ` · ${reason}` : ""}`, {
      before: { account, saldo: current },
      after: { account, saldo: newBalance, selisih: diff, ...(reason ? { alasan: reason } : {}) },
    });
    const base = {
      id: generateId(),
      date: Date.now(),
      createdAt: Date.now(),
      description: `Penyesuaian Saldo Manual (${account})${reason ? ` - ${reason}` : ""}`,
      amount: Math.abs(diff),
      isAdjustment: true,
    };
    const tx: Transaction =
      diff > 0
        ? { ...base, type: "INCOME", account }
        : { ...base, type: "EXPENSE", expenseAccount: account, expenseCategory: "Penyesuaian Manual" };
    setTransactions((prev) => [tx, ...prev]);
  };

  // ---------- Edit / batalkan transaksi ----------

  const voidTransaction: FinanceState["voidTransaction"] = (id, reason) => {
    if (!can("void")) return { ok: false, message: ACTION_DENIED.void };
    const why = reason.trim();
    if (why.length < 5) return { ok: false, message: "Alasan pembatalan wajib diisi (minimal 5 karakter)." };
    const t0 = transactions.find((t) => t.id === id);
    if (!t0) return { ok: false, message: "Transaksi tidak ditemukan atau sudah dibatalkan." };
    if (isLocked(t0.date)) return { ok: false, message: "Transaksi ada di periode yang sudah tutup buku." };
    if (t0.supportId) return { ok: false, message: "Transaksi talangan dikelola dari menu Talangan." };
    const now = Date.now();
    // Membatalkan uang masuk ikut membatalkan transfer alokasinya
    setTransactions((prev) =>
      prev.map((t) =>
        (t.id === id || t.parentId === id) && !t.voided
          ? { ...t, voided: true, voidReason: why, voidedBy: actor.name, voidedAt: now }
          : t,
      ),
    );
    logAudit("TX_VOID", `Batalkan ${formatRupiah(t0.amount)}: ${t0.description} · alasan: ${why}`, {
      target: id,
      before: snapshotTx(t0),
      after: { voided: true, voidReason: why },
    });
    return { ok: true, message: "Transaksi dibatalkan dan tercatat di log." };
  };

  const updateTransaction: FinanceState["updateTransaction"] = (id, data) => {
    const orig0 = transactions.find((t) => t.id === id);
    if (orig0 && !isLocked(orig0.date) && !(data.date !== undefined && isLocked(data.date))) {
      const d = diffFields(snapshotTx(orig0), snapshotTx({ ...orig0, ...data }));
      if (Object.keys(d.after).length > 0) {
        logAudit("TX_EDIT", `Ubah transaksi: ${orig0.description}`, { target: id, before: d.before, after: d.after });
      }
    }
    setTransactions((prev) => {
      const orig = prev.find((t) => t.id === id);
      if (!orig || orig.voided || isLocked(orig.date) || (data.date !== undefined && isLocked(data.date))) return prev;
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

  // ---------- Saldo pembukaan ----------

  const setOpeningBalances: FinanceState["setOpeningBalances"] = (date, targets) => {
    if (!can("editSettings")) return { ok: false, message: "Saldo pembukaan hanya dapat diisi oleh Owner." };
    if (isLocked(date)) {
      return { ok: false, message: "Tanggal pembukaan masuk periode yang sudah tutup buku." };
    }
    const opening = buildOpeningTransactions(transactions, targets, date);
    const before = computeBalances(transactions.filter((t) => !t.isOpening));
    // Saldo pembukaan lama dibatalkan (bukan dihapus) agar tetap tercatat dan bisa ditelusuri
    const nowTs = Date.now();
    setTransactions((prev) => [
      ...opening,
      ...prev.map((t) =>
        t.isOpening && !t.voided
          ? { ...t, voided: true, voidReason: "Diganti saldo pembukaan baru", voidedBy: actor.name, voidedAt: nowTs }
          : t,
      ),
    ]);
    setSettings((prev) => ({ ...prev, openingDate: date }));
    logAudit("OPENING_BALANCE", `Saldo pembukaan diisi (${opening.length} rekening disesuaikan)`, {
      before: { saldoAplikasi: before },
      after: { saldoBank: targets, tanggal: date },
    });
    return {
      ok: true,
      message:
        opening.length === 0
          ? "Saldo aplikasi sudah sama dengan saldo bank. Tidak ada penyesuaian."
          : `Saldo pembukaan tersimpan; ${opening.length} rekening disesuaikan.`,
    };
  };

  // ---------- Tutup buku ----------

  const currentPeriod = useMemo(() => periodOfTs(Date.now()), []);

  const closePeriod: FinanceState["closePeriod"] = (key) => {
    if (!can("closePeriod")) return { ok: false, message: ACTION_DENIED.closePeriod };
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
    const approvalsOpen = transactions.filter(
      (t) => (t.approval === "PENDING" || t.approval === "REJECTED") && inPeriod(p, t.date),
    ).length;
    if (approvalsOpen > 0) {
      return {
        ok: false,
        message: `Masih ada ${approvalsOpen} pengeluaran di periode ${p.label} yang belum disetujui owner (atau ditolak dan belum dikoreksi).`,
      };
    }
    logAudit("PERIOD_CLOSE", `Tutup buku periode ${p.label}`, {
      before: { closedThrough: settings.closedThrough },
      after: { closedThrough: key },
    });
    setSettings((prev) => ({ ...prev, closedThrough: key }));
    return { ok: true, message: `Periode ${p.label} sudah tutup buku.` };
  };

  const reopenPeriod = () => {
    if (!can("reopenPeriod")) return denied("reopenPeriod");
    if (!settings.closedThrough) return;
    const [cy, cm] = settings.closedThrough.split("-").map(Number);
    const p = periodInfo(cy, cm);
    const prev = shiftPeriod(p, -1);
    logAudit("PERIOD_REOPEN", `Periode ${p.label} dibuka kembali`, {
      before: { closedThrough: settings.closedThrough },
      after: { closedThrough: prev.key },
    });
    setSettings((s) => ({ ...s, closedThrough: s.closedThrough === p.key ? prev.key : s.closedThrough }));
  };

  // ---------- Backup ----------

  const exportData = (): BackupData => ({
    app: "seven-interior-finance",
    version: 2,
    exportedAt: Date.now(),
    projects,
    transactions: rawTx,
    supports,
    settings,
    audit,
  });

  const importData: FinanceState["importData"] = (data) => {
    if (!can("restore")) return { ok: false, message: ACTION_DENIED.restore };
    const d = data as Partial<BackupData>;
    if (!d || !Array.isArray(d.projects) || !Array.isArray(d.transactions)) {
      return { ok: false, message: "File backup tidak valid." };
    }
    const tx = needsMigration(d.transactions) ? migrateTransactions(d.transactions) : d.transactions;
    setProjects(d.projects);
    setRawTx(tx);
    setSupports(Array.isArray(d.supports) ? d.supports : []);
    logAudit("IMPORT", `Backup dipulihkan: ${d.projects.length} proyek, ${tx.length} transaksi`, {
      after: { proyek: d.projects.length, transaksi: tx.length },
    });
    if (Array.isArray(d.audit)) setAudit((prev) => mergeAudit(prev, d.audit as AuditEntry[]));
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

  const pendingApprovals = useMemo(
    () => sortedTransactions.filter((t) => t.approval === "PENDING" || t.approval === "REJECTED"),
    [sortedTransactions],
  );

  const decideExpense = (id: string, decision: "APPROVED" | "REJECTED", note?: string) => {
    if (!can("approve")) return denied("approve");
    const t0 = transactions.find((t) => t.id === id);
    if (!t0 || !t0.approval) return;
    const now = Date.now();
    setTransactions((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, approval: decision, approvedBy: actor.name, approvedAt: now, approvalNote: note || undefined } : t,
      ),
    );
    logAudit(decision === "APPROVED" ? "TX_APPROVE" : "TX_REJECT", `${t0.description} · ${formatRupiah(t0.amount)}${note ? ` · ${note}` : ""}`, {
      target: id,
      after: { approval: decision },
    });
  };
  const approveExpense: FinanceState["approveExpense"] = (id, note) => decideExpense(id, "APPROVED", note);
  const rejectExpense: FinanceState["rejectExpense"] = (id, note) => decideExpense(id, "REJECTED", note);

  // Unggah data lama dari browser ini ke penyimpanan online (sekali, oleh owner, saat server masih kosong)
  const legacyAvailable =
    firebaseEnabled &&
    syncReady &&
    !!legacyRef.current &&
    projects.length === 0 &&
    rawTx.length === 0 &&
    supports.length === 0 &&
    can("restore");
  const importLegacyLocal: FinanceState["importLegacyLocal"] = () => {
    const legacy = legacyRef.current;
    if (!legacy || !can("restore")) return { ok: false, message: "Tidak ada data lama yang bisa diunggah." };
    if (projects.length > 0 || rawTx.length > 0) return { ok: false, message: "Penyimpanan online sudah berisi data." };
    setProjects(legacy.projects);
    setRawTx(legacy.transactions);
    setSupports(legacy.supports);
    setSettings(legacy.settings);
    logAudit("LEGACY_UPLOAD", `Data lama diunggah: ${legacy.projects.length} proyek, ${legacy.transactions.length} transaksi`);
    legacyRef.current = null;
    return {
      ok: true,
      message: `Berhasil mengunggah ${legacy.projects.length} proyek dan ${legacy.transactions.length} transaksi.`,
    };
  };

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

  if (!syncReady) {
    if (syncError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="max-w-md bg-white border border-rose-200 rounded-2xl p-6 text-sm text-slate-700">
            <p className="font-bold text-rose-700 mb-2">Data keuangan belum bisa dimuat</p>
            <p className="break-words">{syncError}</p>
            <p className="mt-3 text-xs text-slate-500">
              Pastikan aturan keamanan Firestore sudah dipasang dan akun ini sudah diberi peran (lihat FIREBASE-SETUP.md).
            </p>
          </div>
        </div>
      );
    }
    return <LoadingScreen label="Menyinkronkan data keuangan..." />;
  }

  return (
    <FinanceContext.Provider
      value={{
        actor,
        can,
        syncMode: firebaseEnabled ? "firebase" : "local",
        syncError,
        legacyAvailable,
        importLegacyLocal,
        voidedTransactions,
        voidTransaction,
        pendingApprovals,
        approveExpense,
        rejectExpense,
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
        updateTransaction,
        adjustBalance,
        needsReconcile,
        dismissReconcile,
        exportData,
        importData,
        audit,
        setOpeningBalances,
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
