import { PublicationDate } from "@/shared/model/post";

export default function PublishedAt({ at }: { at: PublicationDate }) {
  return <>
    {at.type === "absolute"
      ? <div>Publication: {at.date}</div>
      : at.type === "relative"
        ? <div>Publication: entre {at.resolvedDateRange.start} et {at.resolvedDateRange.end}</div>
        : <div>Publication: date inconnue</div>
    }
  </>
}
