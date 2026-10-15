/** Build stable selectors; scope repeated “More Tools” controls by category. */
export function getToolTestId(
  kind: "tool" | "favorite",
  categoryName: string,
  toolName: string,
): string {
  const slug = (value: string) =>
    value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const toolSlug = slug(toolName);
  if (toolName === "More Tools") return `${kind}-${slug(categoryName)}-${toolSlug}`;
  return `${kind}-${toolSlug}`;
}
