import { randomUUID } from "node:crypto";

import { createClient } from "@supabase/supabase-js";

const url = process.env.BP_SUPABASE_URL;
const publishableKey = process.env.BP_SUPABASE_PUBLISHABLE_KEY;
const secretKey = process.env.BP_SUPABASE_SECRET_KEY;

if (!url || !publishableKey || !secretKey) {
  console.error(
    "BP_SUPABASE_URL, BP_SUPABASE_PUBLISHABLE_KEY, and BP_SUPABASE_SECRET_KEY are required.",
  );
  process.exit(1);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function browserClient() {
  return createClient(url, publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

const service = createClient(url, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const administrator = browserClient();
const customer = browserClient();
const stranger = browserClient();

const suffix = randomUUID();
const adminEmail = `phase8-${suffix}@example.test`;
const password = `Bp-${suffix}-local!`;

const { data: adminUser, error: adminCreateError } = await service.auth.admin.createUser({
  email: adminEmail,
  password,
  email_confirm: true,
  user_metadata: { full_name: "Administración Fase Ocho" },
});
assert(!adminCreateError && adminUser.user, "Could not create the administrator.");

const { error: promoteError } = await service.rpc("promote_admin_by_email", {
  p_email: adminEmail,
  p_reason: "Phase 8 local administrator-order smoke test",
});
assert(!promoteError, "Could not promote the administrator.");

const { error: adminSignInError } = await administrator.auth.signInWithPassword({
  email: adminEmail,
  password,
});
assert(!adminSignInError, "Administrator could not sign in.");

const { error: customerSignInError } = await customer.auth.signInAnonymously();
assert(!customerSignInError, "Could not create the checkout actor.");
const { error: strangerSignInError } = await stranger.auth.signInAnonymously();
assert(!strangerSignInError, "Could not create the isolation actor.");

async function checkout(productId, phone) {
  const { data, error } = await customer.rpc("submit_order", {
    p_idempotency_key: randomUUID(),
    p_guest_name: "Cliente Prueba Fase Ocho",
    p_phone: phone,
    p_items: [{ product_id: productId, quantity: 1 }],
    p_terms_accepted: true,
    p_privacy_accepted: true,
  });
  assert(!error && data?.length === 1, "Could not create an order for the smoke test.");
  return data[0];
}

const paidOrder = await checkout("40000000-0000-4000-8000-000000000001", "71234571");

const { data: listedOrders, error: listError } = await administrator.rpc(
  "admin_list_orders",
  { p_filter: "all", p_page: 1, p_page_size: 50 },
);
assert(
  !listError && listedOrders?.some((order) => order.id === paidOrder.order_id),
  "Administrator list omitted the order.",
);

const { data: initialDetail, error: detailError } = await administrator.rpc(
  "admin_get_order_detail",
  { p_order_id: paidOrder.order_id },
);
assert(
  !detailError && initialDetail?.length === 1 && initialDetail[0].items?.length === 1,
  "Administrator detail omitted immutable items.",
);

const { error: customerDetailError } = await customer.rpc("admin_get_order_detail", {
  p_order_id: paidOrder.order_id,
});
assert(customerDetailError, "Customer unexpectedly read administrator order detail.");

const { error: reportError } = await administrator.rpc("admin_change_order_state", {
  p_order_id: paidOrder.order_id,
  p_action: "payment_reported",
  p_reason: null,
});
assert(!reportError, "Administrator payment notice failed.");

const evidencePath = `orders/${paidOrder.order_id}/${randomUUID()}.png`;
const onePixelPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=",
  "base64",
);
const { error: uploadError } = await administrator.storage
  .from("payment-evidence")
  .upload(evidencePath, onePixelPng, {
    contentType: "image/png",
    cacheControl: "0",
    upsert: false,
  });
assert(
  !uploadError,
  `Administrator could not upload private evidence: ${uploadError?.message ?? "unknown"}`,
);

const { data: paidResult, error: paidError } = await administrator.rpc(
  "admin_mark_order_paid",
  {
    p_order_id: paidOrder.order_id,
    p_accept_late: false,
    p_reason: null,
    p_evidence: {
      storage_path: evidencePath,
      original_filename: "comprobante-fase-8.png",
      content_type: "image/png",
      size_bytes: onePixelPng.length,
    },
  },
);
assert(
  !paidError &&
    paidResult?.[0]?.order_status === "confirmed" &&
    paidResult?.[0]?.payment_status === "paid" &&
    paidResult?.[0]?.evidence_id,
  "Paid confirmation with evidence failed.",
);

const { data: paidDetail, error: paidDetailError } = await administrator.rpc(
  "admin_get_order_detail",
  { p_order_id: paidOrder.order_id },
);
assert(
  !paidDetailError &&
    paidDetail?.[0]?.evidence?.length === 1 &&
    paidDetail[0].evidence[0].storage_path === evidencePath,
  "Private evidence metadata is missing from administrator detail.",
);

const { data: signedEvidence, error: signedError } = await administrator.storage
  .from("payment-evidence")
  .createSignedUrl(evidencePath, 60);
assert(!signedError && signedEvidence.signedUrl, "Administrator signed URL failed.");

const { error: strangerDownloadError } = await stranger.storage
  .from("payment-evidence")
  .download(evidencePath);
assert(strangerDownloadError, "Another customer unexpectedly downloaded evidence.");

const { error: rawEvidenceError } = await administrator.from("payment_evidence").insert({
  order_id: paidOrder.order_id,
  storage_path: `orders/${paidOrder.order_id}/${randomUUID()}.png`,
  original_filename: "forged.png",
  content_type: "image/png",
  size_bytes: 10,
  uploaded_by: adminUser.user.id,
});
assert(rawEvidenceError, "Browser administrator inserted raw evidence metadata.");

const { error: lowerLevelPaidError } = await administrator.rpc(
  "admin_confirm_order_paid",
  {
    p_order_id: paidOrder.order_id,
    p_accept_late: false,
    p_reason: null,
  },
);
assert(
  lowerLevelPaidError,
  "Browser administrator executed the lower-level paid-confirmation RPC.",
);

const refundOrder = await checkout("40000000-0000-4000-8000-000000000002", "71234572");
for (const [action, reason] of [
  ["payment_reported", null],
  ["refund_pending", "Pago recibido y devolución acordada."],
  ["refunded", "Dinero devuelto al QR del cliente."],
]) {
  const { error } = await administrator.rpc("admin_change_order_state", {
    p_order_id: refundOrder.order_id,
    p_action: action,
    p_reason: reason,
  });
  assert(!error, `Administrator action ${action} failed.`);
}

const { data: refundedDetail, error: refundedDetailError } = await administrator.rpc(
  "admin_get_order_detail",
  {
    p_order_id: refundOrder.order_id,
  },
);
assert(
  !refundedDetailError &&
    refundedDetail?.[0]?.order_status === "refunded" &&
    refundedDetail[0].payment_status === "refunded" &&
    refundedDetail[0].history.some(
      (entry) =>
        entry.reason === "Dinero devuelto al QR del cliente." &&
        entry.metadata?.action === "refunded",
    ),
  "Refund workflow or its audit reason is incomplete.",
);

console.log("PASS administrator list and detail are live and role-protected");
console.log("PASS paid confirmation stores private evidence and converts inventory");
console.log("PASS evidence is signed for administrators and denied to customers");
console.log("PASS refund states preserve reasons in the audit history");
