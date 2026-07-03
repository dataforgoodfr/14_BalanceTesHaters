import { main } from "../Menu";
import harassmentHelpMarkdown from "./harassment-help.md?raw";
import productHelpMarkdown from "./product-help.md?raw";
import privacyHelpMarkdown from "./privacy-policy.md?raw";
// Import other markdown files here...

interface HelpPageRegistry {
  title: string;
  route: string;
  rawContent: string;
}
const basePostUrl = "/posts.html#"; 

const HELP_PAGES: HelpPageRegistry[] = [
  {
    title: main.menuEntries.Product.label,
    route: basePostUrl + main.menuEntries.Product.to,
    rawContent: productHelpMarkdown,
  },
  {
    title: main.menuEntries.Harrasement.label,
    route: basePostUrl + main.menuEntries.Harrasement.to,
    rawContent: harassmentHelpMarkdown,
  },
  {
    title: main.menuEntries.Privacy.label,
    route: basePostUrl + main.menuEntries.Privacy.to,
    rawContent: privacyHelpMarkdown,
  },
  // Add pages to search here
];

export interface SearchResult {
  pageTitle: string;
  sectionTitle: string;
  url: string; 
  snippet: string;
}

// Helper to convert heading text to a URL-friendly slug matching rehype-slug behavior
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]+/gu, "") // keep letters, numbers, spaces, hyphens
    .replace(/[\s_]+/g, "-"); // converts spaces/underscores to hyphens
}

// Helper to clean markdown formatting characters so snippets read cleanly
function cleanMarkdownText(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Simplify links to just their text
    .replace(/[*_`#-]/g, "") // Strip formatting tokens
    .trim();
}

export function searchHelpPages(query: string): SearchResult[] {
  if (!query.trim() || query.length < 2) return [];

  const results: SearchResult[] = [];
  const lowercaseQuery = query.toLowerCase();

  for (const page of HELP_PAGES) {
    // Split document by lines to accurately track which heading text belongs to
    const lines = page.rawContent.split("\n");

    let currentSectionTitle = "";
    let currentSectionSlug = "";
    let accumulatedSectionText = "";

    const processAccumulatedText = (
      sectionTitle: string,
      slug: string,
      text: string,
    ) => {
      const cleanText = cleanMarkdownText(text);
      const matchIndex = cleanText.toLowerCase().indexOf(lowercaseQuery);

      if (matchIndex !== -1) {
        // Extract ~50 characters before and after the match for context
        const padding = 50;
        const start = Math.max(0, matchIndex - padding);
        const end = Math.min(
          cleanText.length,
          matchIndex + query.length + padding,
        );

        let snippet = cleanText.substring(start, end);
        if (start > 0) snippet = "..." + snippet;
        if (end < cleanText.length) snippet = snippet + "...";

        const searchParam = `&search=${encodeURIComponent(query)}`;
        const finalUrl = slug 
          ? `${page.route}?anchor=${slug}${searchParam}` 
          : `${page.route}?search=${searchParam}`;

        results.push({
          pageTitle: page.title,
          sectionTitle,
          url: finalUrl,
          snippet,
        });
      }
    };

    for (const line of lines) {
      // Check if line is a heading (### or ####)
      const headingMatch = new RegExp(/^#{2,4}\s+(.*)$/).exec(line);

      if (headingMatch) {
        // Before moving to the next section, scan the accumulated text of the previous section
        if (accumulatedSectionText) {
          processAccumulatedText(
            currentSectionTitle,
            currentSectionSlug,
            accumulatedSectionText,
          );
        }

        // Reset counters for the new section
        currentSectionTitle = headingMatch[1].trim();
        currentSectionSlug = slugify(currentSectionTitle);
        accumulatedSectionText = "";
      } else {
        accumulatedSectionText += " " + line;
      }
    }

    // Process the final section of the document
    if (accumulatedSectionText) {
      processAccumulatedText(
        currentSectionTitle,
        currentSectionSlug,
        accumulatedSectionText,
      );
    }
  }

  return results;
}
