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

const supabase = createClient(url, publishableKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

const { data: categories, error: categoryError } = await supabase
  .from("public_categories")
  .select("id, name, slug")
  .order("sort_order");
assert(!categoryError, "Safe category projection could not be read.");
assert(categories?.length === 4, "Expected four public seed categories.");

const { data: catalogue, error: catalogueError } = await supabase.rpc(
  "search_public_catalogue",
  {
    p_query: "",
    p_category_slug: null,
    p_page: 1,
    p_page_size: 20,
  },
);
assert(!catalogueError, "Public catalogue RPC failed.");
assert(catalogue?.length === 3, "Expected three public seed products.");
assert(
  catalogue.every((row) => row.availability === "available"),
  "Seed catalogue contains an unexpected availability state.",
);
assert(
  catalogue.every((row) => !("total_stock" in row) && !("confirmed_stock" in row)),
  "Catalogue leaked exact inventory.",
);

const { data: searchResult, error: searchError } = await supabase.rpc(
  "search_public_catalogue",
  {
    p_query: "rom&nd",
    p_category_slug: "maquillaje",
    p_page: 1,
    p_page_size: 20,
  },
);
assert(!searchError, "Public catalogue search failed.");
assert(searchResult?.length === 1, "Brand and category search did not narrow results.");

const { error: rawProductError } = await supabase.from("products").select("id").limit(1);
assert(rawProductError, "Anonymous browser unexpectedly read raw products.");

const { error: invalidPageSizeError } = await supabase.rpc("search_public_catalogue", {
  p_query: "",
  p_category_slug: null,
  p_page: 1,
  p_page_size: 21,
});
assert(invalidPageSizeError, "Page size above 20 was unexpectedly allowed.");

console.log("PASS safe categories are publicly readable");
console.log("PASS catalogue returns public products without exact inventory");
console.log("PASS brand and category filtering works");
console.log("PASS raw products remain inaccessible");
console.log("PASS catalogue page size is capped at 20");
