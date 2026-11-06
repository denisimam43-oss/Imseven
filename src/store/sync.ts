// Sinkronisasi state aplikasi <-> Firestore.
// Pendekatan: state React tetap menjadi sumber logika; setiap perubahan dibandingkan dengan
// salinan terakhir yang diketahui dari server, lalu hanya dokumen yang berubah yang ditulis.
import { useEffect, useRef, useState } from "react";
import {
  collection,
  doc,
  limit as qLimit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  writeBatch,
  type Query,
} from "firebase/firestore";
import { db } from "../firebase";

/** JSON dengan urutan kunci tetap dan tanpa nilai undefined, untuk membandingkan isi dokumen. */
export function stableStringify(value: unknown): string {
  const norm = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(norm);
    if (v && typeof v === "object") {
      const out: Record<string, unknown> = {};
      for (const k of Object.keys(v as object).sort()) {
        const x = (v as Record<string, unknown>)[k];
        if (x !== undefined) out[k] = norm(x);
      }
      return out;
    }
    return v;
  };
  return JSON.stringify(norm(value));
}

export interface SyncStatus {
  hydrated: boolean;
  error?: string;
}

interface CollectionOpts<T extends { id: string }> {
  name: string;
  items: T[];
  setItems: (items: T[]) => void;
  enabled: boolean;
  canWrite: boolean;
  sort?: (a: T, b: T) => number;
  /** Batasi data yang dimuat (mis. log aktivitas): urut menurun berdasarkan field ini. */
  recent?: { field: string; max: number };
}

export function useCollectionSync<T extends { id: string }>(opts: CollectionOpts<T>): SyncStatus {
  const { name, items, setItems, enabled, canWrite, sort, recent } = opts;
  const synced = useRef(new Map<string, string>());
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const setItemsRef = useRef(setItems);
  setItemsRef.current = setItems;

  useEffect(() => {
    if (!enabled) return;
    const base = collection(db, name);
    const q: Query = recent ? query(base, orderBy(recent.field, "desc"), qLimit(recent.max)) : base;
    return onSnapshot(
      q,
      (snap) => {
        const arr = snap.docs.map((d) => ({ ...(d.data() as object), id: d.id }) as T);
        synced.current = new Map(arr.map((x) => [x.id, stableStringify(x)]));
        setItemsRef.current(sort ? [...arr].sort(sort) : arr);
        setHydrated(true);
        setError(undefined);
      },
      (err) => setError(`Gagal membaca ${name}: ${err.message}`),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, name]);

  useEffect(() => {
    if (!enabled || !hydrated || !canWrite) return;
    const ops: { kind: "set" | "delete"; id: string; data?: T; str?: string }[] = [];
    const seen = new Set<string>();
    for (const it of items) {
      seen.add(it.id);
      const str = stableStringify(it);
      if (synced.current.get(it.id) !== str) ops.push({ kind: "set", id: it.id, data: it, str });
    }
    for (const id of synced.current.keys()) {
      if (!seen.has(id)) ops.push({ kind: "delete", id });
    }
    if (ops.length === 0) return;

    // Anggap sudah tersinkron agar tidak ditulis dobel; dikembalikan bila gagal.
    const backup = new Map<string, string | undefined>();
    for (const op of ops) {
      backup.set(op.id, synced.current.get(op.id));
      if (op.kind === "set") synced.current.set(op.id, op.str as string);
      else synced.current.delete(op.id);
    }

    (async () => {
      try {
        for (let i = 0; i < ops.length; i += 400) {
          const batch = writeBatch(db);
          for (const op of ops.slice(i, i + 400)) {
            const ref = doc(db, name, op.id);
            if (op.kind === "set") batch.set(ref, op.data as object);
            else batch.delete(ref);
          }
          await batch.commit();
        }
        setError(undefined);
      } catch (e) {
        for (const [id, prev] of backup) {
          if (prev === undefined) synced.current.delete(id);
          else synced.current.set(id, prev);
        }
        setError(`Perubahan di ${name} ditolak server: ${e instanceof Error ? e.message : String(e)}`);
      }
    })();
  }, [items, enabled, hydrated, canWrite, name]);

  return { hydrated, error };
}

interface DocOpts<T> {
  path: [string, string]; // [koleksi, id]
  value: T;
  setValue: (raw: Record<string, unknown> | undefined) => void;
  enabled: boolean;
  canWrite: boolean;
}

/** Satu dokumen tunggal (pengaturan keuangan). */
export function useDocSync<T extends object>(opts: DocOpts<T>): SyncStatus {
  const { path, value, setValue, enabled, canWrite } = opts;
  const synced = useRef<string>("");
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const setValueRef = useRef(setValue);
  setValueRef.current = setValue;

  useEffect(() => {
    if (!enabled) return;
    return onSnapshot(
      doc(db, path[0], path[1]),
      (snap) => {
        const raw = snap.exists() ? (snap.data() as Record<string, unknown>) : undefined;
        synced.current = raw ? stableStringify(raw) : "";
        setValueRef.current(raw);
        setHydrated(true);
        setError(undefined);
      },
      (err) => setError(`Gagal membaca pengaturan: ${err.message}`),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, path[0], path[1]]);

  useEffect(() => {
    if (!enabled || !hydrated || !canWrite) return;
    const str = stableStringify(value);
    if (str === synced.current) return;
    const prev = synced.current;
    synced.current = str;
    setDoc(doc(db, path[0], path[1]), value as object).then(
      () => setError(undefined),
      (e) => {
        synced.current = prev;
        setError(`Pengaturan ditolak server: ${e instanceof Error ? e.message : String(e)}`);
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, enabled, hydrated, canWrite]);

  return { hydrated, error };
}
