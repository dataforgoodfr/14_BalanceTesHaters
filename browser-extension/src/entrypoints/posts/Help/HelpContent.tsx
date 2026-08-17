import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";

export function HelpPageContent({ mdContent }: { mdContent: string }) {
  useEffect(() => {
    let pendingScrollTimeout: ReturnType<typeof setTimeout> | undefined;

    const handleScrollToAnchor = () => {
      // Extract the query parameters sitting inside or after the hash
      const hashParts = window.location.hash.split("?");
      if (hashParts.length > 1) {
        const params = new URLSearchParams(hashParts[1]);
        const anchorId = params.get("anchor");

        if (anchorId) {
          // Give Markdown a tiny macro-task delay to fully paint the HTML elements
          if (pendingScrollTimeout !== undefined) {
            globalThis.clearTimeout(pendingScrollTimeout);
          }
          pendingScrollTimeout = setTimeout(() => {
            pendingScrollTimeout = undefined;
            const element = document.getElementById(anchorId);
            if (element) {
              element.scrollIntoView({ behavior: "smooth", block: "start" });
            }
          }, 150);
        }
      }
    };

    // Run on initial component mount
    handleScrollToAnchor();

    // Listen for changes if the user searches and clicks a new section while remaining on the same page
    globalThis.addEventListener("hashchange", handleScrollToAnchor);
    return () => {
      globalThis.removeEventListener("hashchange", handleScrollToAnchor);
      if (pendingScrollTimeout !== undefined) {
        globalThis.clearTimeout(pendingScrollTimeout);
      }
    };
  }, [mdContent]); // Re-run if content changes

  return (
    <div
      className={
        "text-left " +
        "[&_p]:mt-2! [&_p]:leading-5! " +
        "[&_h3]:mt-8! " +
        "[&_h4]:mt-4! " +
        "[&_strong]:font-semibold! " +
        "[&_a]:hover:underline " +
        "[&_ul]:list-disc [&_ul]:pl-6 [&_li]:my-1 [&_ol]:list-decimal [&_ol]:pl-6 " +
        "[&_table]:w-full [&_table]:mt-4! [&_table]:border-collapse [&_td]:border [&_td]:p-1 [&_th]:border [&_th]:p-1 " +
        "[&_th]:font-bold!"
      }
    >
      <ReactMarkdown
        /* Enable Markdown tables support */
        remarkPlugins={[remarkGfm]}
        /* Enable HTML (mainly for <br> tags in markdown table) */
        rehypePlugins={[rehypeSlug, [rehypeRaw, { passThrough: ["br"] }]]}
      >
        {mdContent}
      </ReactMarkdown>
    </div>
  );
}
