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

const service = createClient(url, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const publicClient = createClient(url, publishableKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const suffix = randomUUID();
const email = `phase6-${suffix}@example.test`;
const password = `Bp-${suffix}-local!`;
const productId = randomUUID();
const imagePath = `products/${productId}/0-full.png`;
const thumbnailPath = `products/${productId}/0-thumb.png`;
const onePixelPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=",
  "base64",
);

const { data: createdUser, error: createUserError } = await service.auth.admin.createUser(
  {
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: "Administración local" },
  },
);
assert(!createUserError && createdUser.user, "Could not create the local admin actor.");

const { error: promoteError } = await service.rpc("promote_admin_by_email", {
  p_email: email,
  p_reason: "Phase 6 local administrator-product smoke test",
});
assert(!promoteError, "Could not promote the local admin actor.");

const { error: signInError } = await publicClient.auth.signInWithPassword({
  email,
  password,
});
assert(!signInError, "Promoted administrator could not sign in.");

const { data: categories, error: categoryError } = await publicClient
  .from("public_categories")
  .select("id")
  .order("sort_order")
  .limit(1)
  .single();
assert(!categoryError && categories, "Could not read the safe category projection.");

for (const path of [imagePath, thumbnailPath]) {
  const { error } = await publicClient.storage
    .from("product-images")
    .upload(path, onePixelPng, { contentType: "image/png", upsert: false });
  assert(!error, `Administrator could not upload ${path}.`);
}

const { data: createdProducts, error: productError } = await publicClient.rpc(
  "admin_create_product",
  {
    p_product_id: productId,
    p_name: "Producto de prueba Fase 6",
    p_brand: "Belle Perle",
    p_category_id: categories.id,
    p_description: "Producto creado por la validación local.",
    p_variant: "1 unidad",
    p_price_krw: 21_000,
    p_total_stock: 4,
    p_product_margin_bob: 42,
    p_status: "active",
    p_images: [
      {
        storage_path: imagePath,
        thumbnail_storage_path: thumbnailPath,
        alt_text: "Producto de prueba Fase 6",
        sort_order: 0,
        width: 1,
        height: 1,
        thumbnail_width: 1,
        thumbnail_height: 1,
        is_thumbnail: true,
      },
    ],
  },
);
assert(!productError && createdProducts?.length === 1, "Product RPC failed.");
assert(
  Number(createdProducts[0].selling_price_bob) > 0,
  "Product did not receive an authoritative price.",
);

const { data: adminProducts, error: listError } = await publicClient.rpc(
  "admin_list_products",
  { p_page: 1, p_page_size: 50 },
);
assert(!listError, "Administrator product list failed.");
const listed = adminProducts?.find((product) => product.id === productId);
assert(listed, "Created product is missing from the administrator list.");
assert(
  listed.total_stock === 4 &&
    listed.confirmed_stock === 0 &&
    listed.remaining_stock === 4,
  "Administrator inventory quantities are incorrect.",
);

const anonymous = createClient(url, publishableKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { data: publicProduct, error: publicError } = await anonymous
  .from("public_catalogue")
  .select("id, thumbnail_path")
  .eq("id", productId)
  .single();
assert(!publicError && publicProduct, "Published product is absent from the catalogue.");
assert(
  publicProduct.thumbnail_path === thumbnailPath,
  "Catalogue did not expose the thumbnail.",
);

const { data: publicImages, error: imagesError } = await anonymous
  .from("public_product_images")
  .select("storage_path, thumbnail_storage_path")
  .eq("product_id", productId);
assert(
  !imagesError && publicImages?.length === 1,
  "Safe product images are unavailable.",
);

const { error: anonymousAdminError } = await anonymous.rpc("admin_list_products", {
  p_page: 1,
  p_page_size: 50,
});
assert(anonymousAdminError, "Anonymous actor unexpectedly read administrator inventory.");

const observedForDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/La_Paz",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());
const { data: rateId, error: rateError } = await publicClient.rpc(
  "admin_create_exchange_rate",
  {
    p_observed_for_date: observedForDate,
    p_source_url: "https://www.bcb.gob.bo/",
    p_krw_per_usd: 1_375,
    p_bcb_bob_per_usd: 6.96,
    p_bank_spread_bob_per_usd: 0.28,
    p_notes: "Phase 6 local smoke test",
  },
);
assert(!rateError && rateId, "Reviewed exchange rate creation failed.");

const { data: pricePreview, error: previewError } = await publicClient.rpc(
  "admin_preview_available_prices",
  { p_exchange_rate_id: rateId },
);
assert(
  !previewError && pricePreview?.some((product) => product.product_id === productId),
  "Bulk price preview omitted the product.",
);

const { data: refreshResult, error: refreshError } = await publicClient.rpc(
  "admin_refresh_available_prices_now",
  { p_exchange_rate_id: rateId },
);
assert(
  !refreshError && Number(refreshResult?.[0]?.updated_count) >= 1,
  "Bulk price refresh failed.",
);

console.log("PASS administrator product creation uses an authoritative price");
console.log("PASS administrator image upload and safe public media projection");
console.log("PASS exact inventory is restricted to administrators");
console.log("PASS reviewed rate preview and bulk refresh");
