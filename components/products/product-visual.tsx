import type { Product } from "@/types/product";

const colorStyles: Record<Product["color"], string> = {
  rose: "from-[#f6dce4] to-[#fff6f7]",
  mint: "from-[#dceee7] to-[#f6fbf8]",
  lilac: "from-[#e6def1] to-[#faf7fd]",
  peach: "from-[#f6d5c9] to-[#fff6f1]",
  sky: "from-[#dbeefa] to-[#f5fbff]",
  cream: "from-[#f3e8d5] to-[#fffbf3]",
};

export function ProductVisual({
  product,
  className = "",
}: {
  product: Product;
  className?: string;
}) {
  if (product.thumbnailUrl) {
    return (
      <div
        className={`relative aspect-[4/3] overflow-hidden bg-surface-soft ${className}`}
      >
        {/* Product thumbnails are pre-compressed to 480 px during upload. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.thumbnailUrl}
          alt={product.thumbnailAlt ?? product.name}
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
        />
        <span className="absolute right-3 bottom-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-muted">
          {product.variant}
        </span>
      </div>
    );
  }

  return (
    <div
      role="img"
      aria-label={`Ilustración de ${product.name}`}
      className={`product-visual relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-gradient-to-br ${colorStyles[product.color]} ${className}`}
    >
      <div className={`product-shape product-${product.visual}`} aria-hidden="true">
        <span>{product.brand.slice(0, 8)}</span>
      </div>
      <span className="absolute right-3 bottom-3 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-muted">
        {product.variant}
      </span>
    </div>
  );
}
