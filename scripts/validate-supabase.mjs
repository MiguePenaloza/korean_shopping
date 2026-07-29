import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const migrationDirectory = join(root, "supabase", "migrations");
const testDirectory = join(root, "supabase", "tests", "database");
const migrations = readdirSync(migrationDirectory)
  .filter((name) => name.endsWith(".sql"))
  .sort();
const tests = readdirSync(testDirectory)
  .filter((name) => name.endsWith(".test.sql"))
  .sort();

const failures = [];

function requireCondition(condition, message) {
  if (!condition) failures.push(message);
}

function occurrences(source, pattern) {
  return [...source.matchAll(pattern)].length;
}

requireCondition(migrations.length >= 3, "Expected at least three ordered migrations.");
requireCondition(
  tests.length >= 9,
  "Expected schema, security, business, reservation, identity, catalogue, product, checkout, and order-administration tests.",
);

const migrationSql = migrations
  .map((name) => readFileSync(join(migrationDirectory, name), "utf8"))
  .join("\n");

const requiredTables = [
  "profiles",
  "categories",
  "rate_observations",
  "exchange_rates",
  "campaign_settings",
  "products",
  "product_price_versions",
  "product_images",
  "orders",
  "order_items",
  "inventory_reservations",
  "payment_evidence",
  "order_status_history",
  "order_admin_overrides",
];

for (const table of requiredTables) {
  requireCondition(
    new RegExp(`create table public\\.${table}\\b`, "i").test(migrationSql),
    `Missing table public.${table}.`,
  );
  requireCondition(
    new RegExp(`alter table public\\.${table} enable row level security`, "i").test(
      migrationSql,
    ),
    `RLS is not enabled for public.${table}.`,
  );
}

const requiredFunctions = [
  "is_admin",
  "calculate_product_price",
  "admin_publish_product_price",
  "admin_refresh_available_prices",
  "create_order",
  "report_order_payment",
  "expire_inventory_reservations",
  "admin_confirm_order_paid",
  "expire_due_records",
  "handle_new_auth_user",
  "upsert_own_profile",
  "promote_admin_by_email",
  "search_public_catalogue",
  "admin_get_pricing_context",
  "admin_create_product",
  "admin_publish_existing_product",
  "admin_list_products",
  "admin_create_exchange_rate",
  "admin_preview_available_prices",
  "admin_refresh_available_prices_now",
  "submit_order",
  "get_own_order_confirmation",
  "report_own_order_payment",
  "admin_list_orders",
  "admin_get_order_detail",
  "admin_change_order_state",
  "admin_attach_payment_evidence",
  "admin_mark_order_paid",
];

for (const functionName of requiredFunctions) {
  requireCondition(
    new RegExp(`create or replace function public\\.${functionName}\\b`, "i").test(
      migrationSql,
    ),
    `Missing function public.${functionName}.`,
  );
}

const securityDefinerBlocks = migrationSql.match(
  /create or replace function[\s\S]*?\$\$;/gi,
);
for (const block of securityDefinerBlocks ?? []) {
  if (/security definer/i.test(block)) {
    requireCondition(
      /set search_path = ''/i.test(block),
      "A SECURITY DEFINER function does not fix its search_path.",
    );
  }
}

requireCondition(
  /unique \(actor_id, idempotency_key\)/i.test(migrationSql),
  "Order idempotency uniqueness is missing.",
);
requireCondition(
  /for update;/i.test(migrationSql),
  "Transactional row locking is missing.",
);
requireCondition(
  /PRICE_SNAPSHOT_IMMUTABLE/.test(migrationSql),
  "Price snapshot immutability guard is missing.",
);
requireCondition(
  /ROW_IMMUTABLE/.test(migrationSql),
  "Order item immutability guard is missing.",
);
requireCondition(
  /bucket_id = 'payment-evidence'[\s\S]*public\.is_admin\(\)/i.test(migrationSql),
  "Private payment evidence policy is missing.",
);
requireCondition(
  /cron\.schedule\([\s\S]*belle-perle-expire-due-records/i.test(migrationSql),
  "Expiration Cron schedule is missing.",
);
requireCondition(
  !/grant\s+all[\s\S]{0,120}\bto\s+anon\b/i.test(migrationSql),
  "Unsafe GRANT ALL to anon found.",
);
requireCondition(
  !/grant\s+(insert|update|delete)[\s\S]{0,120}public\.orders[\s\S]{0,80}to authenticated/i.test(
    migrationSql,
  ),
  "Direct customer order mutation grant found.",
);
requireCondition(
  /revoke update on public\.profiles from authenticated/i.test(migrationSql),
  "Direct browser profile updates must be revoked.",
);
requireCondition(
  /grant execute on function public\.promote_admin_by_email\(text, text\) to service_role/i.test(
    migrationSql,
  ),
  "Admin bootstrap must be restricted to the service role.",
);
requireCondition(
  /create or replace view public\.public_categories/i.test(migrationSql),
  "Safe public category projection is missing.",
);
requireCondition(
  /p_page_size < 1 or p_page_size > 20/i.test(migrationSql),
  "Public catalogue page size is not capped at 20.",
);
requireCondition(
  /case filtered\.availability[\s\S]*when 'available' then 0[\s\S]*else 3/i.test(
    migrationSql,
  ),
  "Public catalogue availability sorting is missing.",
);
requireCondition(
  /create or replace view public\.public_product_images/i.test(migrationSql),
  "Safe public product-image projection is missing.",
);
requireCondition(
  /jsonb_array_length\([a-z_]+\) > 3/i.test(migrationSql),
  "Administrator product creation does not enforce the three-image limit.",
);
requireCondition(
  /revoke insert, update, delete on[\s\S]{0,300}public\.products,[\s\S]{0,100}from authenticated/i.test(
    migrationSql,
  ),
  "Direct browser product mutation was not revoked.",
);
requireCondition(
  /p_now at time zone 'America\/La_Paz'[\s\S]{0,300}time '08:15'/i.test(migrationSql),
  "Administrator pricing does not calculate the next 08:15 Bolivia expiration.",
);
requireCondition(
  /add column terms_accepted_at timestamptz[\s\S]{0,120}add column privacy_accepted_at timestamptz/i.test(
    migrationSql,
  ),
  "Order acceptance timestamps are missing.",
);
requireCondition(
  /revoke all on function public\.create_order\(uuid, text, text, jsonb\)[\s\S]{0,100}from public, anon, authenticated/i.test(
    migrationSql,
  ),
  "Browser access to the internal checkout function was not revoked.",
);
requireCondition(
  /revoke select on public\.campaign_settings from anon, authenticated/i.test(
    migrationSql,
  ),
  "Raw campaign configuration remains browser-readable.",
);
requireCondition(
  /revoke all on function public\.admin_confirm_order_paid\(uuid, boolean, text\)[\s\S]{0,100}from public, anon, authenticated/i.test(
    migrationSql,
  ),
  "The lower-level paid-confirmation RPC remains browser-executable.",
);
requireCondition(
  /revoke insert, update, delete on public\.payment_evidence from authenticated/i.test(
    migrationSql,
  ),
  "Payment evidence metadata can still be mutated directly by browser identities.",
);
requireCondition(
  /p_order_id::text[\s\S]{0,120}\(jpg\|jpeg\|png\|webp\)/i.test(migrationSql),
  "Private evidence paths are not bound to their order directory.",
);

for (const name of [...migrations, ...tests]) {
  const directory = name.endsWith(".test.sql") ? testDirectory : migrationDirectory;
  const sql = readFileSync(join(directory, name), "utf8");
  const dollarTags = occurrences(sql, /\$[a-zA-Z_]*\$/g);
  requireCondition(dollarTags % 2 === 0, `${name} has unbalanced dollar quotes.`);
  requireCondition(!/\t/.test(sql), `${name} contains tab indentation.`);
}

for (const test of tests) {
  const sql = readFileSync(join(testDirectory, test), "utf8");
  requireCondition(/\bselect plan\(/i.test(sql), `${test} has no pgTAP plan.`);
  requireCondition(
    /\bselect \* from finish\(\)/i.test(sql),
    `${test} has no pgTAP finish.`,
  );
  requireCondition(/\brollback;/i.test(sql), `${test} does not roll back.`);
}

if (failures.length > 0) {
  console.error("Supabase structural validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`PASS ${migrations.length} ordered migrations`);
console.log(`PASS ${requiredTables.length} RLS-protected public tables`);
console.log(`PASS ${requiredFunctions.length} required secure functions`);
console.log(`PASS ${tests.length} pgTAP test files`);
console.log("PASS storage isolation, Cron, idempotency, locks, and immutable snapshots");
