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
  IncomeSplits,
  RekeningType,
  FilterPeriod,
  ProjectSupport,
  TargetScenario,
} from "../types";
import { generateId } from "../utils";

interface FinanceState {
  projects: Project[];
  transactions: Transaction[];
  filteredTransactions: Transaction[];
  supports: ProjectSupport[];
  filterPeriod: FilterPeriod;
  setFilterPeriod: (period: FilterPeriod) => void;
  targetScenario: TargetScenario;
  setTargetScenario: (scenario: TargetScenario) => void;
  addProject: (name: string, totalValue: number, clientNotes?: string) => void;
  payPelunasan: (projectId: string, autoSettleSupports?: boolean) => void;
  deleteProject: (id: string) => void;
  addExpense: (
    account: RekeningType,
    amount: number,
    description: string,
    category: string,
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
  ) => void;
  settleSupport: (supportId: string) => void;
  deleteSupport: (supportId: string) => void;
  balances: {
    rek1: number;
    rek2: number;
    rek3: number;
    rek4: number;
    totalOmset: number;
    opexCollectedThisMonth: number;
    totalPiutangPelunasan: number;
    totalOutstandingSupport: number;
  };
  filteredBalances: { totalOmset: number; opexCollected: number };
  deleteTransaction: (id: string) => void;
  updateTransaction: (id: string, data: Partial<Transaction>) => void;
  adjustBalance: (account: RekeningType, newBalance: number) => void;
}

const FinanceContext = createContext<FinanceState | undefined>(undefined);

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem("seven_interior_projects_v3");
    return saved ? JSON.parse(saved) : [];
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem("seven_interior_transactions_v3");
    return saved ? JSON.parse(saved) : [];
  });

  const [supports, setSupports] = useState<ProjectSupport[]>(() => {
    const saved = localStorage.getItem("seven_interior_supports_v1");
    return saved ? JSON.parse(saved) : [];
  });

  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>("THIS_MONTH");
  const [targetScenario, setTargetScenario] = useState<TargetScenario>("SKENARIO_B");

  // Save on change to ensure data persistence
  useEffect(() => {
    localStorage.setItem(
      "seven_interior_projects_v3",
      JSON.stringify(projects),
    );
  }, [projects]);

  useEffect(() => {
    localStorage.setItem(
      "seven_interior_transactions_v3",
      JSON.stringify(transactions),
    );
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem(
      "seven_interior_supports_v1",
      JSON.stringify(supports),
    );
  }, [supports]);

  const addProject = (name: string, totalValue: number, clientNotes?: string) => {
    const newProject: Project = {
      id: generateId(),
      name,
      type: "PROJECT",
      status: "ONGOING",
      totalValue,
      createdAt: Date.now(),
      clientNotes,
    };

    // DP 60% logic
    // 53% total -> Rek 2 (Lock Proyek: HPP & Tukang)
    // 7% total -> Rek 3 (Lock OpEx: Ops Kantor 3%, Kontingensi 2%, Prive 2%)
    const amountReceived = totalValue * 0.6;
    const splits: IncomeSplits = {
      rek2: totalValue * 0.53,
      rek3: totalValue * 0.07,
      rek4: 0,
    };

    const newTransaction: Transaction = {
      id: generateId(),
      date: Date.now(),
      description: `DP 60% - ${name}`,
      type: "INCOME",
      amount: amountReceived,
      projectId: newProject.id,
      incomeType: "DP_60",
      splits,
    };

    setProjects((prev) => [newProject, ...prev]);
    setTransactions((prev) => [newTransaction, ...prev]);
  };

  const payPelunasan = (projectId: string, autoSettleSupports: boolean = false) => {
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;

    // Pelunasan 40% logic
    // 20% total -> Rek 3 (Biaya Tetap Expense)
    // 20% total -> Rek 4 (Lock Margin Profit)
    const amountReceived = project.totalValue * 0.4;
    const splits: IncomeSplits = {
      rek2: 0,
      rek3: project.totalValue * 0.2,
      rek4: project.totalValue * 0.2,
    };

    const newTransaction: Transaction = {
      id: generateId(),
      date: Date.now(),
      description: `Pelunasan 40% - ${project.name}`,
      type: "INCOME",
      amount: amountReceived,
      projectId: project.id,
      incomeType: "PELUNASAN_40",
      splits,
    };

    // Auto settle any outstanding support liabilities for this project if requested
    if (autoSettleSupports) {
      const outstandingForProject = supports.filter(
        (s) => s.toProjectId === projectId && s.status === "OUTSTANDING"
      );

      if (outstandingForProject.length > 0) {
        setSupports((prev) =>
          prev.map((s) =>
            s.toProjectId === projectId && s.status === "OUTSTANDING"
              ? { ...s, status: "RETURNED", returnedAt: Date.now() }
              : s
          )
        );

        const settlementTransactions: Transaction[] = outstandingForProject.map((s) => ({
          id: generateId(),
          date: Date.now(),
          description: `Pengembalian Talangan ke ${s.fromProjectName} (Pelunasan Proyek)`,
          type: "EXPENSE",
          amount: s.amount,
          expenseAccount: "REK2",
          expenseCategory: "Pengembalian Talangan Proyek",
          projectId: projectId,
          supportId: s.id,
        }));

        setTransactions((prev) => [newTransaction, ...settlementTransactions, ...prev]);
      } else {
        setTransactions((prev) => [newTransaction, ...prev]);
      }
    } else {
      setTransactions((prev) => [newTransaction, ...prev]);
    }

    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId
          ? { ...p, status: "COMPLETED", completedAt: Date.now() }
          : p
      )
    );
  };

  const deleteProject = (id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
    setTransactions((prev) => prev.filter((t) => t.projectId !== id));
    setSupports((prev) =>
      prev.filter((s) => s.fromProjectId !== id && s.toProjectId !== id)
    );
  };

  const addExpense = (
    account: RekeningType,
    amount: number,
    description: string,
    category: string,
    projectId?: string,
  ) => {
    const newTransaction: Transaction = {
      id: generateId(),
      date: Date.now(),
      description,
      type: "EXPENSE",
      amount,
      expenseAccount: account,
      expenseCategory: category,
      projectId,
    };

    setTransactions((prev) => [newTransaction, ...prev]);
  };

  const addSupport = (
    fromProjectId: string | undefined,
    fromProjectName: string,
    toProjectId: string | undefined,
    toProjectName: string,
    amount: number,
    description: string,
    account: RekeningType = "REK2"
  ) => {
    const supportId = generateId();
    const newSupport: ProjectSupport = {
      id: supportId,
      fromProjectId,
      fromProjectName,
      toProjectId,
      toProjectName,
      amount,
      description,
      date: Date.now(),
      status: "OUTSTANDING",
      account,
    };

    // 1. Catat pengeluaran dari proyek pemberi talangan
    const lenderExpense: Transaction = {
      id: generateId(),
      date: Date.now(),
      description: `Talangan Keluar: untuk ${toProjectName} (${description})`,
      type: "EXPENSE",
      amount,
      expenseAccount: account,
      expenseCategory: "Subsidi Silang / Talangan Antar Proyek",
      projectId: fromProjectId,
      supportId,
    };

    // 2. Catat pemasukan / alokasi kerja ke rekening proyek penerima
    const borrowerIncome: Transaction = {
      id: generateId(),
      date: Date.now(),
      description: `Penerimaan Talangan: dari ${fromProjectName} (${description})`,
      type: "INCOME",
      amount,
      projectId: toProjectId,
      splits: {
        rek2: account === "REK2" ? amount : 0,
        rek3: account === "REK3" ? amount : 0,
        rek4: account === "REK4" ? amount : 0,
      },
      supportId,
    };

    setSupports((prev) => [newSupport, ...prev]);
    setTransactions((prev) => [borrowerIncome, lenderExpense, ...prev]);
  };

  const settleSupport = (supportId: string) => {
    const sup = supports.find((s) => s.id === supportId);
    if (!sup || sup.status === "RETURNED") return;

    // Tandai status RETURNED
    setSupports((prev) =>
      prev.map((s) =>
        s.id === supportId
          ? { ...s, status: "RETURNED", returnedAt: Date.now() }
          : s
      )
    );

    // Catat pengembalian:
    // Pengeluaran dari peminjam
    const borrowerRepay: Transaction = {
      id: generateId(),
      date: Date.now(),
      description: `Pengembalian Talangan ke ${sup.fromProjectName} (${sup.description})`,
      type: "EXPENSE",
      amount: sup.amount,
      expenseAccount: sup.account || "REK2",
      expenseCategory: "Pengembalian Talangan Proyek",
      projectId: sup.toProjectId,
      supportId: sup.id,
    };

    // Pemasukan kembali ke pemberi
    const lenderReimburse: Transaction = {
      id: generateId(),
      date: Date.now(),
      description: `Penerimaan Pengembalian Talangan dari ${sup.toProjectName}`,
      type: "INCOME",
      amount: sup.amount,
      projectId: sup.fromProjectId,
      splits: {
        rek2: (sup.account || "REK2") === "REK2" ? sup.amount : 0,
        rek3: sup.account === "REK3" ? sup.amount : 0,
        rek4: sup.account === "REK4" ? sup.amount : 0,
      },
      supportId: sup.id,
    };

    setTransactions((prev) => [lenderReimburse, borrowerRepay, ...prev]);
  };

  const deleteSupport = (supportId: string) => {
    setSupports((prev) => prev.filter((s) => s.id !== supportId));
    setTransactions((prev) => prev.filter((t) => t.supportId !== supportId));
  };

  const adjustBalance = (account: RekeningType, newBalance: number) => {
    // calculate current balance
    const currentIn = transactions
      .filter((t) => t.type === "INCOME")
      .reduce((acc, t) => {
        if (account === "REK1") return acc + t.amount;
        return (
          acc +
          (t.splits?.[account.toLowerCase() as "rek2" | "rek3" | "rek4"] || 0)
        );
      }, 0);
    const currentOut = transactions
      .filter((t) => t.type === "EXPENSE" && t.expenseAccount === account)
      .reduce((acc, t) => acc + t.amount, 0);
    const currentBalance = currentIn - currentOut;

    const diff = newBalance - currentBalance;
    if (diff === 0) return;

    if (diff > 0) {
      const newTransaction: Transaction = {
        id: generateId(),
        date: Date.now(),
        description: `Penyesuaian Saldo Manual (${account})`,
        type: "INCOME",
        amount: diff,
        incomeType: "DP_60",
        splits: {
          rek2: account === "REK2" ? diff : 0,
          rek3: account === "REK3" ? diff : 0,
          rek4: account === "REK4" ? diff : 0,
        },
      };
      setTransactions((prev) => [newTransaction, ...prev]);
    } else {
      const newTransaction: Transaction = {
        id: generateId(),
        date: Date.now(),
        description: `Penyesuaian Saldo Manual (${account})`,
        type: "EXPENSE",
        amount: Math.abs(diff),
        expenseAccount: account,
        expenseCategory: "Penyesuaian Manual",
      };
      setTransactions((prev) => [newTransaction, ...prev]);
    }
  };

  const deleteTransaction = (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  const updateTransaction = (id: string, data: Partial<Transaction>) => {
    setTransactions((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          let newT = { ...t, ...data };
          if (data.amount && t.type === "INCOME" && t.incomeType) {
            if (t.incomeType === "DP_60") {
              // 53% Rek 2, 7% Rek 3 (Ratio 53/60 and 7/60 of received DP)
              newT.splits = {
                rek2: (data.amount * 53) / 60,
                rek3: (data.amount * 7) / 60,
                rek4: 0,
              };
            } else if (t.incomeType === "PELUNASAN_40") {
              // 20% Rek 3, 20% Rek 4 (50% each of received 40%)
              newT.splits = {
                rek2: 0,
                rek3: data.amount * 0.5,
                rek4: data.amount * 0.5,
              };
            }
          }
          return newT;
        }
        return t;
      })
    );
  };

  // Calculate Balances
  const rek1In = transactions
    .filter((t) => t.type === "INCOME" && !t.supportId)
    .reduce((acc, t) => acc + t.amount, 0);
  const rek1Out = transactions
    .filter((t) => t.type === "EXPENSE" && t.expenseAccount === "REK1")
    .reduce((acc, t) => acc + t.amount, 0);

  const rek2In = transactions
    .filter((t) => t.type === "INCOME")
    .reduce((acc, t) => acc + (t.splits?.rek2 || 0), 0);
  const rek2Out = transactions
    .filter((t) => t.type === "EXPENSE" && t.expenseAccount === "REK2")
    .reduce((acc, t) => acc + t.amount, 0);

  const rek3In = transactions
    .filter((t) => t.type === "INCOME")
    .reduce((acc, t) => acc + (t.splits?.rek3 || 0), 0);
  const rek3Out = transactions
    .filter((t) => t.type === "EXPENSE" && t.expenseAccount === "REK3")
    .reduce((acc, t) => acc + t.amount, 0);

  const rek4In = transactions
    .filter((t) => t.type === "INCOME")
    .reduce((acc, t) => acc + (t.splits?.rek4 || 0), 0);
  const rek4Out = transactions
    .filter((t) => t.type === "EXPENSE" && t.expenseAccount === "REK4")
    .reduce((acc, t) => acc + t.amount, 0);

  const totalOmset = transactions
    .filter((t) => t.type === "INCOME" && !t.supportId && !t.description.includes("Penyesuaian Saldo"))
    .reduce((acc, t) => acc + t.amount, 0);

  // Opex collected this month (Rek 3 in)
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const opexCollectedThisMonth = transactions
    .filter((t) => {
      if (t.type !== "INCOME") return false;
      const d = new Date(t.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .reduce((acc, t) => acc + (t.splits?.rek3 || 0), 0);

  // Total Piutang Pelunasan (40% dari proyek ongoing)
  const totalPiutangPelunasan = projects
    .filter((p) => p.status === "ONGOING")
    .reduce((sum, p) => sum + p.totalValue * 0.4, 0);

  // Total Outstanding Support (Talangan pending)
  const totalOutstandingSupport = supports
    .filter((s) => s.status === "OUTSTANDING")
    .reduce((sum, s) => sum + s.amount, 0);

  // Filtered transactions for the current period
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    return transactions.filter((t) => {
      const d = new Date(t.date);
      if (filterPeriod === "7_DAYS") {
        const diffDays = (now.getTime() - d.getTime()) / (1000 * 3600 * 24);
        return diffDays <= 7;
      } else if (filterPeriod === "THIS_MONTH") {
        return (
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear()
        );
      } else if (filterPeriod === "6_MONTHS") {
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        return d >= sixMonthsAgo;
      } else if (filterPeriod === "THIS_YEAR") {
        return d.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }, [transactions, filterPeriod]);

  const filteredBalances = useMemo(() => {
    const totalOmset = filteredTransactions
      .filter((t) => t.type === "INCOME" && !t.supportId && !t.description.includes("Penyesuaian Saldo"))
      .reduce((acc, t) => acc + t.amount, 0);
    const opexCollected = filteredTransactions
      .filter((t) => t.type === "INCOME")
      .reduce((acc, t) => acc + (t.splits?.rek3 || 0), 0);
    return { totalOmset, opexCollected };
  }, [filteredTransactions]);

  const balances = {
    rek1: rek1In - rek1Out,
    rek2: rek2In - rek2Out,
    rek3: rek3In - rek3Out,
    rek4: rek4In - rek4Out,
    totalOmset,
    opexCollectedThisMonth,
    totalPiutangPelunasan,
    totalOutstandingSupport,
  };

  return (
    <FinanceContext.Provider
      value={{
        projects,
        transactions,
        filteredTransactions,
        supports,
        filterPeriod,
        setFilterPeriod,
        targetScenario,
        setTargetScenario,
        addProject,
        payPelunasan,
        deleteProject,
        addExpense,
        addSupport,
        settleSupport,
        deleteSupport,
        balances,
        filteredBalances,
        deleteTransaction,
        updateTransaction,
        adjustBalance,
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
