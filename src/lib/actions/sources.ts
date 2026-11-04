"use server";

import { z } from "zod";
import { serverAction } from "@/lib/action";
import { getSetting, setSetting } from "@/lib/settings";
import { searchAdzuna } from "@/lib/sources/adzuna";
import { searchJSearch } from "@/lib/sources/jsearch";
import { searchFreeHire } from "@/lib/sources/freehire";
import { upsertPosting } from "@/lib/search/postings";

export type Source = "ADZUNA" | "JSEARCH" | "FREEHIRE";

const KEY_NAMES: Record<Source, string> = {
  ADZUNA: "source:adzuna",
  JSEARCH: "source:jsearch",
  FREEHIRE: "source:freehire",
};

type KeySet = { appId?: string; appKey?: string; key?: string };

export async function loadSourceKeys(source: Source): Promise<KeySet | null> {
  const raw = await getSetting(KEY_NAMES[source]);
  if (!raw) return null;
  // Keys are stored as JSON in the setting; they never leave the server.
  try {
    return JSON.parse(raw) as KeySet;
  } catch {
    return null;
  }
}

const saveKeysSchema = z.object({
  source: z.enum(["ADZUNA", "JSEARCH", "FREEHIRE"]),
  appId: z.string().max(200).optional(),
  appKey: z.string().max(200).optional(),
  key: z.string().max(200).optional(),
});

/** Saves the keys for one source. Reports presence, never the values. */
export const saveSourceKeysAction = serverAction(saveKeysSchema, async (input) => {
  const payload: KeySet = {};
  if (input.source === "ADZUNA") {
    if (input.appId) payload.appId = input.appId;
    if (input.appKey) payload.appKey = input.appKey;
  } else if (input.key) {
    payload.key = input.key;
  }
  await setSetting(KEY_NAMES[input.source], JSON.stringify(payload));
  const stored = await loadSourceKeys(input.source);
  return {
    source: input.source,
    hasAppId: Boolean(stored?.appId),
    hasAppKey: Boolean(stored?.appKey),
    hasKey: Boolean(stored?.key),
  };
});

export const loadSourceKeysAction = serverAction(
  z.object({ source: z.enum(["ADZUNA", "JSEARCH", "FREEHIRE"]) }),
  async (input) => {
    const stored = await loadSourceKeys(input.source);
    // Presence only: the browser never receives a key it cannot use anyway.
    return {
      source: input.source,
      hasAppId: Boolean(stored?.appId),
      hasAppKey: Boolean(stored?.appKey),
      hasKey: Boolean(stored?.key),
    };
  },
);

const searchSchemaResult = z.object({
  source: z.enum(["ADZUNA", "JSEARCH", "FREEHIRE"]),
  query: z.string().trim().min(1).max(200),
  location: z.string().trim().max(120).default(""),
});

export const searchJobsAction = serverAction(searchSchemaResult, async (input) => {
  const stored = await loadSourceKeys(input.source);
  if (!stored) throw new Error(`Add your ${input.source} keys in Settings first.`);

  const outcome =
    input.source === "ADZUNA"
      ? stored.appId && stored.appKey
        ? await searchAdzuna(input.query, input.location, stored.appId, stored.appKey)
        : { ok: false as const, error: "Adzuna needs an app id and an app key." }
      : input.source === "JSEARCH"
        ? stored.key
          ? await searchJSearch(input.query, input.location, stored.key)
          : { ok: false as const, error: "JSearch needs a RapidAPI key." }
        : stored.key
          ? await searchFreeHire(input.query, input.location, stored.key)
          : { ok: false as const, error: "FreeHire needs a key." };

  if (!outcome.ok) throw new Error(outcome.error);

  // Store what we found so a search result survives a page reload.
  const saved: { title: string; company: string; place: string; url: string; id: string }[] = [];
  for (const posting of outcome.data.postings as Record<string, unknown>[]) {
    const row = await upsertPosting({
      source: input.source,
      externalId: String(posting.externalId ?? ""),
      title: String(posting.title ?? ""),
      company: String(posting.company ?? ""),
      place: String(posting.place ?? ""),
      salary: String(posting.salary ?? ""),
      postedAt: (posting.postedAt as string | null) ?? null,
      url: String(posting.url ?? ""),
      description: String(posting.description ?? ""),
      complete: Boolean(posting.complete),
    });
    saved.push({ id: row.id, title: row.title, company: row.company, place: row.place, url: row.url });
  }

  return { found: outcome.data.found, postings: saved };
});
