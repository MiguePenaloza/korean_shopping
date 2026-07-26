const bobFormatter = new Intl.NumberFormat("es-BO", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const krwFormatter = new Intl.NumberFormat("es-BO", {
  maximumFractionDigits: 0,
});

export function formatBob(value: number): string {
  return `Bs ${bobFormatter.format(value)}`;
}

export function formatKrw(value: number): string {
  return `₩${krwFormatter.format(value)}`;
}
