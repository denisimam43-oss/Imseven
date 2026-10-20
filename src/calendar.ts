// Kalender operasional Seven Interior: hari kerja, periode cut-off, tanggal kunci.
// Hari kerja = Senin–Sabtu, dikurangi libur nasional & cuti bersama (Minggu libur).
// Periode bulan M = tanggal 26 bulan sebelumnya s.d. tanggal 25 bulan M.

// Libur nasional & cuti bersama (SKB 3 Menteri). Tambahkan tahun berikutnya setiap Desember.
export const HOLIDAYS: Record<string, string> = {
  "2026-12-24": "Cuti bersama Natal",
  "2026-12-25": "Natal",
  "2027-01-01": "Tahun Baru",
  "2027-01-05": "Isra Mikraj",
  "2027-02-05": "Cuti bersama Imlek",
  "2027-02-06": "Imlek",
  "2027-03-08": "Nyepi",
  "2027-03-09": "Cuti bersama Idulfitri",
  "2027-03-10": "Idulfitri",
  "2027-03-11": "Idulfitri",
  "2027-03-12": "Cuti bersama Idulfitri",
  "2027-03-15": "Cuti bersama Idulfitri",
  "2027-03-25": "Cuti bersama Wafat Yesus",
  "2027-03-26": "Wafat Yesus Kristus",
  "2027-03-28": "Paskah",
  "2027-05-01": "Hari Buruh",
  "2027-05-06": "Kenaikan Yesus",
  "2027-05-17": "Iduladha",
  "2027-05-18": "Cuti bersama Iduladha",
  "2027-05-19": "Cuti bersama Waisak",
  "2027-05-20": "Waisak",
  "2027-06-01": "Hari Lahir Pancasila",
  "2027-06-06": "Tahun Baru Islam",
  "2027-08-15": "Maulid Nabi",
  "2027-08-17": "HUT RI",
  "2027-12-24": "Cuti bersama Natal",
  "2027-12-25": "Natal",
  "2027-12-26": "Isra Mikraj",
};

export const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const HARI = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

/** Tanggal lokal jam 12:00 (aman dari pergeseran zona waktu). */
export const mkDate = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12, 0, 0);
export const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const atNoon = (ts: number) => {
  const d = new Date(ts);
  return mkDate(d.getFullYear(), d.getMonth() + 1, d.getDate());
};
const addDays = (d: Date, n: number) => mkDate(d.getFullYear(), d.getMonth() + 1, d.getDate() + n);
export const fmtDay = (d: Date) => `${HARI[d.getDay()]} ${d.getDate()} ${BULAN[d.getMonth()]}`;
export const fmtDate = (d: Date) => `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;

export const holidayName = (d: Date) => HOLIDAYS[iso(d)];
export const isWorkday = (d: Date) => d.getDay() !== 0 && !HOLIDAYS[iso(d)];

export function prevWorkday(d: Date): Date {
  let x = d;
  while (!isWorkday(x)) x = addDays(x, -1);
  return x;
}
export function nextWorkday(d: Date): Date {
  let x = d;
  while (!isWorkday(x)) x = addDays(x, 1);
  return x;
}
/** Maju n hari kerja (n=0 -> hari kerja itu sendiri / berikutnya). */
export function addWorkdays(d: Date, n: number): Date {
  let x = nextWorkday(d);
  while (n > 0) {
    x = addDays(x, 1);
    if (isWorkday(x)) n--;
  }
  return x;
}
/** Mundur n hari kerja. */
export function backWorkdays(d: Date, n: number): Date {
  let x = d;
  while (n > 0) {
    x = addDays(x, -1);
    if (isWorkday(x)) n--;
  }
  return x;
}
export function workdaysBetween(a: Date, b: Date): number {
  let n = 0;
  for (let x = a; x <= b; x = addDays(x, 1)) if (isWorkday(x)) n++;
  return n;
}

export interface PeriodInfo {
  key: string; // "2026-11"
  label: string; // "Nov 2026"
  year: number;
  month: number;
  start: Date; // 26 bulan sebelumnya
  end: Date; // 25 bulan ini
  cutoff: Date; // hari kerja terakhir <= 25
  marketingClose: Date;
  workshopTarget: Date; // 2 hari kerja cadangan sebelum kunci produksi
  productionLock: Date;
  validasiKas: Date;
  alokasiGaji: Date;
  gajiCair: Date;
  tutupBuku: Date;
  dealRegulerBy: Date; // deal reguler terakhir agar panen di periode ini
  dealPremiumBy: Date;
  workdays: number;
}

export interface CapacityConfig {
  slotValue: number; // Rp per slot
  slotsPerPeriod: number; // kapasitas penuh
  baseWorkdays: number; // hari kerja periode penuh
}

export function periodInfo(year: number, month: number): PeriodInfo {
  const py = month === 1 ? year - 1 : year;
  const pm = month === 1 ? 12 : month - 1;
  const ny = month === 12 ? year + 1 : year;
  const nm = month === 12 ? 1 : month + 1;
  const start = mkDate(py, pm, 26);
  const end = mkDate(year, month, 25);
  const cutoff = prevWorkday(end);
  const productionLock = prevWorkday(mkDate(year, month, 20));
  return {
    key: `${year}-${String(month).padStart(2, "0")}`,
    label: `${BULAN[month - 1]} ${year}`,
    year,
    month,
    start,
    end,
    cutoff,
    marketingClose: prevWorkday(mkDate(year, month, 15)),
    workshopTarget: backWorkdays(productionLock, 2),
    productionLock,
    validasiKas: nextWorkday(mkDate(year, month, 26)),
    alokasiGaji: prevWorkday(mkDate(year, month, 28)),
    gajiCair: prevWorkday(mkDate(ny, nm, 1)),
    tutupBuku: prevWorkday(mkDate(ny, nm, 5)),
    dealRegulerBy: backWorkdays(cutoff, 14),
    dealPremiumBy: backWorkdays(cutoff, 19),
    workdays: workdaysBetween(start, end),
  };
}

/** Periode tempat sebuah tanggal jatuh (26 -> 25). */
export function periodOfDate(d: Date): PeriodInfo {
  let y = d.getFullYear();
  let m = d.getMonth() + 1;
  if (d.getDate() >= 26) {
    m += 1;
    if (m === 13) {
      m = 1;
      y += 1;
    }
  }
  return periodInfo(y, m);
}
export const periodOfTs = (ts: number) => periodOfDate(atNoon(ts));

export function shiftPeriod(p: PeriodInfo, k: number): PeriodInfo {
  let m = p.month + k;
  let y = p.year;
  while (m > 12) {
    m -= 12;
    y++;
  }
  while (m < 1) {
    m += 12;
    y--;
  }
  return periodInfo(y, m);
}

export const inPeriod = (p: PeriodInfo, ts: number) => {
  const d = atNoon(ts);
  return d >= p.start && d <= p.end;
};

export function periodCapacity(p: PeriodInfo, c: CapacityConfig) {
  const slots = Math.min(c.slotsPerPeriod, Math.round(((c.slotsPerPeriod * p.workdays) / c.baseWorkdays) * 10) / 10);
  return { slots, target: Math.round(slots * c.slotValue) };
}
