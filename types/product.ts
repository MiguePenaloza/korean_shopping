export type ProductAvailability = "available" | "reserved" | "sold_out" | "expired";

export type Product = {
  id: string;
  name: string;
  category: string;
  priceBob: number;
  priceValidUntil: string;
  availability: ProductAvailability;
  color: "rose" | "mint" | "lilac";
};
