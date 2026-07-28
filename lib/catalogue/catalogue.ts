"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Product, ProductAvailability, ProductImage } from "@/types/product";

export type PublicCategory = {
  id: string;
  name: string;
  slug: string;
};

export type CataloguePage = {
  products: Product[];
  totalCount: number;
  page: number;
  pageSize: number;
};

type CatalogueRow = {
  id: unknown;
  code: unknown;
  name: unknown;
  brand: unknown;
  description: unknown;
  variant: unknown;
  category_name: unknown;
  price_bob: unknown;
  price_expires_at: unknown;
  availability: unknown;
  thumbnail_path: unknown;
  thumbnail_alt: unknown;
  total_count?: unknown;
};

const colors: Product["color"][] = ["rose", "mint", "lilac", "peach", "sky", "cream"];
const visuals: Product["visual"][] = ["tube", "bottle", "album", "mask", "lip", "plush"];
const validAvailability = new Set<ProductAvailability>([
  "available",
  "reserved",
  "sold_out",
  "expired",
]);

function stableIndex(value: string, length: number) {
  let hash = 0;
  for (const character of value) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  return hash % length;
}

function requiredString(value: unknown, field: string) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`INVALID_CATALOGUE_${field}`);
  }
  return value;
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function formatExpiry(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("es-BO", {
    timeZone: "America/La_Paz",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function publicImageUrl(path: string | null) {
  if (!path) return undefined;
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return undefined;
  return supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
}

export function mapCatalogueRow(value: unknown): Product {
  if (!value || typeof value !== "object") {
    throw new Error("INVALID_CATALOGUE_ROW");
  }

  const row = value as CatalogueRow;
  const id = requiredString(row.id, "ID");
  const availability = requiredString(
    row.availability,
    "AVAILABILITY",
  ) as ProductAvailability;
  if (!validAvailability.has(availability)) {
    throw new Error("INVALID_CATALOGUE_AVAILABILITY");
  }

  const price =
    row.price_bob === null || row.price_bob === undefined ? null : Number(row.price_bob);
  if (price !== null && (!Number.isFinite(price) || price <= 0)) {
    throw new Error("INVALID_CATALOGUE_PRICE");
  }

  const category = requiredString(row.category_name, "CATEGORY");
  const color = colors[stableIndex(id, colors.length)] ?? "rose";
  const visual = visuals[stableIndex(`${category}-${id}`, visuals.length)] ?? "tube";
  const thumbnailPath = optionalString(row.thumbnail_path);

  return {
    id,
    code: requiredString(row.code, "CODE"),
    name: requiredString(row.name, "NAME"),
    brand: requiredString(row.brand, "BRAND"),
    category,
    description: typeof row.description === "string" ? row.description : "",
    variant: typeof row.variant === "string" ? row.variant : "",
    priceBob: price,
    priceValidUntil: formatExpiry(optionalString(row.price_expires_at)),
    availability,
    color,
    visual,
    thumbnailUrl: publicImageUrl(thumbnailPath),
    thumbnailAlt: optionalString(row.thumbnail_alt) ?? undefined,
  };
}

function requireClient() {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    throw new Error("SUPABASE_NOT_CONFIGURED");
  }
  return supabase;
}

export async function getPublicCategories(): Promise<PublicCategory[]> {
  const { data, error } = await requireClient()
    .from("public_categories")
    .select("id, name, slug")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw new Error("CATALOGUE_CATEGORIES_UNAVAILABLE");

  const rows: unknown[] = Array.isArray(data) ? data : [];
  return rows.map((value) => {
    if (!value || typeof value !== "object") {
      throw new Error("INVALID_CATEGORY_ROW");
    }
    const row = value as Record<string, unknown>;
    return {
      id: requiredString(row.id, "CATEGORY_ID"),
      name: requiredString(row.name, "CATEGORY_NAME"),
      slug: requiredString(row.slug, "CATEGORY_SLUG"),
    };
  });
}

export async function getCataloguePage({
  query = "",
  categorySlug = null,
  page = 1,
  pageSize = 20,
}: {
  query?: string;
  categorySlug?: string | null;
  page?: number;
  pageSize?: number;
}): Promise<CataloguePage> {
  const { data, error } = await requireClient().rpc("search_public_catalogue", {
    p_query: query.trim(),
    p_category_slug: categorySlug,
    p_page: page,
    p_page_size: pageSize,
  });

  if (error) throw new Error("CATALOGUE_UNAVAILABLE");

  const rows: unknown[] = Array.isArray(data) ? data : [];
  const products = rows.map(mapCatalogueRow);
  const first = rows[0] as CatalogueRow | undefined;
  const totalCount = first ? Number(first.total_count) : 0;

  if (!Number.isSafeInteger(totalCount) || totalCount < 0) {
    throw new Error("INVALID_CATALOGUE_COUNT");
  }

  return { products, totalCount, page, pageSize };
}

export async function getCatalogueProduct(id: string): Promise<Product | null> {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
  ) {
    return null;
  }

  const supabase = requireClient();
  const [productResult, imagesResult] = await Promise.all([
    supabase
      .from("public_catalogue")
      .select(
        "id, code, name, brand, description, variant, category_name, price_bob, price_expires_at, availability, thumbnail_path, thumbnail_alt",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("public_product_images")
      .select("storage_path, thumbnail_storage_path, alt_text, sort_order")
      .eq("product_id", id)
      .order("sort_order", { ascending: true }),
  ]);

  if (productResult.error || imagesResult.error) {
    throw new Error("CATALOGUE_PRODUCT_UNAVAILABLE");
  }
  if (!productResult.data) return null;

  const images: ProductImage[] = (
    Array.isArray(imagesResult.data) ? imagesResult.data : []
  ).map((value) => {
    const row = value as Record<string, unknown>;
    const path = requiredString(row.storage_path, "IMAGE_PATH");
    const thumbnailPath = requiredString(row.thumbnail_storage_path, "THUMBNAIL_PATH");
    const url = publicImageUrl(path);
    const thumbnailUrl = publicImageUrl(thumbnailPath);
    if (!url || !thumbnailUrl) throw new Error("CATALOGUE_IMAGE_UNAVAILABLE");
    return {
      url,
      thumbnailUrl,
      alt: requiredString(row.alt_text, "IMAGE_ALT"),
    };
  });

  return { ...mapCatalogueRow(productResult.data), images };
}
