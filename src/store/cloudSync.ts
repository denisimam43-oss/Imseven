// Sinkronisasi state aplikasi <-> Firestore.
// Koleksi: projects/{id}, transactions/{id}, supports/{id}, meta/settings.
// Setiap perubahan state ditulis sebagai selisih (dokumen baru/berubah/terhapus),
// dan perubahan dari perangkat lain masuk lewat onSnapshot.
import { useEffect, useRef, useState } from "react";
import { collection, doc, onSnapshot, writeBatch } from "firebase/firestore";
import { db } from "../firebase";
import { DEFAULT_SETTINGS, FinanceSettings, Project, ProjectSupport, Transaction } from "../types";

type Coll = "projects" | "transactions" | "supports";

/** JSON dengan urutan key tetap & tanpa undefined (Firestore menolak undefined). */
function stable(v: unknown): string {
  return JSON.stringify(v, (_k, val) =>
    val && typeof val === "object" && !Array.isArray(val)
      ? Object.keys(val)
          .sort()
          .reduce<Record<string, unknown>>((o, k) => {
            if (val[k] !== undefined) o[k] = val[k];
            return o;
          }, {})
      : val,
  );
}
const clean = <T,>(v: T): T => JSON.parse(stable(v));

export interface CloudStatus {
  ready: boolean; // data awal dari server sudah diterima
  empty: boolean; // database masih kosong (belum ada data sama sekali)
  error?: string;
  saving: boolean;
}

interface Args {
  active: boolean;
  projects: Project[];
  setProjects: (v: Project[]) => void;
  transactions: Transaction[];
  setTransactions: (v: Transaction[]) => void;
  supports: ProjectSupport[];
  setSupports: (v: ProjectSupport[]) => void;
  settings: FinanceSettings;
  setSettings: (v: FinanceSettings) => void;
}

export function useCloudSync(a: Args): CloudStatus {
  const remote = useRef<Record<Coll, Map<string, string>>>({
    projects: new Map(),
    transactions: new Map(),
    supports: new Map(),
  });
  const remoteSettings = useRef<string | null>(null);
  const loaded = useRef({ projects: false, transactions: false, supports: false, settings: false });
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  // ---- Terima data dari server ----
  useEffect(() => {
    if (!a.active || !db) return;
    const markReady = () => {
      const l = loaded.current;
      if (l.projects && l.transactions && l.supports && l.settings) setReady(true);
    };
    const onErr = (e: Error) =>
      setError(
        e.message.includes("permission")
          ? "Akun ini tidak punya akses ke data keuangan. Hubungi owner."
          : `Gagal terhubung ke server: ${e.message}`,
      );
    const sub = <T extends { id: string }>(name: Coll, set: (v: T[]) => void, sort: (x: T, y: T) => number) =>
      onSnapshot(
        collection(db!, name),
        (snap) => {
          const map = new Map<string, string>();
          const arr: T[] = [];
          snap.forEach((d) => {
            const v = { ...(d.data() as T), id: d.id };
            arr.push(v);
            map.set(d.id, stable(v));
          });
          remote.current[name] = map;
          loaded.current[name] = true;
          set(arr.sort(sort));
          markReady();
        },
        onErr,
      );
    const unsubs = [
      sub<Project>("projects", a.setProjects, (x, y) => y.createdAt - x.createdAt),
      sub<Transaction>("transactions", a.setTransactions, (x, y) => y.date - x.date || (y.createdAt || 0) - (x.createdAt || 0)),
      sub<ProjectSupport>("supports", a.setSupports, (x, y) => y.date - x.date),
      onSnapshot(
        doc(db, "meta", "settings"),
        (d) => {
          loaded.current.settings = true;
          if (d.exists()) {
            const saved = d.data() as Partial<FinanceSettings>;
            const merged: FinanceSettings = {
              ...DEFAULT_SETTINGS,
              ...saved,
              shares: { ...DEFAULT_SETTINGS.shares, ...(saved.shares || {}) },
            };
            remoteSettings.current = stable(merged);
            a.setSettings(merged);
          }
          markReady();
        },
        onErr,
      ),
    ];
    return () => unsubs.forEach((u) => u());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [a.active]);

  // ---- Kirim perubahan ke server (hanya selisihnya) ----
  const push = async (name: Coll, items: { id: string }[]) => {
    if (!db) return;
    const known = remote.current[name];
    const ops: { id: string; data?: unknown }[] = [];
    const seen = new Set<string>();
    for (const it of items) {
      seen.add(it.id);
      const s = stable(it);
      if (known.get(it.id) !== s) {
        ops.push({ id: it.id, data: clean(it) });
        known.set(it.id, s);
      }
    }
    for (const id of [...known.keys()]) {
      if (!seen.has(id)) {
        ops.push({ id });
        known.delete(id);
      }
    }
    if (!ops.length) return;
    setSaving(true);
    try {
      for (let i = 0; i < ops.length; i += 400) {
        const b = writeBatch(db);
        for (const op of ops.slice(i, i + 400)) {
          const ref = doc(db, name, op.id);
          if (op.data) b.set(ref, op.data as Record<string, unknown>);
          else b.delete(ref);
        }
        await b.commit();
      }
    } catch (e) {
      setError(`Gagal menyimpan ke server: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (ready) push("projects", a.projects);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [a.projects, ready]);
  useEffect(() => {
    if (ready) push("transactions", a.transactions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [a.transactions, ready]);
  useEffect(() => {
    if (ready) push("supports", a.supports);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [a.supports, ready]);
  useEffect(() => {
    if (!ready || !db) return;
    const s = stable(a.settings);
    if (s === remoteSettings.current) return;
    remoteSettings.current = s;
    const b = writeBatch(db);
    b.set(doc(db, "meta", "settings"), clean(a.settings) as unknown as Record<string, unknown>);
    b.commit().catch((e) => setError(`Gagal menyimpan pengaturan: ${(e as Error).message}`));
  }, [a.settings, ready]);

  const empty =
    ready && a.projects.length === 0 && a.transactions.length === 0 && a.supports.length === 0;

  return { ready, empty, error, saving };
}
