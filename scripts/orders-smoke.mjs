import { randomUUID } from "node:crypto";

import { createClient } from "@supabase/supabase-js";

const url = process.env.BP_SUPABASE_URL;
const publishableKey = process.env.BP_SUPABASE_PUBLISHABLE_KEY;

if (!url || !publishableKey) {
  console.error("BP_SUPABASE_URL and BP_SUPABASE_PUBLISHABLE_KEY are required.");
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

const customer = browserClient();
const stranger = browserClient();
const anonymous = browserClient();

const { error: customerSignInError } = await customer.auth.signInAnonymously();
assert(!customerSignInError, "Could not create the checkout identity.");

const idempotencyKey = randomUUID();
const checkoutArguments = {
  p_idempotency_key: idempotencyKey,
  p_guest_name: "Cliente Prueba Fase Siete",
  p_phone: "71234567",
  p_items: [
    {
      product_id: "40000000-0000-4000-8000-000000000001",
      quantity: 1,
    },
  ],
  p_terms_accepted: true,
  p_privacy_accepted: true,
};

const { data: firstResult, error: firstError } = await customer.rpc(
  "submit_order",
  checkoutArguments,
);
assert(!firstError && firstResult?.length === 1, "Secure checkout failed.");
const order = firstResult[0];
assert(order.order_number.startsWith("BP-"), "Public order number was not generated.");
assert(Number(order.total_bob) > 0, "Database did not calculate the order total.");

const reservationMinutes =
  (new Date(order.reservation_expires_at).getTime() - Date.now()) / 60_000;
const paymentMinutes =
  (new Date(order.payment_report_expires_at).getTime() - Date.now()) / 60_000;
assert(
  reservationMinutes > 14 && reservationMinutes <= 15.1,
  "Initial reservation is not 15 minutes.",
);
assert(
  paymentMinutes > 24 && paymentMinutes <= 25.1,
  "Payment-report deadline is not 25 minutes.",
);

const { data: retryResult, error: retryError } = await customer.rpc(
  "submit_order",
  checkoutArguments,
);
assert(
  !retryError && retryResult?.[0]?.order_id === order.order_id,
  "Idempotent checkout retry returned a different order.",
);

const { error: internalCheckoutError } = await customer.rpc("create_order", {
  p_idempotency_key: randomUUID(),
  p_guest_name: "Intento inseguro",
  p_phone: "71234567",
  p_items: checkoutArguments.p_items,
});
assert(
  internalCheckoutError,
  "Browser identity unexpectedly executed the internal checkout function.",
);

const { error: unsignedCheckoutError } = await anonymous.rpc(
  "submit_order",
  checkoutArguments,
);
assert(unsignedCheckoutError, "Unsigned anon unexpectedly submitted an order.");

const { data: confirmation, error: confirmationError } = await customer.rpc(
  "get_own_order_confirmation",
  { p_order_id: order.order_id },
);
assert(
  !confirmationError && confirmation?.length === 1,
  "Owner could not read the safe confirmation.",
);
assert(
  confirmation[0].whatsapp_phone_e164 === "+59177912632",
  "Confirmation returned an unexpected WhatsApp contact.",
);
assert(
  Array.isArray(confirmation[0].items) && confirmation[0].items.length === 1,
  "Confirmation omitted immutable order items.",
);

const { error: strangerSignInError } = await stranger.auth.signInAnonymously();
assert(!strangerSignInError, "Could not create the isolation identity.");
const { error: strangerReadError } = await stranger.rpc("get_own_order_confirmation", {
  p_order_id: order.order_id,
});
assert(strangerReadError, "Another identity unexpectedly read the confirmation.");

const { error: paymentError } = await customer.rpc("report_own_order_payment", {
  p_order_id: order.order_id,
});
assert(!paymentError, "Payment report failed inside the reservation window.");

const { data: reported, error: reportedError } = await customer.rpc(
  "get_own_order_confirmation",
  { p_order_id: order.order_id },
);
assert(!reportedError, "Reported order could not be reloaded.");
assert(
  reported?.[0]?.payment_status === "payment_reported",
  "Payment status was not updated.",
);
assert(
  reported?.[0]?.reservation_expires_at === reported?.[0]?.payment_report_expires_at,
  "Payment report did not extend the reservation to minute 25.",
);

const { error: rawSettingsError } = await anonymous
  .from("campaign_settings")
  .select("*")
  .limit(1);
assert(rawSettingsError, "Raw campaign settings remained publicly readable.");

console.log("PASS signed guest checkout uses database totals and 15/25-minute limits");
console.log("PASS retry returns the same order and internal checkout is closed");
console.log("PASS safe confirmation enforces ownership and returns WhatsApp contact");
console.log("PASS payment report extends the reservation without marking it paid");
