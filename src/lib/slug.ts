const ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";

export function generateSlug(length = 6): string {
  let s = "";
  const arr = new Uint32Array(length);
  crypto.getRandomValues(arr);
  for (let i = 0; i < length; i++) {
    s += ALPHABET[arr[i] % ALPHABET.length];
  }
  return s;
}

export function isValidSlug(slug: string): boolean {
  return /^[a-zA-Z0-9_-]{3,32}$/.test(slug);
}

export function isValidUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}
