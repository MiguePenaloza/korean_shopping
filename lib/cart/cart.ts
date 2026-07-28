export type CartLine = {
  productId: string;
  quantity: number;
};

export const cartStorageKey = "belle-perle:cart:v1";
export const checkoutAttemptStorageKey = "belle-perle:checkout-attempt:v1";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isCartLine(value: unknown): value is CartLine {
  if (!value || typeof value !== "object") return false;
  const line = value as Record<string, unknown>;
  return (
    typeof line.productId === "string" &&
    uuidPattern.test(line.productId) &&
    Number.isSafeInteger(line.quantity) &&
    Number(line.quantity) >= 1 &&
    Number(line.quantity) <= 20
  );
}

export function parseCart(raw: string | null): CartLine[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];

    const normalized = new Map<string, number>();
    for (const candidate of value.slice(0, 20)) {
      if (!isCartLine(candidate)) continue;
      normalized.set(
        candidate.productId,
        Math.min(20, (normalized.get(candidate.productId) ?? 0) + candidate.quantity),
      );
    }
    return Array.from(normalized, ([productId, quantity]) => ({
      productId,
      quantity,
    }));
  } catch {
    return [];
  }
}

export function setCartQuantity(lines: CartLine[], productId: string, quantity: number) {
  if (!uuidPattern.test(productId)) return lines;
  const nextQuantity = Math.max(0, Math.min(20, Math.trunc(quantity)));
  const existing = lines.find((line) => line.productId === productId);

  if (nextQuantity === 0) {
    return lines.filter((line) => line.productId !== productId);
  }
  if (existing) {
    return lines.map((line) =>
      line.productId === productId ? { ...line, quantity: nextQuantity } : line,
    );
  }
  if (lines.length >= 20) return lines;
  return [...lines, { productId, quantity: nextQuantity }];
}

export function cartFingerprint(lines: CartLine[]) {
  return [...lines]
    .sort((left, right) => left.productId.localeCompare(right.productId))
    .map((line) => `${line.productId}:${line.quantity}`)
    .join("|");
}

type CheckoutAttempt = {
  fingerprint: string;
  idempotencyKey: string;
};

export function resolveCheckoutAttempt(
  raw: string | null,
  fingerprint: string,
  createId: () => string,
): CheckoutAttempt {
  if (raw) {
    try {
      const candidate = JSON.parse(raw) as Partial<CheckoutAttempt>;
      if (
        candidate.fingerprint === fingerprint &&
        typeof candidate.idempotencyKey === "string" &&
        uuidPattern.test(candidate.idempotencyKey)
      ) {
        return {
          fingerprint,
          idempotencyKey: candidate.idempotencyKey,
        };
      }
    } catch {
      // A damaged session value is replaced below.
    }
  }

  const idempotencyKey = createId();
  if (!uuidPattern.test(idempotencyKey)) {
    throw new Error("INVALID_IDEMPOTENCY_KEY");
  }
  return { fingerprint, idempotencyKey };
}
