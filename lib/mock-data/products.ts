import type { Product } from "@/types/product";

export const mockProducts: readonly Product[] = [
  {
    id: "mock-001",
    name: "Protector solar hidratante",
    category: "Skincare",
    priceBob: 168,
    priceValidUntil: "27 julio, 08:15",
    availability: "available",
    color: "rose",
  },
  {
    id: "mock-002",
    name: "Álbum edición especial",
    category: "K-pop",
    priceBob: 245,
    priceValidUntil: "27 julio, 08:15",
    availability: "reserved",
    color: "lilac",
  },
  {
    id: "mock-003",
    name: "Mascarilla calmante",
    category: "Skincare",
    priceBob: 39,
    priceValidUntil: "Precio por actualizar",
    availability: "expired",
    color: "mint",
  },
];
