import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  ArrowDownUp,
  Funnel,
  Check,
  ChevronRight,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  AnnotatedCategory,
  getCategoryLabel,
} from "@/shared/model/AnnotatedCategory";
import {
  DateFilterOptions,
  emptyPostFilters,
  NbHatefulCommentsOptions,
  PostFilters,
  PostSortingCategory,
} from "@/shared/utils/post-util";
import { toggleFilterValue, isCategoryFiltered } from "@/shared/utils/filter-util";

type PostsFilterCategory =
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

  containsCategory: Object.values(AnnotatedCategory).map((category) => ({
    label: getCategoryLabel(category),
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
  postSortingCategory: selectedSortingCategory,
  setPostSortingCategory,
  selectAll,
}: Readonly<{
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  postFilters: PostFilters;
  setPostFilters: (value: PostFilters) => void;
  postSortingCategory: PostSortingCategory;
  setPostSortingCategory: (value: PostSortingCategory) => void;
  selectAll: () => void;
}>) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortingOpen, setSortingOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] =
    useState<PostsFilterCategory>("date");
  const [selectedFilters, setSelectedFilters] =
    useState<PostFilters>(postFilters);

  const toggleFilter = (value: string) => {
    setSelectedFilters((prev) => {
      return toggleFilterValue(prev, selectedCategory, value);
    });
  };

  const handleFiltersOpenChange = (open: React.SetStateAction<boolean>) => {
    setFiltersOpen(open);
    // Lorsque la modale se ferme, les filtres sont réinitialisés à la valeur des filtres appliqués
    if (!open) {
      setSelectedFilters(postFilters);
    }
  };

  const handleSortingOpenChange = (open: React.SetStateAction<boolean>) => {
    setSortingOpen(open);
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

      <Button variant="outline" onClick={() => selectAll()}>
        Tout sélectionner
      </Button>

      <Popover open={filtersOpen} onOpenChange={handleFiltersOpenChange}>
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
                        setSelectedCategory(category.id as PostsFilterCategory)
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

      <Popover open={sortingOpen} onOpenChange={handleSortingOpenChange}>
        <PopoverTrigger>
          <Button variant="outline" onClick={() => setSortingOpen(true)}>
            <ArrowDownUp /> Trier
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-auto p-0 flex flex-col min-w-sm"
        >
          <div>
            {Object.values(PostSortingCategory).map((sortingCategory) => (
              <div key={sortingCategory} className="p-1">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setPostSortingCategory(
                      sortingCategory as PostSortingCategory,
                    );
                    setSortingOpen(false);
                  }}
                  className=" text-left p-2 hover:bg-accent transition-colors flex items-center justify-start rounded-sm w-full"
                >
                  {[
                    PostSortingCategory.ANALYSIS_DATE_DESC,
                    PostSortingCategory.PUBLICATION_DATE_DESC,
                    PostSortingCategory.NB_HATEFUL_COMMENTS_DESC,
                  ].includes(sortingCategory as PostSortingCategory) && (
                    <ArrowUp />
                  )}
                  {[
                    PostSortingCategory.ANALYSIS_DATE_ASC,
                    PostSortingCategory.PUBLICATION_DATE_ASC,
                    PostSortingCategory.NB_HATEFUL_COMMENTS_ASC,
                  ].includes(sortingCategory as PostSortingCategory) && (
                    <ArrowDown />
                  )}
                  <span>
                    {getSortingLabel(sortingCategory as PostSortingCategory)}
                  </span>
                  {selectedSortingCategory ===
                    (sortingCategory as PostSortingCategory) && (
                    <Check className="ms-auto" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>
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



// Attention, Le texte ne correspond pas forcément à un ordre croissant ou décroissant au sens mathématique,
// mais plutôt à une logique métier (ex: "de nouveau à ancien" est considéré comme descendant même si du point
// de vue mathématique c'est un ordre croissant)
function getSortingLabel(sortingCategory: PostSortingCategory): string {
  switch (sortingCategory) {
    case PostSortingCategory.ANALYSIS_DATE_ASC:
      return "Date analyse : d’ancien à nouveau";
    case PostSortingCategory.ANALYSIS_DATE_DESC:
      return "Date analyse : de nouveau à ancien";
    case PostSortingCategory.PUBLICATION_DATE_ASC:
      return "Date publication : d’ancien à nouveau";
    case PostSortingCategory.PUBLICATION_DATE_DESC:
      return "Date publication : de nouveau à ancien";
    case PostSortingCategory.NB_HATEFUL_COMMENTS_ASC:
      return "Nb commentaires malveillants : de faible à élevé";
    case PostSortingCategory.NB_HATEFUL_COMMENTS_DESC:
      return "Nb commentaires malveillants : d’élevé à faible";
  }
}
