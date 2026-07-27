export type PricingPreviewInput = {
  priceKrw: number;
  krwPerUsd: number;
  bcbBobPerUsd: number;
  bankSpreadBobPerUsd: number;
  contingencyRate: number;
  profitBob: number;
};

export function calculatePricingPreview(input: PricingPreviewInput) {
  const convertedCostBob =
    (input.priceKrw / input.krwPerUsd) * (input.bcbBobPerUsd + input.bankSpreadBobPerUsd);
  const protectedCostBob = convertedCostBob * (1 + input.contingencyRate);

  return {
    protectedCostBob: Math.ceil(protectedCostBob),
    sellingPriceBob: Math.ceil(protectedCostBob + input.profitBob),
  };
}
