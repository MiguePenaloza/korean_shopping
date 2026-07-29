"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export type CustomerOrderStatus =
  | "pending_payment"
  | "confirmed"
  | "purchased"
  | "in_transit"
  | "ready_for_delivery"
  | "delivered"
  | "expired"
  | "cancelled"
  | "refund_pending"
  | "refunded";

export type CustomerPaymentStatus =
  | "awaiting_payment"
  | "payment_reported"
  | "paid"
  | "rejected"
  | "refund_pending"
  | "refunded";

export type CustomerOrderSummary = {
  number: string;
  status: CustomerOrderStatus;
  paymentStatus: CustomerPaymentStatus;
  totalBob: number;
  createdAt: string;
  updatedAt: string;
  reservationExpiresAt: string;
  itemQuantity: number;
  totalCount: number;
};

export type CustomerOrderItem = {
  code: string;
  name: string;
  brand: string;
  variant: string;
  unitPriceBob: number;
  quantity: number;
  lineTotalBob: number;
};

export type CustomerOrderHistoryEntry = {
  fromStatus: CustomerOrderStatus | null;
  toStatus: CustomerOrderStatus;
  fromPaymentStatus: CustomerPaymentStatus | null;
  toPaymentStatus: CustomerPaymentStatus;
  createdAt: string;
};

export type CustomerOrderDetail = Omit<
  CustomerOrderSummary,
  "itemQuantity" | "totalCount"
> & {
  customerName: string;
  subtotalBob: number;
  paymentReportExpiresAt: string;
  paidAt: string | null;
  whatsappPhoneE164: string;
  items: CustomerOrderItem[];
  history: CustomerOrderHistoryEntry[];
};

type Presentation = {
  label: string;
  description: string;
  help: string;
  variant: "success" | "warning" | "neutral";
};

const orderStatuses = new Set<CustomerOrderStatus>([
  "pending_payment",
  "confirmed",
  "purchased",
  "in_transit",
  "ready_for_delivery",
  "delivered",
  "expired",
  "cancelled",
  "refund_pending",
  "refunded",
]);

const paymentStatuses = new Set<CustomerPaymentStatus>([
  "awaiting_payment",
  "payment_reported",
  "paid",
  "rejected",
  "refund_pending",
  "refunded",
]);

function client() {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("SUPABASE_NOT_CONFIGURED");
  return supabase;
}

function requiredText(value: unknown, field: string) {
  if (typeof value !== "string" || !value) throw new Error(`INVALID_${field}`);
  return value;
}

function optionalText(value: unknown) {
  return typeof value === "string" && value ? value : null;
}

function requiredNumber(value: unknown, field: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`INVALID_${field}`);
  return parsed;
}

function objectArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter(
        (item): item is Record<string, unknown> =>
          Boolean(item) && typeof item === "object",
      )
    : [];
}

function orderStatus(value: unknown) {
  const status = requiredText(value, "ORDER_STATUS") as CustomerOrderStatus;
  if (!orderStatuses.has(status)) throw new Error("INVALID_ORDER_STATUS");
  return status;
}

function paymentStatus(value: unknown) {
  const status = requiredText(value, "PAYMENT_STATUS") as CustomerPaymentStatus;
  if (!paymentStatuses.has(status)) throw new Error("INVALID_PAYMENT_STATUS");
  return status;
}

function trackingError(error: { message?: string } | null) {
  const message = error?.message ?? "";
  if (message.includes("PERMANENT_ACCOUNT_REQUIRED")) {
    return new Error("PERMANENT_ACCOUNT_REQUIRED");
  }
  if (
    message.includes("ORDER_NOT_ACCESSIBLE") ||
    message.includes("INVALID_ORDER_NUMBER")
  ) {
    return new Error("ORDER_NOT_ACCESSIBLE");
  }
  return new Error("CUSTOMER_TRACKING_UNAVAILABLE");
}

export async function listCustomerOrders(page = 1): Promise<CustomerOrderSummary[]> {
  const { data, error } = await client().rpc("list_own_account_orders", {
    p_page: page,
    p_page_size: 20,
  });
  if (error) throw trackingError(error);

  return objectArray(data).map((row) => ({
    number: requiredText(row.order_number, "ORDER_NUMBER"),
    status: orderStatus(row.order_status),
    paymentStatus: paymentStatus(row.payment_status),
    totalBob: requiredNumber(row.total_bob, "ORDER_TOTAL"),
    createdAt: requiredText(row.created_at, "ORDER_CREATED_AT"),
    updatedAt: requiredText(row.updated_at, "ORDER_UPDATED_AT"),
    reservationExpiresAt: requiredText(
      row.reservation_expires_at,
      "RESERVATION_EXPIRATION",
    ),
    itemQuantity: requiredNumber(row.item_quantity, "ITEM_QUANTITY"),
    totalCount: requiredNumber(row.total_count, "TOTAL_COUNT"),
  }));
}

export async function getCustomerOrderDetail(
  orderNumber: string,
): Promise<CustomerOrderDetail | null> {
  const { data, error } = await client().rpc("get_own_account_order_detail", {
    p_order_number: orderNumber,
  });
  if (error) throw trackingError(error);
  const row = objectArray(data)[0];
  if (!row) return null;

  return {
    number: requiredText(row.order_number, "ORDER_NUMBER"),
    customerName: requiredText(row.customer_name, "CUSTOMER_NAME"),
    status: orderStatus(row.order_status),
    paymentStatus: paymentStatus(row.payment_status),
    subtotalBob: requiredNumber(row.subtotal_bob, "ORDER_SUBTOTAL"),
    totalBob: requiredNumber(row.total_bob, "ORDER_TOTAL"),
    reservationExpiresAt: requiredText(
      row.reservation_expires_at,
      "RESERVATION_EXPIRATION",
    ),
    paymentReportExpiresAt: requiredText(
      row.payment_report_expires_at,
      "PAYMENT_REPORT_EXPIRATION",
    ),
    paidAt: optionalText(row.paid_at),
    createdAt: requiredText(row.created_at, "ORDER_CREATED_AT"),
    updatedAt: requiredText(row.updated_at, "ORDER_UPDATED_AT"),
    whatsappPhoneE164: requiredText(row.whatsapp_phone_e164, "WHATSAPP_PHONE"),
    items: objectArray(row.items).map((item) => ({
      code: requiredText(item.product_code, "PRODUCT_CODE"),
      name: requiredText(item.product_name, "PRODUCT_NAME"),
      brand: requiredText(item.product_brand, "PRODUCT_BRAND"),
      variant: typeof item.product_variant === "string" ? item.product_variant : "",
      unitPriceBob: requiredNumber(item.unit_price_bob, "UNIT_PRICE"),
      quantity: requiredNumber(item.quantity, "QUANTITY"),
      lineTotalBob: requiredNumber(item.line_total_bob, "LINE_TOTAL"),
    })),
    history: objectArray(row.history).map((entry) => ({
      fromStatus: entry.from_status ? orderStatus(entry.from_status) : null,
      toStatus: orderStatus(entry.to_status),
      fromPaymentStatus: entry.from_payment_status
        ? paymentStatus(entry.from_payment_status)
        : null,
      toPaymentStatus: paymentStatus(entry.to_payment_status),
      createdAt: requiredText(entry.created_at, "HISTORY_CREATED_AT"),
    })),
  };
}

export function customerOrderPresentation(input: {
  status: CustomerOrderStatus;
  paymentStatus: CustomerPaymentStatus;
}): Presentation {
  if (input.paymentStatus === "refunded" || input.status === "refunded") {
    return {
      label: "Reembolsado",
      description: "La devolución de tu dinero fue registrada.",
      help: "Si todavía no ves el dinero, escríbenos indicando el número del pedido.",
      variant: "success",
    };
  }
  if (input.paymentStatus === "refund_pending" || input.status === "refund_pending") {
    return {
      label: "Reembolso pendiente",
      description: "Tu pedido está en proceso de devolución.",
      help: "La administración coordinará la devolución a tu QR por WhatsApp.",
      variant: "warning",
    };
  }
  if (input.paymentStatus === "rejected") {
    return {
      label: "Pago rechazado",
      description: "El pago no pudo ser validado y el pedido fue cancelado.",
      help: "Escríbenos si necesitas revisar el comprobante o el motivo.",
      variant: "warning",
    };
  }
  if (input.status === "cancelled") {
    return {
      label: "Cancelado",
      description: "Este pedido fue cancelado.",
      help: "Puedes crear un pedido nuevo si el producto continúa disponible.",
      variant: "neutral",
    };
  }
  if (input.status === "expired") {
    return {
      label: "Vencido",
      description: "El plazo de reserva terminó antes de confirmar el pago.",
      help: "Si pagaste, escríbenos para coordinar la revisión o devolución.",
      variant: "warning",
    };
  }
  if (input.status === "delivered") {
    return {
      label: "Entregado",
      description: "Tu pedido fue entregado.",
      help: "Gracias por comprar con Belle Perle.",
      variant: "success",
    };
  }
  if (input.status === "ready_for_delivery") {
    return {
      label: "Listo para entregar",
      description: "Tu pedido ya está listo para coordinar la entrega.",
      help: "Escríbenos por WhatsApp para acordar día y lugar.",
      variant: "success",
    };
  }
  if (input.status === "in_transit") {
    return {
      label: "En camino a Bolivia",
      description: "Tu pedido está viajando desde Corea.",
      help: "Te avisaremos cuando esté listo para coordinar la entrega.",
      variant: "success",
    };
  }
  if (input.status === "purchased") {
    return {
      label: "Comprado en Corea",
      description: "El producto ya fue comprado en Corea.",
      help: "El siguiente aviso será cuando comience el traslado a Bolivia.",
      variant: "success",
    };
  }
  if (input.paymentStatus === "paid" || input.status === "confirmed") {
    return {
      label: "Pago confirmado",
      description: "Verificamos tu pago y reservamos las unidades para la compra.",
      help: "Te avisaremos cuando los productos hayan sido comprados en Corea.",
      variant: "success",
    };
  }
  if (input.paymentStatus === "payment_reported") {
    return {
      label: "Pago avisado",
      description: "Recibimos tu aviso y estamos verificando el pago.",
      help: "No necesitas volver a avisar. Te contactaremos si falta información.",
      variant: "warning",
    };
  }
  return {
    label: "Esperando pago",
    description: "Tu pedido está reservado temporalmente y todavía espera el pago.",
    help: "Solicita el QR y avisa el pago por WhatsApp antes del vencimiento.",
    variant: "warning",
  };
}

export function customerTimelineLabel(entry: CustomerOrderHistoryEntry) {
  if (entry.fromStatus === null) return "Pedido creado";
  if (
    entry.toPaymentStatus === "payment_reported" &&
    entry.fromPaymentStatus !== "payment_reported"
  ) {
    return "Aviso de pago recibido";
  }
  if (entry.toPaymentStatus === "paid" && entry.fromPaymentStatus !== "paid") {
    return "Pago confirmado";
  }
  if (entry.toPaymentStatus === "rejected") return "Pago rechazado";
  if (entry.toPaymentStatus === "refund_pending") return "Reembolso pendiente";
  if (entry.toPaymentStatus === "refunded") return "Reembolso completado";

  const labels: Partial<Record<CustomerOrderStatus, string>> = {
    confirmed: "Pedido confirmado",
    purchased: "Productos comprados en Corea",
    in_transit: "Pedido en camino a Bolivia",
    ready_for_delivery: "Pedido listo para entregar",
    delivered: "Pedido entregado",
    expired: "Reserva vencida",
    cancelled: "Pedido cancelado",
  };
  return labels[entry.toStatus] ?? "Estado actualizado";
}

export const customerOrderStatusLabels: Record<CustomerOrderStatus, string> = {
  pending_payment: "Pendiente de pago",
  confirmed: "Confirmado",
  purchased: "Comprado en Corea",
  in_transit: "En camino a Bolivia",
  ready_for_delivery: "Listo para entregar",
  delivered: "Entregado",
  expired: "Vencido",
  cancelled: "Cancelado",
  refund_pending: "Reembolso pendiente",
  refunded: "Reembolsado",
};

export const customerPaymentStatusLabels: Record<CustomerPaymentStatus, string> = {
  awaiting_payment: "Esperando pago",
  payment_reported: "Pago avisado",
  paid: "Pagado",
  rejected: "Pago rechazado",
  refund_pending: "Reembolso pendiente",
  refunded: "Reembolsado",
};
