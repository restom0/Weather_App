import { useEffect, useRef, useState } from "react";
import { searchLocations } from "../api";
import { formatLocationOption } from "../lib/format";

export default function SearchBar({ onSelect }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // True once a search for the current query has completed, so the dropdown can
  // show the matches, an error, or an explicit "no matches" message.
  const [searched, setSearched] = useState(false);
  const boxRef = useRef(null);

  // Debounced search as the user types.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setError("");
      setLoading(false);
      setSearched(false);
      return;
    }
    let active = true;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const data = await searchLocations(q);
        if (!active) return;
        setResults(data || []);
        setError("");
      } catch (err) {
        if (!active) return;
        setError(err.message || "Search failed");
        setResults([]);
      } finally {
        if (active) {
          setLoading(false);
          setSearched(true);
          setOpen(true);
        }
      }
    }, 350);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query]);

  // Close the dropdown when clicking outside.
  useEffect(() => {
    function onDocClick(event) {
      if (boxRef.current && !boxRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function choose(place) {
    setQuery("");
    setResults([]);
    setSearched(false);
    setOpen(false);
    onSelect(place);
  }

  return (
    <div ref={boxRef} className="relative w-full">
      <div className="flex items-center gap-2 rounded-2xl bg-white/15 px-4 py-3 backdrop-blur ring-1 ring-white/25 transition focus-within:ring-white/50">
        <SearchIcon />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => searched && setOpen(true)}
          placeholder="Search for a city…"
          aria-label="Search for a city"
          className="w-full bg-transparent text-white placeholder-white/60 outline-none"
        />
        {loading && <Spinner />}
      </div>

      {open && searched && (
        <ul className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl bg-slate-900/90 shadow-2xl ring-1 ring-white/15 backdrop-blur">
          {error && <li className="px-4 py-3 text-sm text-red-300">{error}</li>}
          {!error && results.length === 0 && (
            <li className="px-4 py-3 text-sm text-white/60">No matches found.</li>
          )}
          {results.map((place, index) => (
            <li key={`${place.lat},${place.lon},${index}`}>
              <button
                type="button"
                onClick={() => choose(place)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-white/90 transition hover:bg-white/10"
              >
                <span aria-hidden="true">📍</span>
                <span className="truncate">{formatLocationOption(place)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SearchIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0 text-white/70"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 shrink-0 animate-spin text-white/70"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.4 0 0 5.4 0 12h4z" />
    </svg>
  );
}
