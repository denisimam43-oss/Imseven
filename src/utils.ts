import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function generateId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 10);
}

/** Tanggal (YYYY-MM-DD) untuk input type="date". */
export function toDateInput(ts: number = Date.now()): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Ubah YYYY-MM-DD ke timestamp. Hari ini = jam sekarang, hari lain = jam 12:00. */
export function fromDateInput(value: string): number {
  if (!value) return Date.now();
  if (value === toDateInput()) return Date.now();
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0).getTime();
}

export function formatDate(timestamp: number, formatStr: string = 'dd MMM yyyy, HH:mm'): string {
  return format(new Date(timestamp), formatStr, { locale: id });
}
