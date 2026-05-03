import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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
        "[&_td:first-child]:font-medium [&_th_strong]:font-medium!"
      }
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{mdContent}</ReactMarkdown>
    </div>
  );
}
