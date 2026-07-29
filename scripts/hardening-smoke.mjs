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
const firstCustomer = browserClient();
const secondCustomer = browserClient();
const administrator = browserClient();

const suffix = randomUUID();
const adminEmail = `phase10-${suffix}@example.test`;
const password = `Bp-${suffix}-local!`;
const { data: createdAdmin, error: createAdminError } =
  await service.auth.admin.createUser({
    email: adminEmail,
    password,
    email_confirm: true,
    user_metadata: { full_name: "Administración Hardening" },
  });
assert(!createAdminError && createdAdmin.user, "Could not create the hardening admin.");
const { error: promoteError } = await service.rpc("promote_admin_by_email", {
  p_email: adminEmail,
  p_reason: "Phase 10 local hardening smoke test",
});
assert(!promoteError, "Could not promote the hardening administrator.");
const { error: adminSignInError } = await administrator.auth.signInWithPassword({
  email: adminEmail,
  password,
});
assert(!adminSignInError, "Hardening administrator could not sign in.");

for (const customer of [firstCustomer, secondCustomer]) {
  const { error } = await customer.auth.signInAnonymously();
  assert(!error, "Could not create a concurrent checkout identity.");
}

const finalUnitProduct = randomUUID();
const paymentWindowProduct = "40000000-0000-4000-8000-000000000002";
const repricedProduct = "40000000-0000-4000-8000-000000000003";

const { error: stockSetupError } = await administrator.rpc("admin_create_product", {
  p_product_id: finalUnitProduct,
  p_name: "Última unidad Hardening",
  p_brand: "Belle Perle",
  p_category_id: "10000000-0000-4000-8000-000000000001",
  p_description: "Producto temporal para la prueba concurrente.",
  p_variant: "1 unidad",
  p_price_krw: 21_000,
  p_total_stock: 1,
  p_product_margin_bob: 42,
  p_status: "active",
  p_images: [],
});
assert(
  !stockSetupError,
  `Could not prepare the final-unit concurrency test: ${stockSetupError?.message ?? "unknown"}`,
);

const firstKey = randomUUID();
const secondKey = randomUUID();
function checkout(client, key, productId, phone) {
  return client.rpc("submit_order", {
    p_idempotency_key: key,
    p_guest_name: "Cliente Prueba Hardening",
    p_phone: phone,
    p_items: [{ product_id: productId, quantity: 1 }],
    p_terms_accepted: true,
    p_privacy_accepted: true,
  });
}

const concurrentResults = await Promise.all([
  checkout(firstCustomer, firstKey, finalUnitProduct, "71234601"),
  checkout(secondCustomer, secondKey, finalUnitProduct, "71234602"),
]);
const successfulIndexes = concurrentResults
  .map((result, index) => (!result.error && result.data?.length === 1 ? index : -1))
  .filter((index) => index >= 0);
const failedResults = concurrentResults.filter((result) => result.error);
assert(
  successfulIndexes.length === 1 && failedResults.length === 1,
  "Concurrent checkout did not produce exactly one winner for the final unit.",
);
assert(
  failedResults[0].error.message.includes("INSUFFICIENT_STOCK"),
  "The losing checkout did not receive the safe insufficient-stock result.",
);

const winnerIndex = successfulIndexes[0];
const winningClient = winnerIndex === 0 ? firstCustomer : secondCustomer;
const winningKey = winnerIndex === 0 ? firstKey : secondKey;
const winningOrder = concurrentResults[winnerIndex].data[0];
const retry = await checkout(
  winningClient,
  winningKey,
  finalUnitProduct,
  winnerIndex === 0 ? "71234601" : "71234602",
);
assert(
  !retry.error && retry.data?.[0]?.order_id === winningOrder.order_id,
  "A concurrent winner retry created or returned a different order.",
);

const reservationMinutes =
  (new Date(winningOrder.reservation_expires_at).getTime() - Date.now()) / 60_000;
const paymentMinutes =
  (new Date(winningOrder.payment_report_expires_at).getTime() - Date.now()) / 60_000;
assert(
  reservationMinutes > 14 &&
    reservationMinutes <= 15.1 &&
    paymentMinutes > 24 &&
    paymentMinutes <= 25.1,
  "The authoritative 15/25-minute deadlines are incorrect.",
);

const paymentOrderResult = await checkout(
  secondCustomer,
  randomUUID(),
  paymentWindowProduct,
  "71234603",
);
assert(
  !paymentOrderResult.error && paymentOrderResult.data?.length === 1,
  "Could not create the payment-window order.",
);
const paymentOrder = paymentOrderResult.data[0];
for (let attempt = 0; attempt < 2; attempt += 1) {
  const { error } = await secondCustomer.rpc("report_own_order_payment", {
    p_order_id: paymentOrder.order_id,
  });
  assert(!error, "Repeated payment reporting was not idempotent.");
}
const { data: reportedRows, error: reportedReadError } = await secondCustomer.rpc(
  "get_own_order_confirmation",
  { p_order_id: paymentOrder.order_id },
);
const reportedOrder = reportedRows?.[0];
assert(
  !reportedReadError &&
    reportedOrder?.payment_status === "payment_reported" &&
    reportedOrder?.reservation_expires_at === reportedOrder?.payment_report_expires_at,
  "Payment reporting did not preserve the minute-25 extension.",
);

const repricedOrderResult = await checkout(
  firstCustomer,
  randomUUID(),
  repricedProduct,
  "71234604",
);
assert(!repricedOrderResult.error, "Could not create an order before bulk repricing.");
const repricedOrder = repricedOrderResult.data[0];
const { data: originalDetail, error: originalItemError } = await administrator.rpc(
  "admin_get_order_detail",
  { p_order_id: repricedOrder.order_id },
);
const originalItem = originalDetail?.[0]?.items?.[0];
assert(
  !originalItemError && originalItem,
  "Could not read the original immutable price snapshot.",
);

const observedForDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/La_Paz",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());
const { data: rateId, error: rateError } = await administrator.rpc(
  "admin_create_exchange_rate",
  {
    p_observed_for_date: observedForDate,
    p_source_url: "https://www.bcb.gob.bo/",
    p_krw_per_usd: 1_250,
    p_bcb_bob_per_usd: 7.15,
    p_bank_spread_bob_per_usd: 0.35,
    p_notes: "Phase 10 immutable cart snapshot test",
  },
);
assert(!rateError && rateId, "Could not create the reviewed hardening rate.");
const { error: refreshError } = await administrator.rpc(
  "admin_refresh_available_prices_now",
  { p_exchange_rate_id: rateId },
);
assert(!refreshError, "Bulk repricing failed with products in active orders.");
const { data: refreshedDetail, error: refreshedItemError } = await administrator.rpc(
  "admin_get_order_detail",
  { p_order_id: repricedOrder.order_id },
);
const itemAfterRefresh = refreshedDetail?.[0]?.items?.[0];
assert(
  !refreshedItemError &&
    itemAfterRefresh?.unit_price_bob === originalItem?.unit_price_bob &&
    itemAfterRefresh?.line_total_bob === originalItem?.line_total_bob,
  "Bulk repricing changed an existing order snapshot.",
);

const validEvidencePath = `orders/${paymentOrder.order_id}/${randomUUID()}.png`;
const invalidEvidencePath = `temporary/${randomUUID()}.png`;
const onePixelPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=",
  "base64",
);
const { error: invalidPathError } = await administrator.storage
  .from("payment-evidence")
  .upload(invalidEvidencePath, onePixelPng, {
    contentType: "image/png",
    cacheControl: "0",
  });
assert(invalidPathError, "Evidence Storage accepted a path outside an order directory.");
const { error: evidenceUploadError } = await administrator.storage
  .from("payment-evidence")
  .upload(validEvidencePath, onePixelPng, {
    contentType: "image/png",
    cacheControl: "0",
  });
assert(!evidenceUploadError, "A valid private evidence upload was rejected.");
const { error: metadataMismatchError } = await administrator.rpc(
  "admin_attach_payment_evidence",
  {
    p_order_id: paymentOrder.order_id,
    p_storage_path: validEvidencePath,
    p_original_filename: "comprobante.png",
    p_content_type: "image/png",
    p_size_bytes: onePixelPng.length + 1,
  },
);
assert(
  metadataMismatchError?.message.includes("EVIDENCE_METADATA_MISMATCH"),
  "Evidence metadata mismatch was not rejected.",
);
const { error: evidenceAttachError } = await administrator.rpc(
  "admin_attach_payment_evidence",
  {
    p_order_id: paymentOrder.order_id,
    p_storage_path: validEvidencePath,
    p_original_filename: "comprobante.png",
    p_content_type: "image/png",
    p_size_bytes: onePixelPng.length,
  },
);
assert(!evidenceAttachError, "Matching private evidence metadata was rejected.");
const { error: customerEvidenceError } = await firstCustomer.storage
  .from("payment-evidence")
  .download(validEvidencePath);
assert(customerEvidenceError, "A customer downloaded private payment evidence.");

console.log("PASS simultaneous checkout allows one winner for the final unit");
console.log("PASS idempotent retry preserves authoritative 15/25-minute deadlines");
console.log("PASS payment reporting is idempotent and extends to minute 25");
console.log("PASS bulk repricing preserves existing order snapshots");
console.log("PASS evidence paths and stored metadata are validated");
console.log("PASS customers remain unable to download private evidence");
