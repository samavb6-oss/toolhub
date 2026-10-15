/** Build stable, category-scoped selectors for homepage tool controls. */
export function getToolTestId(
  kind: "tool" | "favorite",
  categoryName: string,
  toolName: string,
): string {
  const slug = (value: string) =>
    value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${kind}-${slug(categoryName)}-${slug(toolName)}`;
}
