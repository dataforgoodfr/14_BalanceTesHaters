import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowDownUp, Funnel, Check, ChevronRight } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  HatefulCategory,
  HatefulCategoryLabels,
} from "@/shared/model/HatefulCategory";
import {
  DateFilterOptions,
  emptyPostFilters,
  NbHatefulCommentsOptions,
  PostFilters,
} from "@/shared/utils/post-util";

type FilterCategory =
  | "date"
  | "score"
  | "alert"
  | "nbHatefulComments"
  | "status"
  | "containsCategory"
  | "containsAuthor";

const filterOptions = {
  date: [
    { label: "7 derniers jours", value: DateFilterOptions.SEVEN_DAYS },
    { label: "30 derniers jours", value: DateFilterOptions.THIRTY_DAYS },
    { label: "12 derniers mois", value: DateFilterOptions.TWELVE_MONTHS },
  ],
  score: [
    { label: "1/5", value: "1" },
    { label: "2/5", value: "2" },
    { label: "3/5", value: "3" },
    { label: "4/5", value: "4" },
    { label: "5/5", value: "5" },
  ],
  alert: [
    { label: "Détectée", value: "detected" },
    { label: "Non détectée", value: "not_detected" },
  ],

  nbHatefulComments: [
    { label: "0-10", value: NbHatefulCommentsOptions.ZERO_TEN },
    { label: "10-50", value: NbHatefulCommentsOptions.TEN_FIFTY },
    { label: "50+", value: NbHatefulCommentsOptions.FIFTY_PLUS },
  ],

  status: [
    { label: "Terminée", value: "done" },
    { label: "Non terminée", value: "in_progress" },
  ],

  containsCategory: Object.values(HatefulCategory).map((category) => ({
    label: HatefulCategoryLabels[category],
    value: category,
  })),

  containsAuthor: [
    { label: "Détectée", value: "detected" },
    { label: "Non détectée", value: "not_detected" },
  ],
};

const categories = [
  { id: "date", label: "Date publication", isDisabled: false },
  { id: "score", label: "Score juridique", isDisabled: true },
  { id: "alert", label: "Alerte sécurité", isDisabled: true },
  {
    id: "nbHatefulComments",
    label: "Nb commentaires malveillants",
    isDisabled: false,
  },
  { id: "status", label: "Statut", isDisabled: true },
  { id: "containsCategory", label: "Contient : Catégorie", isDisabled: true },
  {
    id: "containsAuthor",
    label: "Contient : Pseudo auteur",
    isDisabled: true,
  },
] as const;

function SearchSortFiltersPostList({
  searchTerm,
  setSearchTerm,
  postFilters,
  setPostFilters,
}: Readonly<{
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  postFilters: PostFilters;
  setPostFilters: (value: PostFilters) => void;
}>) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] =
    useState<FilterCategory>("date");
  const [selectedFilters, setSelectedFilters] =
    useState<PostFilters>(postFilters);

  const toggleFilter = (value: string) => {
    setSelectedFilters((prev) => {
      return togglePostFiltersValue(prev, selectedCategory, value);
    });
  };

  const handleOpenChange = (open: React.SetStateAction<boolean>) => {
    setFiltersOpen(open);
    // Lorsque la modale se ferme, les filtres sont réinitialisés à la valeur des filtres appliqués
    if (!open) {
      setSelectedFilters(postFilters);
    }
  };

  const nbSelectedFilters = Object.values(postFilters).filter((categoryValue) =>
    isCategoryFiltered(categoryValue),
  ).length;

  return (
    <div className="flex gap-3 w-full">
      <Input
        className="w-1/3"
        placeholder="Rechercher"
        value={searchTerm}
        onChange={(event) => setSearchTerm(event.target.value)}
      />

      <Popover open={filtersOpen} onOpenChange={handleOpenChange}>
        <PopoverTrigger>
          <Button variant="outline" onClick={() => setFiltersOpen(true)}>
            <Funnel /> Filtrer{" "}
            {nbSelectedFilters > 0 && `(${nbSelectedFilters})`}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <div>
            <div className="flex rounded-lg ">
              {/* Left Column - Categories */}
              <div className="border-r ">
                {categories.map((category) => (
                  <div key={category.id} className="p-1">
                    <Button
                      variant="ghost"
                      onClick={() =>
                        setSelectedCategory(category.id as FilterCategory)
                      }
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

              {/* Right Column - Options */}
              <div className="min-w-64 p-2">
                <div className="flex flex-col gap-1 ">
                  {filterOptions[selectedCategory].map((option) => {
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
                          " p-2 hover:bg-accent transition-colors flex items-center justify-start rounded-sm",
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
            {/* Action Buttons */}
            <div className="flex justify-end gap-2 p-2 border-t">
              <Button
                variant="outline"
                className="rounded-md"
                size="sm"
                onClick={() => setSelectedFilters(emptyPostFilters)}
              >
                Réinitialiser
              </Button>
              <Button
                className="rounded-md"
                size="sm"
                onClick={() => {
                  setPostFilters(selectedFilters);
                  setFiltersOpen(false);
                }}
              >
                Appliquer
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <Button variant="outline" disabled>
        <ArrowDownUp />
        Trier
      </Button>
    </div>
  );
}

export default SearchSortFiltersPostList;

function isSelectedOption(
  selectedFilters: PostFilters,
  selectedCategory: keyof PostFilters,
  optionValue: string,
) {
  if (Array.isArray(selectedFilters[selectedCategory])) {
    return (selectedFilters[selectedCategory] as string[]).includes(
      optionValue,
    );
  } else {
    return (selectedFilters[selectedCategory] as string) === optionValue;
  }
}

function togglePostFiltersValue(
  previousFilters: PostFilters,
  filterCategory: keyof PostFilters,
  selectedValue: string,
): PostFilters {
  const previousCategoryValue = previousFilters[filterCategory];
  if (Array.isArray(previousCategoryValue)) {
    // Multi category value
    const newCategoryValue: string[] = (
      previousCategoryValue as string[]
    ).includes(selectedValue)
      ? previousCategoryValue.filter((v) => v !== selectedValue)
      : [...previousCategoryValue, selectedValue];
    return {
      ...previousFilters,
      [filterCategory]: newCategoryValue,
    };
  } else {
    // Single category value
    // Set to undefined if clicking current value or replace value
    const newCategoryValue: string | undefined =
      (previousCategoryValue as string) === selectedValue
        ? undefined
        : selectedValue;
    return {
      ...previousFilters,
      [filterCategory]: newCategoryValue,
    };
  }
}

function isCategoryFiltered(
  categoryValue: string[] | string | undefined,
): boolean {
  return Array.isArray(categoryValue)
    ? categoryValue.length > 0
    : categoryValue !== undefined;
}
