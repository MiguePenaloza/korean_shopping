export type ProductAvailability = "available" | "reserved" | "sold_out" | "expired";

export type Product = {
  id: string;
  code: string;
  name: string;
  brand: string;
  category: string;
  description: string;
  variant: string;
  priceBob: number | null;
  priceValidUntil: string | null;
  availability: ProductAvailability;
  color: "rose" | "mint" | "lilac" | "peach" | "sky" | "cream";
  visual: "tube" | "bottle" | "album" | "mask" | "lip" | "plush";
  thumbnailUrl?: string;
  thumbnailAlt?: string;
};
