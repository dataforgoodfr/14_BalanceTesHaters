import { PublicationDate } from "@/shared/model/PublicationDate";

export default function DisplayPublishedDate({
  date: at,
}: Readonly<{
  date: PublicationDate;
}>) {
  return (
    <span className="text-gray-500">
      Publiée {at.type === "absolute" && <>le {formatDate(at.date)}</>}
      {at.type === "relative" && (
        <>
          entre le {formatDate(at.resolvedDateRange.start)} et le{" "}
          {formatDate(at.resolvedDateRange.end)}
        </>
      )}
      {at.type === "unknown date" && <> à une date inconnue</>}
    </span>
  );
}

function formatDate(isoDateTime: string): string {
  return new Date(isoDateTime).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
