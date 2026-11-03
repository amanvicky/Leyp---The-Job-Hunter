import { getCachedSearch, setCachedSearch, quotaError, type SourceResult, type CachedSearch } from "./base";

const BASE = "https://jsearch.p.rapidapi.com/search";

export async function searchJSearch(
  query: string,
  location: string,
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
  baseUrl = BASE,
): Promise<SourceResult<CachedSearch>> {
  const cached = await getCachedSearch("JSEARCH", `${query}|${location}`);
  if (cached) return { ok: true, data: cached };

  const params = new URLSearchParams({ query: `${query} ${location}`, page: "1", num_pages: "1" });
  const url = `${baseUrl}?${params.toString()}`;

  let res: Response;
  try {
    res = await fetchImpl(url, { headers: { "x-rapidapi-key": apiKey } });
  } catch {
    return { ok: false, error: "JSearch could not be reached." };
  }
  if (res.status === 429) return { ok: false, error: quotaError("JSearch"), quota: true };
  if (!res.ok) return { ok: false, error: `JSearch returned ${res.status}.` };

  const json = (await res.json()) as { data?: unknown[]; total?: number };
  const postings = (json.data ?? []).map((r: any) => ({
    source: "JSEARCH",
    externalId: String(r.job_id ?? ""),
    title: r.job_title ?? "",
    company: r.employer_name ?? "",
    place: [r.job_city, r.job_state, r.job_country].filter(Boolean).join(", "),
    salary: r.job_salary ?? "",
    postedAt: r.job_posted_at_datetime_utc ?? null,
    url: r.job_apply_link ?? "",
    description: r.job_description ?? "",
    complete: Boolean(r.job_description),
  }));

  const data: CachedSearch = { postings, found: json.total ?? postings.length };
  await setCachedSearch("JSEARCH", `${query}|${location}`, data);
  return { ok: true, data };
}
