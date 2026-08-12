export function variantLabel(variant) {
  const parts = [
    variant.products?.name,
    variant.version,
    variant.size,
    variant.club,
    variant.league,
  ].filter(Boolean)
  return parts.join(' ')
}
