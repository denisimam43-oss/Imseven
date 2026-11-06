// Sandi untuk MODE LOKAL (tanpa Firebase). Tidak ada sandi bawaan: sandi dibuat saat pertama dipakai.
// Catatan: mode lokal hanya melindungi tampilan di perangkat ini; data tetap ada di browser.
const KEY = "seven_finance_local_auth_v2";
const LEGACY_KEY = "adminPassword"; // versi lama menyimpan sandi apa adanya

async function sha256(text: string): Promise<string> {
  if (!crypto?.subtle) throw new Error("Browser tidak mendukung pembuatan sandi aman. Gunakan alamat https.");
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function hasLocalPassword(): boolean {
  return !!localStorage.getItem(KEY) || !!localStorage.getItem(LEGACY_KEY);
}

export async function setLocalPassword(password: string): Promise<void> {
  const salt = crypto.randomUUID();
  const hash = await sha256(salt + password);
  localStorage.setItem(KEY, JSON.stringify({ salt, hash }));
  localStorage.removeItem(LEGACY_KEY);
}

export async function verifyLocalPassword(password: string): Promise<boolean> {
  const raw = localStorage.getItem(KEY);
  if (raw) {
    try {
      const { salt, hash } = JSON.parse(raw) as { salt: string; hash: string };
      return (await sha256(salt + password)) === hash;
    } catch {
      return false;
    }
  }
  const legacy = localStorage.getItem(LEGACY_KEY);
  if (legacy !== null && legacy === password) {
    await setLocalPassword(password); // naikkan ke format aman
    return true;
  }
  return false;
}
