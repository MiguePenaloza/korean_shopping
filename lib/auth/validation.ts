export function normalizeBolivianPhoneInput(value: string) {
  const digits = value.replace(/\D/g, "");

  if (/^[67]\d{7}$/.test(digits)) {
    return `+591${digits}`;
  }

  if (/^591[67]\d{7}$/.test(digits)) {
    return `+${digits}`;
  }

  return null;
}

export function isValidFullName(value: string) {
  const length = value.trim().length;
  return length >= 2 && length <= 120;
}

export function isValidPassword(value: string) {
  return value.length >= 8;
}

export function getSafeNextPath(value: string | null, fallback = "/mi-cuenta") {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  return value;
}
