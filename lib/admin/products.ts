"use client";

import type {
  ProcessedProductImage,
  ProductImageMetadata,
} from "@/lib/images/product-images";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export type AdminCategory = {
  id: string;
  name: string;
  slug: string;
};

export type PricingContext = {
  exchangeRateId: string;
  observedForDate: string | null;
  krwPerUsd: number;
  bcbBobPerUsd: number;
  bankSpreadBobPerUsd: number;
  contingencyRate: number;
  nextExpiresAt: string;
};

export type AdminProduct = {
  id: string;
  code: string;
  name: string;
  brand: string;
  categoryName: string;
  variant: string;
  status: "draft" | "active" | "archived";
  totalStock: number;
  confirmedStock: number;
  reservedStock: number;
  remainingStock: number;
  priceKrw: number;
  marginBob: number;
  sellingPriceBob: number | null;
  priceExpiresAt: string | null;
  thumbnailUrl?: string;
};

export type BulkPricePreview = {
  productId: string;
  code: string;
  name: string;
  currentPriceBob: number | null;
  newPriceBob: number;
};

function client() {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("SUPABASE_NOT_CONFIGURED");
  return supabase;
}

function text(value: unknown, field: string) {
  if (typeof value !== "string" || !value) throw new Error(`INVALID_${field}`);
  return value;
}

function number(value: unknown, field: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`INVALID_${field}`);
  return parsed;
}

function optionalNumber(value: unknown) {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function optionalText(value: unknown) {
  return typeof value === "string" && value ? value : null;
}

function publicStorageUrl(path: string | null) {
  if (!path) return undefined;
  return client().storage.from("product-images").getPublicUrl(path).data.publicUrl;
}

export async function getAdminCategories(): Promise<AdminCategory[]> {
  const { data, error } = await client()
    .from("public_categories")
    .select("id, name, slug")
    .order("sort_order");
  if (error) throw new Error("ADMIN_CATEGORIES_UNAVAILABLE");

  const rows: unknown[] = Array.isArray(data) ? data : [];
  return rows.map((value) => {
    const row = value as Record<string, unknown>;
    return {
      id: text(row.id, "CATEGORY_ID"),
      name: text(row.name, "CATEGORY_NAME"),
      slug: text(row.slug, "CATEGORY_SLUG"),
    };
  });
}

export async function getPricingContext(): Promise<PricingContext | null> {
  const { data, error } = await client().rpc("admin_get_pricing_context");
  if (error) throw new Error("PRICING_CONTEXT_UNAVAILABLE");
  const value: unknown = Array.isArray(data) ? data[0] : null;
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;

  return {
    exchangeRateId: text(row.exchange_rate_id, "RATE_ID"),
    observedForDate: optionalText(row.observed_for_date),
    krwPerUsd: number(row.krw_per_usd, "KRW_RATE"),
    bcbBobPerUsd: number(row.bcb_bob_per_usd, "BCB_RATE"),
    bankSpreadBobPerUsd: number(row.bank_spread_bob_per_usd, "BANK_SPREAD"),
    contingencyRate: number(row.contingency_rate, "CONTINGENCY"),
    nextExpiresAt: text(row.next_expires_at, "EXPIRATION"),
  };
}

async function removeUploaded(paths: string[]) {
  if (!paths.length) return;
  await client().storage.from("product-images").remove(paths);
}

export async function uploadProductImages(images: ProcessedProductImage[]) {
  const uploaded: string[] = [];
  try {
    for (const image of images) {
      for (const object of [image.full, image.thumbnail]) {
        const { error } = await client()
          .storage.from("product-images")
          .upload(object.path, object.blob, {
            contentType: object.contentType,
            cacheControl: "31536000",
            upsert: false,
          });
        if (error) throw new Error("PRODUCT_IMAGE_UPLOAD_FAILED");
        uploaded.push(object.path);
      }
    }
    return uploaded;
  } catch (error) {
    await removeUploaded(uploaded);
    throw error;
  }
}

export async function createAdminProduct(input: {
  productId: string;
  name: string;
  brand: string;
  categoryId: string;
  description: string;
  variant: string;
  priceKrw: number;
  totalStock: number;
  marginBob: number;
  status: "draft" | "active";
  images: ProductImageMetadata[];
  uploadedPaths: string[];
}) {
  const { data, error } = await client().rpc("admin_create_product", {
    p_product_id: input.productId,
    p_name: input.name,
    p_brand: input.brand,
    p_category_id: input.categoryId,
    p_description: input.description,
    p_variant: input.variant,
    p_price_krw: input.priceKrw,
    p_total_stock: input.totalStock,
    p_product_margin_bob: input.marginBob,
    p_status: input.status,
    p_images: input.images,
  });

  if (error) {
    await removeUploaded(input.uploadedPaths);
    throw new Error("PRODUCT_CREATE_FAILED");
  }

  const value: unknown = Array.isArray(data) ? data[0] : null;
  if (!value || typeof value !== "object") throw new Error("INVALID_PRODUCT_RESULT");
  const row = value as Record<string, unknown>;
  return {
    id: text(row.product_id, "PRODUCT_ID"),
    code: text(row.product_code, "PRODUCT_CODE"),
    sellingPriceBob: optionalNumber(row.selling_price_bob),
    expiresAt: optionalText(row.price_expires_at),
  };
}

export async function listAdminProducts(): Promise<AdminProduct[]> {
  const { data, error } = await client().rpc("admin_list_products", {
    p_page: 1,
    p_page_size: 50,
  });
  if (error) throw new Error("ADMIN_PRODUCTS_UNAVAILABLE");

  const rows: unknown[] = Array.isArray(data) ? data : [];
  return rows.map((value) => {
    const row = value as Record<string, unknown>;
    const status = text(row.status, "PRODUCT_STATUS");
    if (!["draft", "active", "archived"].includes(status)) {
      throw new Error("INVALID_PRODUCT_STATUS");
    }
    const thumbnailPath = optionalText(row.thumbnail_path);
    return {
      id: text(row.id, "PRODUCT_ID"),
      code: text(row.code, "PRODUCT_CODE"),
      name: text(row.name, "PRODUCT_NAME"),
      brand: text(row.brand, "PRODUCT_BRAND"),
      categoryName: text(row.category_name, "PRODUCT_CATEGORY"),
      variant: typeof row.variant === "string" ? row.variant : "",
      status: status as AdminProduct["status"],
      totalStock: number(row.total_stock, "TOTAL_STOCK"),
      confirmedStock: number(row.confirmed_stock, "CONFIRMED_STOCK"),
      reservedStock: number(row.reserved_stock, "RESERVED_STOCK"),
      remainingStock: number(row.remaining_stock, "REMAINING_STOCK"),
      priceKrw: number(row.price_krw, "PRICE_KRW"),
      marginBob: number(row.product_margin_bob, "MARGIN_BOB"),
      sellingPriceBob: optionalNumber(row.selling_price_bob),
      priceExpiresAt: optionalText(row.price_expires_at),
      thumbnailUrl: publicStorageUrl(thumbnailPath),
    };
  });
}

export async function publishDraftProduct(productId: string) {
  const { error } = await client().rpc("admin_publish_existing_product", {
    p_product_id: productId,
  });
  if (error) throw new Error("DRAFT_PUBLISH_FAILED");
}

export async function createExchangeRate(input: {
  observedForDate: string;
  sourceUrl: string;
  krwPerUsd: number;
  bcbBobPerUsd: number;
  bankSpreadBobPerUsd: number;
  notes: string;
}) {
  const { data, error } = await client().rpc("admin_create_exchange_rate", {
    p_observed_for_date: input.observedForDate,
    p_source_url: input.sourceUrl,
    p_krw_per_usd: input.krwPerUsd,
    p_bcb_bob_per_usd: input.bcbBobPerUsd,
    p_bank_spread_bob_per_usd: input.bankSpreadBobPerUsd,
    p_notes: input.notes,
  });
  if (error || typeof data !== "string") throw new Error("RATE_CREATE_FAILED");
  return data;
}

export async function previewBulkPrices(rateId: string): Promise<BulkPricePreview[]> {
  const { data, error } = await client().rpc("admin_preview_available_prices", {
    p_exchange_rate_id: rateId,
  });
  if (error) throw new Error("BULK_PREVIEW_FAILED");

  const rows: unknown[] = Array.isArray(data) ? data : [];
  return rows.map((value) => {
    const row = value as Record<string, unknown>;
    return {
      productId: text(row.product_id, "PRODUCT_ID"),
      code: text(row.product_code, "PRODUCT_CODE"),
      name: text(row.product_name, "PRODUCT_NAME"),
      currentPriceBob: optionalNumber(row.current_price_bob),
      newPriceBob: number(row.new_price_bob, "NEW_PRICE"),
    };
  });
}

export async function refreshBulkPrices(rateId: string) {
  const { data, error } = await client().rpc("admin_refresh_available_prices_now", {
    p_exchange_rate_id: rateId,
  });
  if (error) throw new Error("BULK_REFRESH_FAILED");
  const value: unknown = Array.isArray(data) ? data[0] : null;
  if (!value || typeof value !== "object") throw new Error("INVALID_REFRESH_RESULT");
  const row = value as Record<string, unknown>;
  return {
    updatedCount: number(row.updated_count, "UPDATED_COUNT"),
    expiresAt: text(row.price_expires_at, "EXPIRATION"),
  };
}

export function productPublicUrl(productId: string) {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");
  const url = new URL("/producto", base);
  url.searchParams.set("id", productId);
  return url.toString();
}

export async function shareProduct(product: { id: string; name: string }) {
  const url = productPublicUrl(product.id);
  if (typeof navigator !== "undefined" && navigator.share) {
    await navigator.share({
      title: product.name,
      text: `Mira ${product.name} en Belle Perle.`,
      url,
    });
    return "shared" as const;
  }

  await navigator.clipboard.writeText(url);
  return "copied" as const;
}
