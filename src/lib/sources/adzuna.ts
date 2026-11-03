import { getCachedSearch, setCachedSearch, quotaError, type SourceResult, type CachedSearch } from "./base";

const BASE = "https://api.adzuna.com/v1/api/jobs";

export async function searchAdzuna(
  query: string,
  location: string,
  appId: string,
  appKey: string,
  fetchImpl: typeof fetch = fetch,
  baseUrl = BASE,
): Promise<SourceResult<CachedSearch>> {
  const cached = await getCachedSearch("ADZUNA", `${query}|${location}`);
  if (cached) return { ok: true, data: cached };

  const params = new URLSearchParams({
    app_id: appId,
    app_key: appKey,
    what: query,
    where: location,
    results_per_page: "20",
  });
  const url = `${baseUrl}/in/search/1?${params.toString()}`;

  let res: Response;
  try {
    res = await fetchImpl(url);
  } catch {
    return { ok: false, error: "Adzuna could not be reached." };
  }
  if (res.status === 429) return { ok: false, error: quotaError("Adzuna"), quota: true };
  if (!res.ok) return { ok: false, error: `Adzuna returned ${res.status}.` };

  const json = (await res.json()) as { results?: unknown[]; count?: number };
  const postings = (json.results ?? []).map((r: any) => ({
    source: "ADZUNA",
    externalId: String(r.id ?? ""),
    title: r.title ?? "",
    company: r.company?.display_name ?? "",
    place: r.location?.display_name ?? "",
    salary: r.salary_min && r.salary_max ? `${r.salary_min}-${r.salary_max}` : "",
    salaryMin: r.salary_min ?? null,
    salaryMax: r.salary_max ?? null,
    currency: "INR",
    postedAt: r.created ?? null,
    url: r.redirect_url ?? "",
    description: r.description ?? "",
    complete: Boolean(r.description),
  }));

  const data: CachedSearch = { postings, found: json.count ?? postings.length };
  await setCachedSearch("ADZUNA", `${query}|${location}`, data);
  return { ok: true, data };
}