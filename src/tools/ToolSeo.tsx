import { useEffect } from "react";
import type { ToolDefinition } from "./toolRegistry";

function upsertMeta(attribute: "name" | "property", key: string, content: string): () => void {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  const wasCreated = !element;
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  const previous = element.getAttribute("content");
  element.setAttribute("content", content);

  return () => {
    if (wasCreated) element?.remove();
    else if (previous !== null) element?.setAttribute("content", previous);
  };
}

export function ToolSeo({ tool }: { tool: ToolDefinition }) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = tool.title;

    const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
    const configuredOrigin = (import.meta.env.VITE_SITE_URL || window.location.origin).replace(/\/+$/, "");
    const pageUrl = new URL(`${basePath}/tools/${tool.slug}`, configuredOrigin).href;
    const cleanups = [
      upsertMeta("name", "description", tool.description),
      upsertMeta("property", "og:title", tool.title),
      upsertMeta("property", "og:description", tool.description),
      upsertMeta("property", "og:url", pageUrl),
      upsertMeta("property", "og:type", "website"),
      upsertMeta("property", "og:site_name", "ToolHub"),
      upsertMeta("name", "twitter:card", "summary_large_image"),
      upsertMeta("name", "twitter:title", tool.title),
      upsertMeta("name", "twitter:description", tool.description),
    ];

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    const wasCanonicalCreated = !canonical;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    const previousCanonical = canonical.getAttribute("href");
    canonical.href = pageUrl;

    // Static tool HTML already contains the correct WebApplication schema. Update it
    // in place rather than appending a duplicate entity after hydration.
    const existingSchemas = [...document.head.querySelectorAll<HTMLScriptElement>('script[type="application/ld+json"]')];
    const existingToolSchema = existingSchemas.find((script) => {
      try { return JSON.parse(script.textContent || "{}")["@type"] === "WebApplication"; }
      catch { return false; }
    });
    const schema = existingToolSchema ?? document.createElement("script");
    const previousSchemaText = existingToolSchema?.textContent ?? null;
    if (!existingToolSchema) {
      schema.id = "toolhub-active-tool-schema";
      schema.type = "application/ld+json";
      document.head.appendChild(schema);
    }
    schema.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: tool.name,
      description: tool.description,
      url: pageUrl,
      applicationCategory: "UtilitiesApplication",
      operatingSystem: "Any",
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      publisher: { "@type": "Organization", name: "ToolHub" },
    });

    return () => {
      document.title = previousTitle;
      cleanups.reverse().forEach((cleanup) => cleanup());
      if (existingToolSchema) schema.textContent = previousSchemaText;
      else schema.remove();
      if (wasCanonicalCreated) canonical?.remove();
      else if (previousCanonical !== null) canonical?.setAttribute("href", previousCanonical);
    };
  }, [tool]);

  return null;
}
