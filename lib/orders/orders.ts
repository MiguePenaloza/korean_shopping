"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { CartLine } from "@/lib/cart/cart";

export type CreatedOrder = {
  id: string;
  number: string;
  totalBob: number;
  reservationExpiresAt: string;
  paymentReportExpiresAt: string;
};

export type OrderConfirmationItem = {
  code: string;
  name: string;
  brand: string;
  variant: string;
  unitPriceBob: number;
  quantity: number;
  lineTotalBob: number;
};

export type OrderConfirmation = CreatedOrder & {
  customerName: string;
  status: string;
  paymentStatus: string;
  createdAt: string;
  whatsappPhoneE164: string;
  items: OrderConfirmationItem[];
};

function client() {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("SUPABASE_NOT_CONFIGURED");
  return supabase;
}

function requiredText(value: unknown, field: string) {
  if (typeof value !== "string" || !value) throw new Error(`INVALID_${field}`);
  return value;
}

function requiredNumber(value: unknown, field: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`INVALID_${field}`);
  return parsed;
}

function mapCreatedOrder(value: unknown): CreatedOrder {
  if (!value || typeof value !== "object") throw new Error("INVALID_ORDER_RESULT");
  const row = value as Record<string, unknown>;
  return {
    id: requiredText(row.order_id, "ORDER_ID"),
    number: requiredText(row.order_number, "ORDER_NUMBER"),
    totalBob: requiredNumber(row.total_bob, "ORDER_TOTAL"),
    reservationExpiresAt: requiredText(
      row.reservation_expires_at,
      "RESERVATION_EXPIRATION",
    ),
    paymentReportExpiresAt: requiredText(
      row.payment_report_expires_at,
      "PAYMENT_REPORT_EXPIRATION",
    ),
  };
}

function orderError(error: { message?: string } | null) {
  const message = error?.message ?? "";
  for (const code of [
    "ORDERING_CLOSED",
    "PRICE_EXPIRED",
    "ITEM_UNAVAILABLE",
    "INSUFFICIENT_STOCK",
    "PAYMENT_REPORT_WINDOW_CLOSED",
    "ACCEPTANCE_REQUIRED",
  ]) {
    if (message.includes(code)) return new Error(code);
  }
  return new Error("ORDER_REQUEST_FAILED");
}

export async function submitOrder(input: {
  idempotencyKey: string;
  customerName: string;
  phone: string;
  items: CartLine[];
}) {
  const { data, error } = await client().rpc("submit_order", {
    p_idempotency_key: input.idempotencyKey,
    p_guest_name: input.customerName,
    p_phone: input.phone,
    p_items: input.items.map((item) => ({
      product_id: item.productId,
      quantity: item.quantity,
    })),
    p_terms_accepted: true,
    p_privacy_accepted: true,
  });
  if (error) throw orderError(error);
  const value: unknown = Array.isArray(data) ? data[0] : null;
  return mapCreatedOrder(value);
}

export async function getOrderConfirmation(orderId: string) {
  const { data, error } = await client().rpc("get_own_order_confirmation", {
    p_order_id: orderId,
  });
  if (error) throw new Error("ORDER_CONFIRMATION_UNAVAILABLE");
  const value: unknown = Array.isArray(data) ? data[0] : null;
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const rawItems: unknown[] = Array.isArray(row.items) ? row.items : [];

  return {
    ...mapCreatedOrder(row),
    customerName: requiredText(row.customer_name, "CUSTOMER_NAME"),
    status: requiredText(row.order_status, "ORDER_STATUS"),
    paymentStatus: requiredText(row.payment_status, "PAYMENT_STATUS"),
    createdAt: requiredText(row.created_at, "ORDER_CREATED_AT"),
    whatsappPhoneE164: requiredText(row.whatsapp_phone_e164, "WHATSAPP_PHONE"),
    items: rawItems.map((value) => {
      if (!value || typeof value !== "object") throw new Error("INVALID_ORDER_ITEM");
      const item = value as Record<string, unknown>;
      return {
        code: requiredText(item.product_code, "PRODUCT_CODE"),
        name: requiredText(item.product_name, "PRODUCT_NAME"),
        brand: requiredText(item.product_brand, "PRODUCT_BRAND"),
        variant: typeof item.product_variant === "string" ? item.product_variant : "",
        unitPriceBob: requiredNumber(item.unit_price_bob, "UNIT_PRICE"),
        quantity: requiredNumber(item.quantity, "QUANTITY"),
        lineTotalBob: requiredNumber(item.line_total_bob, "LINE_TOTAL"),
      };
    }),
  } satisfies OrderConfirmation;
}

export async function reportOrderPayment(orderId: string) {
  const { error } = await client().rpc("report_own_order_payment", {
    p_order_id: orderId,
  });
  if (error) throw orderError(error);
}
