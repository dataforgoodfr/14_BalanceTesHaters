import { ArrowBigRight, BookOpenText } from "lucide-react";
import { NOTICE_UTILISATION_DATA } from "./noticeUtilisationData";

export const NoticeUtilisation = () => {
  return (
    <div className="border rounded-lg  bg-indigo-50 border-indigo-100 text-indigo-800">
      <div className="flex items-center gap-2 p-4 border-b-2 border-indigo-100">
        <BookOpenText />
        <span className="text-xl font-semibold">
          {NOTICE_UTILISATION_DATA.mainTitle}
        </span>
      </div>
      <div className="flex flex-col gap-3 text-left px-8 py-3">
        {NOTICE_UTILISATION_DATA.sections.map((section) => (
          <div key={section.title}>
            <span className="text-lg font-semibold">{section.title}</span>
            <ul className="list-disc list-inside">
              {section.items.map((item) =>
                item.isSpecial ? (
                  <div key={item.text} className="flex items-center gap-2">
                    <ArrowBigRight strokeWidth="1.5" size={16} />
                    <span>{item.text}</span>
                  </div>
                ) : (
                  <li key={item.text}>{item.text}</li>
                ),
              )}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};
