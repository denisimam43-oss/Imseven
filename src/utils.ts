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
  return Math.random().toString(36).substring(2, 9);
}

export function formatDate(timestamp: number, formatStr: string = 'dd MMM yyyy, HH:mm'): string {
  return format(new Date(timestamp), formatStr, { locale: id });
}
