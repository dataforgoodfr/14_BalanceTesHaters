import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { SearchIcon, Check, ChevronRight, Funnel } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CommentFilters, emptyCommentFilters } from "@/shared/utils/post-util";
import {
  isSelectedOption,
  toggleFilterValue,
} from "@/shared/utils/filter-util";
import {
  AnnotatedCategory,
  getCategoryLabel,
} from "@/shared/model/AnnotatedCategory";

const categories = [
  { id: "date", label: "Date", isDisabled: true },
  { id: "score", label: "Score juridique", isDisabled: true },
  { id: "alert", label: "Alerte sécurité", isDisabled: true },
  { id: "category", label: "Catégorie", isDisabled: true },
  { id: "pseudoAuthor", label: "Pseudo auteur", isDisabled: false },
  { id: "status", label: "Statut du commentaire", isDisabled: true },
] as const;

type CommentsFilterCategory =
  | "date"
  | "score"
  | "alert"
  | "category"
  | "pseudoAuthor"
  | "status";

const filterOptions: Record<
  CommentsFilterCategory,
  { label: string; value: string }[]
> = {
  date: [],
  score: [
    { label: "5/5", value: "5" },
    { label: "4/5", value: "4" },
    { label: "3/5", value: "3" },
    { label: "2/5", value: "2" },
    { label: "1/5", value: "1" },
  ],
  alert: [
    { label: "Détectée", value: "detected" },
    { label: "Non détectée", value: "not_detected" },
  ],
  category: Object.values(AnnotatedCategory).map((category) => ({
    label: getCategoryLabel(category),
    value: category,
  })),
  pseudoAuthor: [],
  status: [
    { label: "Nouveau", value: "new" },
    { label: "Supprimé", value: "deleted" },
  ],
};

type CommentsFilterPopoverProperties = {
  authorList: string[];
  commentFilters: CommentFilters;
  onApplyFilters: (filters: CommentFilters) => void;
};

export default function CommentsFilterPopover({
  authorList,
  commentFilters,
  onApplyFilters,
}: Readonly<CommentsFilterPopoverProperties>) {
  const [selectedCategory, setSelectedCategory] =
    useState<CommentsFilterCategory>("pseudoAuthor");
  const [selectedFilters, setSelectedFilters] =
    useState<CommentFilters>(commentFilters);
  const [authorSearchTerm, setAuthorSearchTerm] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  React.useEffect(() => {
    if (selectedCategory !== "pseudoAuthor" && authorSearchTerm !== "") {
      setAuthorSearchTerm("");
    }
  }, [selectedCategory, authorSearchTerm]);

  React.useEffect(() => {
    if (!filtersOpen) {
      setSelectedFilters(commentFilters);
    }
  }, [filtersOpen, commentFilters]);

  const toggleFilter = (value: string) => {
    setSelectedFilters((prev) => {
      return toggleFilterValue(prev, selectedCategory, value);
    });
  };

  const handleFiltersOpenChange = (open: React.SetStateAction<boolean>) => {
    setFiltersOpen(open);
    // Lorsque la modale se ferme, les filtres sont réinitialisés à la valeur des filtres appliqués
    if (!open) {
      setSelectedFilters(commentFilters);
    }
  };

  const pseudoAuthorOptions = useMemo(
    () =>
      [...new Set(authorList)]
        .map((author) => ({ label: author, value: author }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [authorList],
  );

  const filteredPseudoAuthorOptions = useMemo(() => {
    if (selectedCategory !== "pseudoAuthor") {
      return pseudoAuthorOptions;
    }

    const normalizedAuthorSearchTerm = authorSearchTerm.trim().toLowerCase();
    const matchingOptions = pseudoAuthorOptions.filter((option) =>
      option.label.toLowerCase().includes(normalizedAuthorSearchTerm),
    );

    const selectedOptions = pseudoAuthorOptions.filter(
      (option) =>
        selectedFilters.pseudoAuthor.includes(option.value) &&
        !matchingOptions.some((matching) => matching.value === option.value),
    );

    return [...matchingOptions, ...selectedOptions];
  }, [
    authorSearchTerm,
    pseudoAuthorOptions,
    selectedCategory,
    selectedFilters.pseudoAuthor,
  ]);

  const optionsToRender =
    selectedCategory === "pseudoAuthor"
      ? filteredPseudoAuthorOptions
      : filterOptions[selectedCategory];

  return (
    <Popover open={filtersOpen} onOpenChange={handleFiltersOpenChange}>
      <PopoverTrigger>
        <Button variant="outline" onClick={() => setFiltersOpen(true)}>
          <Funnel /> Filtrer
          {Object.values(commentFilters).some((categoryValue) =>
            Array.isArray(categoryValue)
              ? categoryValue.length > 0
              : categoryValue !== undefined,
          ) &&
            ` (${
              Object.values(commentFilters).filter((categoryValue) =>
                Array.isArray(categoryValue)
                  ? categoryValue.length > 0
                  : categoryValue !== undefined,
              ).length
            })`}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <div>
          <div className="flex rounded-lg max-h-66">
            <div className="border-r overflow-visible">
              {categories.map((category) => (
                <div key={category.id} className="p-1">
                  <Button
                    variant="ghost"
                    onClick={() => setSelectedCategory(category.id)}
                    disabled={category.isDisabled}
                    className={cn(
                      "w-full text-left p-2 hover:bg-accent transition-colors flex items-center justify-between rounded-sm",
                      selectedCategory === category.id ? "bg-accent-2" : "",
                    )}
                  >
                    <span>{category.label}</span>
                    <ChevronRight />
                  </Button>
                </div>
              ))}
            </div>

            <div className="min-w-64 p-2 overflow-y-auto">
              {selectedCategory === "pseudoAuthor" ? (
                <div className="pb-3">
                  <InputGroup className="w-full">
                    <InputGroupInput
                      value={authorSearchTerm}
                      onChange={(event) =>
                        setAuthorSearchTerm(event.target.value)
                      }
                      placeholder="Rechercher un auteur"
                      aria-label="Rechercher un auteur"
                    />
                    <InputGroupAddon>
                      <SearchIcon />
                    </InputGroupAddon>
                  </InputGroup>
                </div>
              ) : null}
              <div className="flex flex-col gap-1">
                {optionsToRender.map((option) => {
                  const isSelected = isSelectedOption(
                    selectedFilters,
                    selectedCategory,
                    option.value,
                  );
                  return (
                    <Button
                      variant="ghost"
                      key={option.value}
                      onClick={() => toggleFilter(option.value)}
                      className={cn(
                        "p-2 hover:bg-accent transition-colors flex items-center justify-start rounded-sm",
                        isSelected ? "" : "ps-7",
                      )}
                    >
                      {isSelected && <Check className="w-7 h-4" />}
                      <span className={cn("text-sm")}>{option.label}</span>
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 p-2 border-t">
            <Button
              variant="outline"
              className="rounded-md"
              size="sm"
              onClick={() => setSelectedFilters(emptyCommentFilters)}
            >
              Réinitialiser
            </Button>
            <Button
              className="rounded-md"
              size="sm"
              onClick={() => {
                onApplyFilters(selectedFilters);
                setFiltersOpen(false);
              }}
            >
              Appliquer
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
