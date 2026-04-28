/**
 * Slug-to-UUID resolution via the runtime's OpenAPI spec.
 *
 * Remote runtimes use UUIDs in URL paths (/models/{uuid}/runs) with the
 * human-readable slug stored as the operationId. This module fetches the
 * spec once per runtime URL and caches the mapping for the process lifetime.
 */

const cache = new Map<string, Map<string, string>>();

/**
 * Resolve a blueprint slug to a model UUID.
 * Falls back to the original slug if the spec is unavailable.
 */
export async function resolveModelId(
  slug: string,
  url: string,
  headers: Record<string, string>,
): Promise<string> {
  const cached = cache.get(url)?.get(slug);
  if (cached) return cached;

  try {
    const res = await fetch(`${url}/openapi`, { headers, cache: "no-store" });
    if (!res.ok) return slug;

    const spec = await res.json();
    const mapping = buildSlugMap(spec);
    cache.set(url, mapping);
    return mapping.get(slug) ?? slug;
  } catch {
    return slug;
  }
}

/**
 * Parse available models from an OpenAPI spec.
 * Returns an array of { slug, modelId } pairs.
 */
export function parseModelsFromSpec(
  spec: unknown,
): Array<{ slug: string; modelId: string }> {
  const paths: Record<string, unknown> =
    (spec as Record<string, unknown>)?.paths as Record<string, unknown> ?? {};
  const models: Array<{ slug: string; modelId: string }> = [];

  for (const [pathKey, methods] of Object.entries(paths)) {
    const post = (methods as Record<string, unknown>)?.post as
      | Record<string, unknown>
      | undefined;
    if (!post) continue;
    const match = pathKey.match(/\/models\/([^/]+)\/runs/);
    if (!match) continue;
    const modelId = match[1]!;
    const slug = (post.operationId as string) ?? modelId;
    models.push({ slug, modelId });
  }

  return models;
}

/** Clear the resolution cache (useful for testing). */
export function clearResolverCache(): void {
  cache.clear();
}

// ── internal ──────────────────────────────────────────────────────────────────

function buildSlugMap(spec: unknown): Map<string, string> {
  const models = parseModelsFromSpec(spec);
  const mapping = new Map<string, string>();
  for (const { slug, modelId } of models) {
    mapping.set(slug, modelId);
    // Also map dash-variant so "insurance-premium-calculator" finds
    // "insurance_premium_calculator"
    const dashVariant = slug.replace(/_/g, "-");
    if (dashVariant !== slug) mapping.set(dashVariant, modelId);
  }
  return mapping;
}
