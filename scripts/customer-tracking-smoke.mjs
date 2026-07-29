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
const owner = browserClient();
const otherAccount = browserClient();
const guest = browserClient();
const administrator = browserClient();

const suffix = randomUUID();
const password = `Bp-${suffix}-local!`;
const ownerEmail = `phase9-owner-${suffix}@example.test`;
const otherEmail = `phase9-other-${suffix}@example.test`;
const adminEmail = `phase9-admin-${suffix}@example.test`;

for (const [email, fullName] of [
  [ownerEmail, "Cliente Seguimiento"],
  [otherEmail, "Otra Cuenta"],
  [adminEmail, "Administración Seguimiento"],
]) {
  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, phone: "71234591" },
  });
  assert(!error && data.user, `Could not create ${fullName}.`);
}

const { error: promoteError } = await service.rpc("promote_admin_by_email", {
  p_email: adminEmail,
  p_reason: "Phase 9 local customer-tracking smoke test",
});
assert(!promoteError, "Could not promote the tracking administrator.");

for (const [client, email] of [
  [owner, ownerEmail],
  [otherAccount, otherEmail],
  [administrator, adminEmail],
]) {
  const { error } = await client.auth.signInWithPassword({ email, password });
  assert(!error, `Could not sign in ${email}.`);
}
const { error: guestSignInError } = await guest.auth.signInAnonymously();
assert(!guestSignInError, "Could not create the guest checkout identity.");

async function checkout(client, productId, name) {
  const { data, error } = await client.rpc("submit_order", {
    p_idempotency_key: randomUUID(),
    p_guest_name: name,
    p_phone: "71234591",
    p_items: [{ product_id: productId, quantity: 1 }],
    p_terms_accepted: true,
    p_privacy_accepted: true,
  });
  assert(!error && data?.length === 1, `Could not create order for ${name}.`);
  return data[0];
}

const accountOrder = await checkout(
  owner,
  "40000000-0000-4000-8000-000000000001",
  "Cliente Seguimiento",
);
const guestOrder = await checkout(
  guest,
  "40000000-0000-4000-8000-000000000002",
  "Invitado Mismo Teléfono",
);

const { data: ownerOrders, error: ownerListError } = await owner.rpc(
  "list_own_account_orders",
  { p_page: 1, p_page_size: 20 },
);
assert(
  !ownerListError &&
    ownerOrders?.length === 1 &&
    ownerOrders[0].order_number === accountOrder.order_number &&
    ownerOrders[0].order_number !== guestOrder.order_number,
  "Account history mixed owned and guest orders.",
);

const { data: initialDetail, error: initialDetailError } = await owner.rpc(
  "get_own_account_order_detail",
  { p_order_number: accountOrder.order_number },
);
assert(
  !initialDetailError &&
    initialDetail?.length === 1 &&
    initialDetail[0].items?.length === 1 &&
    initialDetail[0].history?.length === 1,
  "Customer-safe account detail is incomplete.",
);
assert(
  !("reason" in initialDetail[0].history[0]) &&
    !("metadata" in initialDetail[0].history[0]) &&
    !("actor_id" in initialDetail[0].history[0]),
  "Customer timeline exposed administrative audit fields.",
);

const { error: rawOrdersError } = await owner.from("orders").select("*").limit(1);
const { error: rawItemsError } = await owner.from("order_items").select("*").limit(1);
const { error: rawHistoryError } = await owner
  .from("order_status_history")
  .select("*")
  .limit(1);
assert(
  rawOrdersError && rawItemsError && rawHistoryError,
  "Account unexpectedly read raw order tables.",
);

const { data: otherOrders, error: otherListError } = await otherAccount.rpc(
  "list_own_account_orders",
  { p_page: 1, p_page_size: 20 },
);
assert(
  !otherListError && otherOrders?.length === 0,
  "Matching phone claimed another account's order.",
);
const { error: otherDetailError } = await otherAccount.rpc(
  "get_own_account_order_detail",
  { p_order_number: accountOrder.order_number },
);
assert(otherDetailError, "Another account read the owned order detail.");

const { error: guestListError } = await guest.rpc("list_own_account_orders", {
  p_page: 1,
  p_page_size: 20,
});
const { error: guestDetailError } = await guest.rpc("get_own_account_order_detail", {
  p_order_number: guestOrder.order_number,
});
assert(
  guestListError && guestDetailError,
  "Guest checkout identity unexpectedly gained web history.",
);

const { error: paymentReportError } = await administrator.rpc(
  "admin_change_order_state",
  {
    p_order_id: accountOrder.order_id,
    p_action: "payment_reported",
    p_reason: null,
  },
);
assert(!paymentReportError, "Administrator could not register payment.");
const { error: paidError } = await administrator.rpc("admin_mark_order_paid", {
  p_order_id: accountOrder.order_id,
  p_accept_late: false,
  p_reason: null,
  p_evidence: null,
});
assert(!paidError, "Administrator could not confirm account order payment.");

const { data: paidDetail, error: paidDetailError } = await owner.rpc(
  "get_own_account_order_detail",
  { p_order_number: accountOrder.order_number },
);
assert(
  !paidDetailError &&
    paidDetail?.[0]?.order_status === "confirmed" &&
    paidDetail[0].payment_status === "paid" &&
    paidDetail[0].history?.length === 3,
  "Customer timeline did not reflect administrator payment confirmation.",
);

const { error: purchasedError } = await administrator.rpc(
  "admin_advance_order_fulfillment",
  {
    p_order_id: accountOrder.order_id,
    p_next_status: "purchased",
  },
);
assert(!purchasedError, "Administrator could not advance the order to purchased.");
const { data: purchasedDetail, error: purchasedDetailError } = await owner.rpc(
  "get_own_account_order_detail",
  { p_order_number: accountOrder.order_number },
);
assert(
  !purchasedDetailError &&
    purchasedDetail?.[0]?.order_status === "purchased" &&
    purchasedDetail[0].payment_status === "paid" &&
    purchasedDetail[0].history?.length === 4,
  "Customer timeline did not receive the purchasing update.",
);

console.log("PASS permanent account sees only orders created with that account");
console.log("PASS matching phone never claims guest or another account order");
console.log("PASS guests and other accounts cannot open customer tracking detail");
console.log("PASS raw order tables remain closed to browser identities");
console.log("PASS customer-safe timeline reflects payment without internal audit data");
console.log("PASS administrator fulfillment updates reach customer tracking");
