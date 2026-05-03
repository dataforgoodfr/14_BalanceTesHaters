import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";

export function HelpPageContent({ mdContent }: { mdContent: string }) {
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
        rehypePlugins={[[rehypeRaw, { passThrough: ["br"] }]]}
      >
        {mdContent}
      </ReactMarkdown>
    </div>
  );
}
