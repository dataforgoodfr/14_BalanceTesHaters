import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ArrowDown, ArrowDownUp, ArrowUp, Check } from "lucide-react";
import { CommentSortingCategory } from "@/shared/utils/post-util";

type Props = {
  commentSortingCategory: CommentSortingCategory;
  onChange: (sortingCategory: CommentSortingCategory) => void;
};

function getSortingLabel(sortingCategory: CommentSortingCategory): string {
  switch (sortingCategory) {
    case CommentSortingCategory.SCORE_ASC:
      return "Score juridique : d'élevé à faible";
    case CommentSortingCategory.SCORE_DESC:
      return "Score juridique : de faible à élevé";
    case CommentSortingCategory.COMMENT_DATE_DESC:
      return "Date commentaire : d’ancien à nouveau";
    case CommentSortingCategory.COMMENT_DATE_ASC:
      return "Date commentaire : de nouveau à ancien";
    case CommentSortingCategory.PSEUDO_AUTHOR_ASC:
      return "Pseudo auteur : de A à Z";
    case CommentSortingCategory.PSEUDO_AUTHOR_DESC:
      return "Pseudo auteur : de Z à A";
  }
}

export default function CommentsSortingPopover({
  commentSortingCategory,
  onChange,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger>
        <Button variant="outline" onClick={() => setOpen(true)}>
          <ArrowDownUp /> Trier
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-auto p-0 flex flex-col min-w-sm"
      >
        <div>
          {Object.values(CommentSortingCategory).map((sortingCategory) => (
            <div key={sortingCategory} className="p-1">
              <Button
                variant="ghost"
                disabled={
                  sortingCategory === CommentSortingCategory.SCORE_DESC ||
                  sortingCategory === CommentSortingCategory.SCORE_ASC
                }
                onClick={() => {
                  onChange(sortingCategory);
                  setOpen(false);
                }}
                className="text-left p-2 hover:bg-accent transition-colors flex items-center justify-start rounded-sm w-full"
              >
                {[
                  CommentSortingCategory.SCORE_ASC,
                  CommentSortingCategory.COMMENT_DATE_ASC,
                  CommentSortingCategory.PSEUDO_AUTHOR_ASC,
                ].includes(sortingCategory) && <ArrowUp />}
                {[
                  CommentSortingCategory.SCORE_DESC,
                  CommentSortingCategory.COMMENT_DATE_DESC,
                  CommentSortingCategory.PSEUDO_AUTHOR_DESC,
                ].includes(sortingCategory) && <ArrowDown />}
                <span>{getSortingLabel(sortingCategory)}</span>
                {commentSortingCategory === sortingCategory && (
                  <Check className="ms-auto" />
                )}
              </Button>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
