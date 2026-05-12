export function formatPrice(
  priceCents: number | null | undefined,
  override: string | null | undefined
): string {
  if (override) return override;
  if (priceCents == null) return '';
  return `$${(priceCents / 100).toFixed(2)}`;
}
