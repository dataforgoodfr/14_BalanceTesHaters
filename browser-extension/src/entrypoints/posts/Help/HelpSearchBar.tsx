import { useState, useEffect, useRef } from "react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { SearchIcon } from "lucide-react";
import { searchHelpPages, SearchResult } from "./helpSearchUtil";

export function HelpSearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (query.length >= 2) {
        const searchHits = searchHelpPages(query);
        setResults(searchHits);
        setIsOpen(true);
      } else {
        setResults([]);
        setIsOpen(false);
      }
    }, 150); // Small debounce

    return () => clearTimeout(delayDebounce);
  }, [query]);

  // Close dropdown if user clicks outside the component
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Utility to highlight the exact matching keyword inside the text snippet
  const renderHighlightedSnippet = (snippet: string, highlight: string) => {
    if (!highlight) return snippet;
    const parts = snippet.split(new RegExp(`(${highlight})`, "gi"));
    return (
      <>
        {parts.map((part, index) =>
          part.toLowerCase() === highlight.toLowerCase() ? (
            <mark
              key={index}
              className="bg-yellow-200 text-black font-medium rounded-sm px-0.5"
            >
              {part}
            </mark>
          ) : (
            part
          ),
        )}
      </>
    );
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full max-w-md mx-auto my-4 z-50"
    >
      {/* Search Input field */}
      <div className="relative">
        <InputGroup className="w-full bg-background">
          <InputGroupInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => query.length >= 2 && setIsOpen(true)}
            placeholder="Rechercher par mot-clé"
            className=""
          />

          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          )}
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
        </InputGroup>
      </div>

      {/* Dynamic Floating Results Panel */}
      {isOpen && (
        <div className="absolute w-full mt-1 bg-white border rounded-lg shadow-xl max-h-80 overflow-y-auto divide-y divide-gray-100">
          {results.length > 0 ? (
            results.map((result, idx) => (
              <a
                key={idx}
                href={result.url}
                onClick={() => setIsOpen(false)}
                className="block p-3 hover:bg-gray-50 transition-colors group"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                    {result.pageTitle}
                  </span>
                  <span className="text-xs font-medium text-gray-400 group-hover:text-gray-600 truncate">
                    ➔ {result.sectionTitle}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1.5 line-clamp-2 leading-relaxed">
                  {renderHighlightedSnippet(result.snippet, query)}
                </p>
              </a>
            ))
          ) : (
            <div className="p-4 text-center text-sm text-gray-500">
              Aucun résultat trouvé pour «{" "}
              <span className="font-medium">{query}</span> »
            </div>
          )}
        </div>
      )}
    </div>
  );
}
