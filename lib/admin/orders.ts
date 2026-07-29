"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export type AdminOrderFilter =
  "all" | "payment_reported" | "paid" | "expired" | "refund_pending" | "refunded";

export type AdminOrderStatus =
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

export type AdminPaymentStatus =
  | "awaiting_payment"
  | "payment_reported"
  | "paid"
  | "rejected"
  | "refund_pending"
  | "refunded";

export type AdminOrderSummary = {
  id: string;
  number: string;
  customerName: string;
  phoneE164: string;
  status: AdminOrderStatus;
  paymentStatus: AdminPaymentStatus;
  totalBob: number;
  createdAt: string;
  reservationExpiresAt: string;
  itemQuantity: number;
  evidenceCount: number;
};

export type AdminOrderItem = {
  id: string;
  code: string;
  name: string;
  brand: string;
  variant: string;
  unitPriceBob: number;
  quantity: number;
  lineTotalBob: number;
};

export type AdminPaymentEvidence = {
  id: string;
  storagePath: string;
  originalFilename: string;
  contentType: string;
  sizeBytes: number;
  uploadedBy: string;
  uploadedByName: string;
  createdAt: string;
};

export type AdminOrderHistoryEntry = {
  id: number;
  fromStatus: AdminOrderStatus | null;
  toStatus: AdminOrderStatus;
  fromPaymentStatus: AdminPaymentStatus | null;
  toPaymentStatus: AdminPaymentStatus;
  actorName: string;
  reason: string | null;
  action: string | null;
  createdAt: string;
};

export type AdminOrderOverride = {
  type: string;
  reason: string;
  createdByName: string;
  createdAt: string;
};

export type AdminOrderDetail = AdminOrderSummary & {
  subtotalBob: number;
  paymentReportExpiresAt: string;
  paidAt: string | null;
  updatedAt: string;
  termsAcceptedAt: string | null;
  privacyAcceptedAt: string | null;
  items: AdminOrderItem[];
  evidence: AdminPaymentEvidence[];
  history: AdminOrderHistoryEntry[];
  overrides: AdminOrderOverride[];
};

export type AdminOrderAction =
  "payment_reported" | "reject_payment" | "cancel" | "refund_pending" | "refunded";

export type AdminFulfillmentStatus =
  "purchased" | "in_transit" | "ready_for_delivery" | "delivered";

export type EvidenceUpload = {
  storagePath: string;
  originalFilename: string;
  contentType: string;
  sizeBytes: number;
};

const orderStatuses = new Set<AdminOrderStatus>([
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

const paymentStatuses = new Set<AdminPaymentStatus>([
  "awaiting_payment",
  "payment_reported",
  "paid",
  "rejected",
  "refund_pending",
  "refunded",
]);

const evidenceTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
export const MAX_EVIDENCE_BYTES = 10 * 1024 * 1024;

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

function orderStatus(value: unknown) {
  const status = requiredText(value, "ORDER_STATUS") as AdminOrderStatus;
  if (!orderStatuses.has(status)) throw new Error("INVALID_ORDER_STATUS");
  return status;
}

function paymentStatus(value: unknown) {
  const status = requiredText(value, "PAYMENT_STATUS") as AdminPaymentStatus;
  if (!paymentStatuses.has(status)) throw new Error("INVALID_PAYMENT_STATUS");
  return status;
}

function objectArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter(
        (item): item is Record<string, unknown> =>
          Boolean(item) && typeof item === "object",
      )
    : [];
}

function mapSummary(row: Record<string, unknown>): AdminOrderSummary {
  return {
    id: requiredText(row.id, "ORDER_ID"),
    number: requiredText(row.order_number, "ORDER_NUMBER"),
    customerName: requiredText(row.customer_name, "CUSTOMER_NAME"),
    phoneE164: requiredText(row.phone_e164, "PHONE"),
    status: orderStatus(row.order_status),
    paymentStatus: paymentStatus(row.payment_status),
    totalBob: requiredNumber(row.total_bob, "TOTAL"),
    createdAt: requiredText(row.created_at, "CREATED_AT"),
    reservationExpiresAt: requiredText(
      row.reservation_expires_at,
      "RESERVATION_EXPIRATION",
    ),
    itemQuantity: requiredNumber(row.item_quantity, "ITEM_QUANTITY"),
    evidenceCount: requiredNumber(row.evidence_count, "EVIDENCE_COUNT"),
  };
}

function adminError(error: { message?: string } | null) {
  const message = error?.message ?? "";
  for (const code of [
    "ORDER_NOT_FOUND",
    "ORDER_REASON_REQUIRED",
    "PAYMENT_CONFIRMATION_NOT_ALLOWED",
    "LATE_PAYMENT_REQUIRES_OVERRIDE",
    "INSUFFICIENT_STOCK",
    "ITEM_UNAVAILABLE",
    "PAYMENT_REPORT_NOT_ALLOWED",
    "PAYMENT_REJECTION_NOT_ALLOWED",
    "ORDER_CANCELLATION_NOT_ALLOWED",
    "REFUND_NOT_ALLOWED",
    "REFUND_COMPLETION_NOT_ALLOWED",
    "INVALID_FULFILLMENT_STATUS",
    "FULFILLMENT_TRANSITION_NOT_ALLOWED",
    "INVALID_EVIDENCE_PATH",
    "INVALID_EVIDENCE_FILE",
    "EVIDENCE_METADATA_MISMATCH",
    "EVIDENCE_OBJECT_NOT_FOUND",
  ]) {
    if (message.includes(code)) return new Error(code);
  }
  return new Error("ADMIN_ORDER_REQUEST_FAILED");
}

export async function listAdminOrders(
  filter: AdminOrderFilter,
): Promise<AdminOrderSummary[]> {
  const { data, error } = await client().rpc("admin_list_orders", {
    p_filter: filter,
    p_page: 1,
    p_page_size: 50,
  });
  if (error) throw adminError(error);
  return objectArray(data).map(mapSummary);
}

export async function getAdminOrderDetail(
  orderId: string,
): Promise<AdminOrderDetail | null> {
  const { data, error } = await client().rpc("admin_get_order_detail", {
    p_order_id: orderId,
  });
  if (error) throw adminError(error);
  const row = objectArray(data)[0];
  if (!row) return null;

  const items = objectArray(row.items).map((item) => ({
    id: requiredText(item.id, "ITEM_ID"),
    code: requiredText(item.product_code, "PRODUCT_CODE"),
    name: requiredText(item.product_name, "PRODUCT_NAME"),
    brand: requiredText(item.product_brand, "PRODUCT_BRAND"),
    variant: typeof item.product_variant === "string" ? item.product_variant : "",
    unitPriceBob: requiredNumber(item.unit_price_bob, "UNIT_PRICE"),
    quantity: requiredNumber(item.quantity, "QUANTITY"),
    lineTotalBob: requiredNumber(item.line_total_bob, "LINE_TOTAL"),
  }));
  const evidence = objectArray(row.evidence).map((item) => ({
    id: requiredText(item.id, "EVIDENCE_ID"),
    storagePath: requiredText(item.storage_path, "EVIDENCE_PATH"),
    originalFilename: requiredText(item.original_filename, "EVIDENCE_NAME"),
    contentType: requiredText(item.content_type, "EVIDENCE_TYPE"),
    sizeBytes: requiredNumber(item.size_bytes, "EVIDENCE_SIZE"),
    uploadedBy: requiredText(item.uploaded_by, "EVIDENCE_UPLOADER"),
    uploadedByName: requiredText(item.uploaded_by_name, "EVIDENCE_UPLOADER_NAME"),
    createdAt: requiredText(item.created_at, "EVIDENCE_CREATED_AT"),
  }));
  const history = objectArray(row.history).map((item) => {
    const metadata =
      item.metadata && typeof item.metadata === "object"
        ? (item.metadata as Record<string, unknown>)
        : {};
    return {
      id: requiredNumber(item.id, "HISTORY_ID"),
      fromStatus: item.from_status ? orderStatus(item.from_status) : null,
      toStatus: orderStatus(item.to_status),
      fromPaymentStatus: item.from_payment_status
        ? paymentStatus(item.from_payment_status)
        : null,
      toPaymentStatus: paymentStatus(item.to_payment_status),
      actorName: requiredText(item.actor_name, "HISTORY_ACTOR"),
      reason: optionalText(item.reason),
      action: optionalText(metadata.action),
      createdAt: requiredText(item.created_at, "HISTORY_CREATED_AT"),
    };
  });
  const overrides = objectArray(row.overrides).map((item) => ({
    type: requiredText(item.type, "OVERRIDE_TYPE"),
    reason: requiredText(item.reason, "OVERRIDE_REASON"),
    createdByName: requiredText(item.created_by_name, "OVERRIDE_ACTOR"),
    createdAt: requiredText(item.created_at, "OVERRIDE_CREATED_AT"),
  }));

  return {
    ...mapSummary({
      ...row,
      item_quantity: items.reduce((sum, item) => sum + item.quantity, 0),
      evidence_count: evidence.length,
    }),
    subtotalBob: requiredNumber(row.subtotal_bob, "SUBTOTAL"),
    paymentReportExpiresAt: requiredText(
      row.payment_report_expires_at,
      "PAYMENT_EXPIRATION",
    ),
    paidAt: optionalText(row.paid_at),
    updatedAt: requiredText(row.updated_at, "UPDATED_AT"),
    termsAcceptedAt: optionalText(row.terms_accepted_at),
    privacyAcceptedAt: optionalText(row.privacy_accepted_at),
    items,
    evidence,
    history,
    overrides,
  };
}

export async function changeAdminOrderState(
  orderId: string,
  action: AdminOrderAction,
  reason?: string,
) {
  const { error } = await client().rpc("admin_change_order_state", {
    p_order_id: orderId,
    p_action: action,
    p_reason: reason?.trim() || null,
  });
  if (error) throw adminError(error);
}

export async function advanceAdminOrderFulfillment(
  orderId: string,
  nextStatus: AdminFulfillmentStatus,
) {
  const { error } = await client().rpc("admin_advance_order_fulfillment", {
    p_order_id: orderId,
    p_next_status: nextStatus,
  });
  if (error) throw adminError(error);
}

export function validateEvidenceFile(file: Pick<File, "size" | "type">) {
  if (!evidenceTypes.has(file.type)) {
    return "Usa una imagen JPEG, PNG o WebP.";
  }
  if (file.size < 1 || file.size > MAX_EVIDENCE_BYTES) {
    return "La imagen debe pesar como máximo 10 MB.";
  }
  return null;
}

export async function validateEvidenceFileContent(file: Pick<File, "slice" | "type">) {
  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const isJpeg = header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
  const isPng =
    header[0] === 0x89 &&
    header[1] === 0x50 &&
    header[2] === 0x4e &&
    header[3] === 0x47 &&
    header[4] === 0x0d &&
    header[5] === 0x0a &&
    header[6] === 0x1a &&
    header[7] === 0x0a;
  const isWebp =
    header[0] === 0x52 &&
    header[1] === 0x49 &&
    header[2] === 0x46 &&
    header[3] === 0x46 &&
    header[8] === 0x57 &&
    header[9] === 0x45 &&
    header[10] === 0x42 &&
    header[11] === 0x50;
  const contentMatches =
    (file.type === "image/jpeg" && isJpeg) ||
    (file.type === "image/png" && isPng) ||
    (file.type === "image/webp" && isWebp);

  return contentMatches
    ? null
    : "El contenido del archivo no coincide con una imagen JPEG, PNG o WebP válida.";
}

function evidenceExtension(contentType: string) {
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  return "jpg";
}

async function uploadEvidence(orderId: string, file: File): Promise<EvidenceUpload> {
  const validation = validateEvidenceFile(file);
  if (validation) throw new Error("INVALID_EVIDENCE_FILE");
  if (await validateEvidenceFileContent(file)) {
    throw new Error("INVALID_EVIDENCE_CONTENT");
  }

  const storagePath = `orders/${orderId}/${crypto.randomUUID()}.${evidenceExtension(file.type)}`;
  const { error } = await client()
    .storage.from("payment-evidence")
    .upload(storagePath, file, {
      contentType: file.type,
      cacheControl: "0",
      upsert: false,
    });
  if (error) throw new Error("EVIDENCE_UPLOAD_FAILED");

  return {
    storagePath,
    originalFilename: file.name,
    contentType: file.type,
    sizeBytes: file.size,
  };
}

async function removeEvidenceObject(path: string) {
  await client().storage.from("payment-evidence").remove([path]);
}

export async function markAdminOrderPaid(input: {
  orderId: string;
  acceptLate: boolean;
  reason?: string;
  file?: File | null;
}) {
  const evidence = input.file ? await uploadEvidence(input.orderId, input.file) : null;
  const { error } = await client().rpc("admin_mark_order_paid", {
    p_order_id: input.orderId,
    p_accept_late: input.acceptLate,
    p_reason: input.reason?.trim() || null,
    p_evidence: evidence
      ? {
          storage_path: evidence.storagePath,
          original_filename: evidence.originalFilename,
          content_type: evidence.contentType,
          size_bytes: evidence.sizeBytes,
        }
      : null,
  });
  if (error) {
    if (evidence) await removeEvidenceObject(evidence.storagePath);
    throw adminError(error);
  }
}

export async function attachAdminPaymentEvidence(orderId: string, file: File) {
  const evidence = await uploadEvidence(orderId, file);
  const { error } = await client().rpc("admin_attach_payment_evidence", {
    p_order_id: orderId,
    p_storage_path: evidence.storagePath,
    p_original_filename: evidence.originalFilename,
    p_content_type: evidence.contentType,
    p_size_bytes: evidence.sizeBytes,
  });
  if (error) {
    await removeEvidenceObject(evidence.storagePath);
    throw adminError(error);
  }
}

export async function getAdminEvidenceUrl(path: string) {
  const { data, error } = await client()
    .storage.from("payment-evidence")
    .createSignedUrl(path, 300);
  if (error || !data.signedUrl) throw new Error("EVIDENCE_LINK_FAILED");
  return data.signedUrl;
}

export const orderStatusLabels: Record<AdminOrderStatus, string> = {
  pending_payment: "Pendiente de pago",
  confirmed: "Confirmado",
  purchased: "Comprado",
  in_transit: "En tránsito",
  ready_for_delivery: "Listo para entregar",
  delivered: "Entregado",
  expired: "Vencido",
  cancelled: "Cancelado",
  refund_pending: "Reembolso pendiente",
  refunded: "Reembolsado",
};

export const paymentStatusLabels: Record<AdminPaymentStatus, string> = {
  awaiting_payment: "Esperando pago",
  payment_reported: "Pago avisado",
  paid: "Pagado",
  rejected: "Pago rechazado",
  refund_pending: "Reembolso pendiente",
  refunded: "Reembolsado",
};
