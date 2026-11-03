import { getCachedSearch, setCachedSearch, quotaError, type SourceResult, type CachedSearch } from "./base";

const BASE = "https://api.freehire.dev/v1/jobs";

export async function searchFreeHire(
  query: string,
  location: string,
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
  baseUrl = BASE,
): Promise<SourceResult<CachedSearch>> {
  const cached = await getCachedSearch("FREEHIRE", `${query}|${location}`);
  if (cached) return { ok: true, data: cached };

  const params = new URLSearchParams({ query, location, limit: "20" });
  const url = `${baseUrl}?${params.toString()}`;

  let res: Response;
  try {
    res = await fetchImpl(url, { headers: { authorization: `Bearer ${apiKey}` } });
  } catch {
    return { ok: false, error: "FreeHire could not be reached." };
  }
  if (res.status === 429) return { ok: false, error: quotaError("FreeHire"), quota: true };
  if (!res.ok) return { ok: false, error: `FreeHire returned ${res.status}.` };

  const json = (await res.json()) as { jobs?: unknown[]; total?: number };
  const postings = (json.jobs ?? []).map((r: any) => ({
    source: "FREEHIRE",
    externalId: String(r.id ?? ""),
    title: r.title ?? "",
    company: r.company ?? "",
    place: r.location ?? "",
    salary: r.salary ?? "",
    postedAt: r.posted_at ?? null,
    url: r.url ?? "",
    description: r.description ?? "",
    complete: Boolean(r.description),
  }));

  const data: CachedSearch = { postings, found: json.total ?? postings.length };
  await setCachedSearch("FREEHIRE", `${query}|${location}`, data);
  return { ok: true, data };
}
