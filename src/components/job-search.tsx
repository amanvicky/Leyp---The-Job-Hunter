"use client";

import { useState, useTransition } from "react";
import { searchJobsAction } from "@/lib/actions/sources";

type Found = { id: string; title: string; company: string; place: string; url: string };

export function JobSearch() {
  const [pending, startTransition] = useTransition();
  const [source, setSource] = useState<"ADZUNA" | "JSEARCH" | "FREEHIRE">("ADZUNA");
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [found, setFound] = useState<number | null>(null);
  const [results, setResults] = useState<Found[]>([]);
  const [error, setError] = useState<string | null>(null);

  function search() {
    setError(null);
    startTransition(async () => {
      const result = await searchJobsAction({ source, query, location });
      if (result.ok) {
        setResults(result.data.postings);
        setFound(result.data.found);
      } else {
        setError(result.error);
        setResults([]);
        setFound(null);
      }
    });
  }

  return (
    <section className="card">
      <h2>Find jobs</h2>
      <div style={{ display: "grid", gap: "8px" }}>
        <label>
          <span className="muted">Source</span>
          <select
            value={source}
            onChange={(event) => setSource(event.target.value as typeof source)}
            style={{ width: "100%", padding: "6px", border: "1px solid var(--line)", borderRadius: "8px" }}
          >
            <option value="ADZUNA">Adzuna</option>
            <option value="JSEARCH">JSearch</option>
            <option value="FREEHIRE">FreeHire</option>
          </select>
        </label>
        <label>
          <span className="muted">What</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="backend engineer"
            style={{ width: "100%", padding: "6px", border: "1px solid var(--line)", borderRadius: "8px" }}
          />
        </label>
        <label>
          <span className="muted">Where</span>
          <input
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="Bengaluru"
            style={{ width: "100%", padding: "6px", border: "1px solid var(--line)", borderRadius: "8px" }}
          />
        </label>
        <button type="button" className="button" onClick={search} disabled={pending || !query.trim()}>
          {pending ? "Searching…" : "Search"}
        </button>
      </div>

      {error ? (
        <p className="muted" role="alert" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      ) : null}

      {found !== null ? (
        <p className="muted" role="status">
          {found} posting{found === 1 ? "" : "s"} found.
        </p>
      ) : null}

      {results.length > 0 ? (
        <ul className="list-plain">
          {results.map((row) => (
            <li key={row.id}>
              <h3>
                {row.url ? (
                  <a href={row.url} target="_blank" rel="noreferrer">
                    {row.title || "Untitled"}
                  </a>
                ) : (
                  row.title || "Untitled"
                )}
              </h3>
              <p className="muted">{[row.company, row.place].filter(Boolean).join(" · ")}</p>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
