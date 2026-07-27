export type ProductAvailability = "available" | "reserved" | "sold_out" | "expired";

export type Product = {
  id: string;
  code: string;
  name: string;
  brand: string;
  category: string;
  description: string;
  variant: string;
  priceBob: number;
  priceValidUntil: string;
  availability: ProductAvailability;
  color: "rose" | "mint" | "lilac" | "peach" | "sky" | "cream";
  visual: "tube" | "bottle" | "album" | "mask" | "lip" | "plush";
};
