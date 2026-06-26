import { useMemo } from "react";
import {
  useReactTable,
  getPaginationRowModel,
  getCoreRowModel,
  flexRender,
} from "@tanstack/react-table";
import {
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  Table,
  TableCell,
} from "@/components/ui/table";
import {
  ArrowDown,
  ArrowDownUp,
  ArrowUp,
  Check,
  ChevronRight,
  Eye,
  EyeOff,
  Funnel,
  SearchIcon,
  UserRound,
} from "lucide-react";
import { PostComment } from "@/shared/model/post/Post";
import { Checkbox } from "@/components/ui/checkbox";
import { ColumnDef } from "@tanstack/react-table";
import DisplayPublicationDate from "../Developer/DisplayPublicationDate";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Button } from "@/components/ui/button";
import React from "react";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
} from "@/components/ui/pagination";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "@tanstack/react-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { buildDataUrl, PNG_MIME_TYPE } from "@/shared/utils/data-url";
import { useNavigate } from "react-router";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  CommentFilters,
  CommentSortingCategory,
  emptyCommentFilters,
} from "@/shared/utils/post-util";
import {
  toggleFilterValue,
  isCategoryFiltered,
  isSelectedOption,
} from "@/shared/utils/filter-util";
import { cn } from "@/lib/utils";
import {
  AnnotatedCategory,
  getCategoryLabel,
} from "@/shared/model/AnnotatedCategory";

type CommentsFilterCategory =
  | "date"
  | "score"
  | "alert"
  | "pseudoAuthor"
  | "status";

/**
 * Merged view of Post Snapshot
 */
export type PostCommentWithId = PostComment & {
  id: string;
  postId: string;
  socialNetwork: string;
  postKey: string;
  isCommentHateful: boolean;
};

const categories = [
  { id: "date", label: "Date", isDisabled: true },
  { id: "score", label: "Score juridique", isDisabled: true },
  { id: "alert", label: "Alerte sécurité", isDisabled: true },
  { id: "category", label: "Catégorie", isDisabled: true },
  { id: "pseudoAuthor", label: "Pseudo auteur", isDisabled: false },
  { id: "status", label: "Statut du commentaire", isDisabled: true },
] as const;

export default function CommentsTable({
  commentList,
  commentFilters,
  setCommentFilters,
  commentSortingCategory,
  setCommentSortingCategory,
  defaultSelectedCommentIdList,
  onSubmit,
  formId,
  authorList,
  showCreateReportButton,
  showScreenshotColumn = false,
}: Readonly<{
  commentList: PostCommentWithId[];
  commentFilters: CommentFilters;
  setCommentFilters: (value: CommentFilters) => void;
  commentSortingCategory: CommentSortingCategory;
  setCommentSortingCategory: (value: CommentSortingCategory) => void;
  defaultSelectedCommentIdList: string[];
  onSubmit: (commentIdList: string[]) => void;
  formId: string;
  authorList: string[];
  showCreateReportButton: boolean;
  showScreenshotColumn?: boolean;
}>) {
  const [inputValue, setInputValue] = React.useState("");
  const [searchTerm, setSearchTerm] = React.useState("");
  const [sortingOpen, setSortingOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [visibleComments, setVisibleComments] = React.useState<Set<string>>(
    new Set(),
  );
  const [selectedCommentIdList, setSelectedCommentIdList] = React.useState<
    Set<string>
  >(new Set(defaultSelectedCommentIdList));
  const [screenshotDialogOpen, setScreenshotDialogOpen] = React.useState(false);
  const [selectedScreenshot, setSelectedScreenshot] = React.useState<
    string | null
  >(null);
  const form = useForm({
    defaultValues: {
      commentIdList: defaultSelectedCommentIdList,
    },
    onSubmit: () => {
      onSubmit(form.state.values.commentIdList);
    },
  });

  const [selectedCategory, setSelectedCategory] =
    useState<CommentsFilterCategory>("date");
  const [selectedFilters, setSelectedFilters] =
    useState<CommentFilters>(commentFilters);
  const [authorSearchTerm, setAuthorSearchTerm] = React.useState("");

  React.useEffect(() => {
    if (selectedCategory !== "pseudoAuthor" && authorSearchTerm !== "") {
      setAuthorSearchTerm("");
    }
  }, [selectedCategory, authorSearchTerm]);

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

  const handleSortingOpenChange = (open: React.SetStateAction<boolean>) => {
    setSortingOpen(open);
  };

  // Permet de suivre les commentaires actuellement affichés (non floutés)
  //  dans le tableau, en stockant leurs IDs dans un Set
  const toggleCommentVisibility = (id: string) => {
    setVisibleComments((prev) => addOrRemoveValueToSet(prev, id));
  };

  const updateSelectedCommentList = (commentIdList: Set<string>) => {
    // La gestion du formulaire est complexe avec le tableau. La valeur est donc mise à jour manuellement.
    form.setFieldValue("commentIdList", [...commentIdList]);
    setSelectedCommentIdList(commentIdList);
  };

  const toggleCommentSelection = (id: string) => {
    updateSelectedCommentList(addOrRemoveValueToSet(selectedCommentIdList, id));
  };

  const openScreenshotDialog = (screenshotData: string) => {
    setSelectedScreenshot(screenshotData);
    setScreenshotDialogOpen(true);
  };

  const filteredComments = React.useMemo(
    () =>
      commentList.filter(
        (comment) =>
          comment.textContent
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          comment.author.name.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    [commentList, searchTerm],
  );

  // On utilise une valeur intermédiaire pour le champ de recherche afin de ne pas lancer le filtrage
  // à chaque frappe de l'utilisateur, mais seulement après un court délai d'inactivité (500ms ici)
  // Les performances n'étaient pas top avec le filtrage à chaque frappe
  React.useEffect(() => {
    const timer = setTimeout(() => setSearchTerm(inputValue), 500);
    return () => clearTimeout(timer);
  }, [inputValue]);

  // La taille de chaque colonne est convertie ensuite en pourcentage. Attention, la somme doit faire 100%.
  const columns = useMemo<ColumnDef<PostCommentWithId>[]>(
    () => [
      {
        id: "selection",
        size: 5,
        header: () => (
          <Checkbox
            className="ms-3 me-5"
            checked={selectedCommentIdList.size === filteredComments.length}
            onClick={() => setAllCommentsSelection(true)}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            onClick={() => toggleCommentSelection(row.id)}
            checked={selectedCommentIdList.has(row.id)}
            className="ms-3 me-5"
          />
        ),
      },
      {
        accessorKey: "author.name",
        header: "Auteur",
        size: 21,
        cell: ({ row }) => (
          <div className="flex gap-2">
            <UserRound className="bg-gray-200 rounded-full" />
            {row.original.author.name}
          </div>
        ),
      },
      {
        accessorKey: "textContent",
        header: "Commentaire",
        size: 42,
        cell: ({ row }) => (
          <div
            className={`${visibleComments.has(row.id) ? "text-wrap" : "blur-sm overflow-hidden"}`}
          >
            {row.original.textContent}
          </div>
        ),
      },
      {
        id: "screenshot",
        header: "Capture",
        size: 14,
        cell: ({ row }) => {
          if (!row.original.screenshotData) {
            return <span className="text-muted-foreground">N/A</span>;
          }

          return (
            <img
              src={buildDataUrl(row.original.screenshotData, PNG_MIME_TYPE)}
              alt="Capture du commentaire"
              className="max-h-16 cursor-pointer border rounded"
              onClick={() => openScreenshotDialog(row.original.screenshotData)}
            />
          );
        },
      },
      {
        id: "vue",
        size: 7,
        header: () => (
          <div className="flex items-center gap-1">
            <span>Vue</span>
            <Button variant="ghost" onClick={() => setAllCommentsVisibility()}>
              {visibleComments.size === filteredComments.length ? (
                <Eye />
              ) : (
                <EyeOff />
              )}
            </Button>
          </div>
        ),
        cell: ({ row }) => (
          <Button
            variant="ghost"
            onClick={() => toggleCommentVisibility(row.id)}
          >
            {visibleComments.has(row.id) ? <Eye /> : <EyeOff />}
          </Button>
        ),
      },
      // TODO : A remplacer une fois qu'il n'y aura pas qu'une classification binaire
      // {
      //   accessorKey: "classification",
      //   header: "Catégorie",
      //   size: 13,
      //   cell: ({ row }) => (
      //     <div className="">
      //       {[...new Set(row.original.classification ?? [])].map(
      //         (category: string) => {
      //           return (
      //             <div
      //               key={category}
      //               className="bg-gray-200 rounded-full px-2 py-1 my-2 overflow-hidden text-ellipsis"
      //               title={category}
      //             >
      //               {category}
      //             </div>
      //           );
      //         },
      //       )}
      //     </div>
      //   ),
      // },
      // {
      // TODO : A remplacer ou à supprimer en fonction de la disponibilité des données
      //   id: "gravite",
      //   header: "Gravité",
      //   size: 7,
      //   cell: () => "-",
      // },
      // {
      // TODO : A remplacer ou à supprimer en fonction de la disponibilité des données
      //   id: "propos",
      //   header: "Propos",
      //   size: 7,
      //   cell: () => "-",
      // },
      {
        accessorKey: "publishedAt",
        header: "Date",
        size: 11,
        cell: ({ row }) => (
          <DisplayPublicationDate date={row.original.publishedAt} />
        ),
      },
    ],
    // Les colonnes seront rafraichies lorsque visibleComments change, pour
    // mettre à jour les icônes d'œil et les classes de floutage
    [
      filteredComments,
      openScreenshotDialog,
      selectedCommentIdList,
      visibleComments,
    ],
  );

  const table = useReactTable({
    data: filteredComments,
    columns: columns.filter(
      (column) => showScreenshotColumn || column.id !== "screenshot",
    ),
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize: 10,
      },
    },
  });

  const setAllCommentsVisibility = () => {
    if (visibleComments.size === filteredComments.length) {
      setVisibleComments(new Set());
    } else {
      const allVisibleRowIds = new Set(
        filteredComments.map((comment) => comment.id),
      );
      setVisibleComments(allVisibleRowIds);
    }
  };

  const setAllCommentsSelection = (canDeselect: boolean) => {
    if (canDeselect && selectedCommentIdList.size === filteredComments.length) {
      updateSelectedCommentList(new Set());
    } else {
      const allVisibleRowIds = new Set(
        filteredComments.map((comment) => comment.id),
      );
      updateSelectedCommentList(allVisibleRowIds);
    }
  };

  const nbSelectedFilters = Object.values(commentFilters).filter(
    (categoryValue) => isCategoryFiltered(categoryValue),
  ).length;

  const filterOptions = {
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
    containsCategory: Object.values(AnnotatedCategory).map((category) => ({
      label: getCategoryLabel(category),
      value: category,
    })),

    pseudoAuthor: [...new Set(authorList)]
      .map((author) => ({
        label: author,
        value: author,
      }))
      .sort((a, b) => a.label.localeCompare(b.label)),

    status: [
      { label: "Terminée", value: "done" },
      { label: "Non terminée", value: "in_progress" },
    ],
  };

  const filteredPseudoAuthorOptions = React.useMemo(() => {
    console.log("authorList", authorList);
    console.log("filterOptions.pseudoAuthor", filterOptions.pseudoAuthor);
    if (selectedCategory !== "pseudoAuthor") {
      return filterOptions.pseudoAuthor;
    }

    const normalizedAuthorSearchTerm = authorSearchTerm.trim().toLowerCase();
    const matchingOptions = filterOptions.pseudoAuthor.filter((option) =>
      option.label.toLowerCase().includes(normalizedAuthorSearchTerm),
    );

    const selectedOptions = filterOptions.pseudoAuthor.filter(
      (option) =>
        selectedFilters.pseudoAuthor.includes(option.value) &&
        !matchingOptions.some((matching) => matching.value === option.value),
    );

    return [...matchingOptions, ...selectedOptions];
  }, [authorSearchTerm, filterOptions.pseudoAuthor, selectedCategory, selectedFilters.pseudoAuthor]);

  const optionsToRender =
    selectedCategory === "pseudoAuthor"
      ? filteredPseudoAuthorOptions
      : filterOptions[selectedCategory];

  const navigate = useNavigate();

  return (
    <>
      <form
        id={formId}
        className="rounded-md border mt-2"
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          void form.handleSubmit();
        }}
      >
        {selectedCommentIdList.size > 0 && (
          <div className="px-3 pt-2">
            <div className="pe-2 w-fit gap-1 bg-muted rounded-md flex items-center justify-start font-semibold ">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  updateSelectedCommentList(new Set());
                }}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Déselectionner tous les commentaires"
              >
                ✕
              </Button>
              <span className="text-sm">
                {selectedCommentIdList.size} sélectionné
                {selectedCommentIdList.size > 1 ? "s" : ""}
              </span>
            </div>
          </div>
        )}
        <div className="p-3 flex gap-4">
          <InputGroup className=" w-1/3">
            <InputGroupInput
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              placeholder="Rechercher"
            />
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
          </InputGroup>
          {showCreateReportButton && (
            <Button
              disabled={selectedCommentIdList.size === 0}
              onClick={() => {
                void navigate("/build-report", {
                  state: {
                    socialNetworkFilter: [filteredComments[0].socialNetwork],
                    selectedPostIds: [filteredComments[0].postId],
                    selectedCommentList: filteredComments.filter((comment) =>
                      selectedCommentIdList.has(comment.id),
                    ),
                    skipToStep: "step-4",
                  },
                });
              }}
            >
              Créer un rapport
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => setAllCommentsSelection(false)}
          >
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
                <div className="flex rounded-lg max-h-66">
                  {/* Left Column - Categories */}
                  <div className="border-r overflow-visible">
                    {categories.map((category) => (
                      <div key={category.id} className="p-1">
                        <Button
                          variant="ghost"
                          onClick={() =>
                            setSelectedCategory(
                              category.id as CommentsFilterCategory,
                            )
                          }
                          disabled={category.isDisabled}
                          className={cn(
                            "w-full text-left p-2 hover:bg-accent transition-colors flex items-center justify-between rounded-sm",
                            selectedCategory === category.id
                              ? "bg-accent-2"
                              : "",
                          )}
                        >
                          <span>{category.label}</span>
                          <ChevronRight />
                        </Button>
                      </div>
                    ))}
                  </div>

                  {/* Right Column - Options */}
                  <div className="min-w-64 p-2 overflow-y-auto">
                    {selectedCategory === "pseudoAuthor" ? (
                      <div className="pb-3">
                        <InputGroup className="w-full">
                          <InputGroupInput
                            value={authorSearchTerm}
                            onChange={(event) =>
                              setAuthorSearchTerm(event.target.value)
                            }
                            placeholder="Rechercher"
                            aria-label="Rechercher un auteur"
                          />
                          <InputGroupAddon>
                            <SearchIcon />
                          </InputGroupAddon>
                        </InputGroup>
                      </div>
                    ) : null}
                    <div className="flex flex-col gap-1 ">
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
                              " p-2 hover:bg-accent transition-colors flex items-center justify-start rounded-sm",
                              isSelected ? "" : "ps-7",
                            )}
                          >
                            {isSelected && <Check className="w-7 h-4" />}
                            <span className={cn("text-sm")}>
                              {option.label}
                            </span>
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
                    onClick={() => setSelectedFilters(emptyCommentFilters)}
                  >
                    Réinitialiser
                  </Button>
                  <Button
                    className="rounded-md"
                    size="sm"
                    onClick={() => {
                      setCommentFilters(selectedFilters);
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
                {Object.values(CommentSortingCategory).map(
                  (sortingCategory) => (
                    <div key={sortingCategory} className="p-1">
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setCommentSortingCategory(
                            sortingCategory as CommentSortingCategory,
                          );
                          setSortingOpen(false);
                        }}
                        className=" text-left p-2 hover:bg-accent transition-colors flex items-center justify-start rounded-sm w-full"
                      >
                        {[
                          CommentSortingCategory.SCORE_DESC,
                          CommentSortingCategory.COMMENT_DATE_DESC,
                          CommentSortingCategory.PSEUDO_AUTHOR_ASC,
                        ].includes(
                          sortingCategory as CommentSortingCategory,
                        ) && <ArrowUp />}
                        {[
                          CommentSortingCategory.SCORE_ASC,
                          CommentSortingCategory.COMMENT_DATE_ASC,
                          CommentSortingCategory.PSEUDO_AUTHOR_DESC,
                        ].includes(
                          sortingCategory as CommentSortingCategory,
                        ) && <ArrowDown />}
                        <span>
                          {getSortingLabel(
                            sortingCategory as CommentSortingCategory,
                          )}
                        </span>
                        {commentSortingCategory ===
                          (sortingCategory as CommentSortingCategory) && (
                          <Check className="ms-auto" />
                        )}
                      </Button>
                    </div>
                  ),
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <form.Field
          name="commentIdList"
          validators={{
            onChange: ({ value }) =>
              value.length < 1
                ? "Sélectionner au moins un commentaire"
                : undefined,
          }}
        >
          {(field) => (
            <>
              {field.state.meta.errors.length > 0 && (
                <div className="text-destructive text-center text-sm mb-2">
                  {field.state.meta.errors.join(", ")}
                </div>
              )}
              <Table className="w-full table-fixed">
                <TableHeader className="bg-indigo-brand-100">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead
                          key={header.id}
                          style={{ width: `${header.column.columnDef.size}%` }}
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      className={
                        selectedCommentIdList.has(row.id) ? "bg-accent-2" : ""
                      }
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </form.Field>
        <div className="flex items-center justify-between gap-4 p-6 mt-3 mb-6">
          <Field orientation="horizontal" className="w-fit">
            <FieldLabel htmlFor="select-rows-per-page">
              Nombre de commentaires par page
            </FieldLabel>
            <Select
              defaultValue={table.getState().pagination.pageSize}
              onValueChange={(e) => {
                table.setPageSize(Number(e));
              }}
            >
              <SelectTrigger className="w-20" id="select-rows-per-page">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="start">
                <SelectGroup>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Pagination className="mx-0 w-auto">
            <PaginationContent>
              {table.getCanPreviousPage() && (
                <PaginationItem>
                  <PaginationPrevious onClick={() => table.previousPage()} />
                </PaginationItem>
              )}
              {table.getCanNextPage() && (
                <PaginationItem>
                  <PaginationNext onClick={() => table.nextPage()} />
                </PaginationItem>
              )}
            </PaginationContent>
          </Pagination>
        </div>
      </form>
      <Dialog
        open={screenshotDialogOpen}
        onOpenChange={setScreenshotDialogOpen}
      >
        <DialogContent className="max-w-fit">
          <DialogHeader>
            <DialogTitle>Capture du commentaire</DialogTitle>
          </DialogHeader>
          {selectedScreenshot ? (
            <img
              src={buildDataUrl(selectedScreenshot, PNG_MIME_TYPE)}
              alt="Capture du commentaire"
              className="max-h-[75vh]"
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

const addOrRemoveValueToSet = (currentSet: Set<string>, id: string) => {
  const next = new Set(currentSet);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  return next;
};

// Attention, Le texte ne correspond pas forcément à un ordre croissant ou décroissant au sens mathématique,
// mais plutôt à une logique métier (ex: "de nouveau à ancien" est considéré comme descendant même si du point
// de vue mathématique c'est un ordre croissant)
function getSortingLabel(sortingCategory: CommentSortingCategory): string {
  switch (sortingCategory) {
    case CommentSortingCategory.SCORE_ASC:
      return "Score juridique : d'élevé à faible";
    case CommentSortingCategory.SCORE_DESC:
      return "Score juridique : de faible à élevé";
    case CommentSortingCategory.COMMENT_DATE_DESC:
      return "Date commentaire : de nouveau à ancien";
    case CommentSortingCategory.COMMENT_DATE_ASC:
      return "Date commentaire : d’ancien à nouveau";
    case CommentSortingCategory.PSEUDO_AUTHOR_ASC:
      return "Pseudo auteur : de A à Z";
    case CommentSortingCategory.PSEUDO_AUTHOR_DESC:
      return "Pseudo auteur : de Z à A";
  }
}
