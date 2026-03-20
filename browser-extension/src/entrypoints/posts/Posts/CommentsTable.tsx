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
  ArrowDownUp,
  Eye,
  EyeClosed,
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

/**
 * Merged view of Post Snapshot
 */
export type PostCommentWithId = PostComment & {
  id: string;
};

export default function CommentsTable({
  comments,
  defaultCommentIdList,
  onSubmit,
  formId,
}: Readonly<{
  comments: PostComment[];
  defaultCommentIdList: string[];
  onSubmit: (commentIdList: string[]) => void;
  formId: string;
}>) {
  const [inputValue, setInputValue] = React.useState("");
  const [searchTerm, setSearchTerm] = React.useState("");
  const [visibleComments, setVisibleComments] = React.useState<Set<string>>(
    new Set(),
  );
  const [selectedComments, setSelectedComments] = React.useState<
    PostCommentWithId[]
  >([]);

  // On définit arbitrairement un id pour être en mesure de sélectionner les commentaires
  const commentsWithId: PostCommentWithId[] = comments.map((comment, i) => {
    return { ...comment, id: i.toString() };
  });

  // Permet de suivre les commentaires actuellement affichés (non floutés)
  //  dans le tableau, en stockant leurs IDs dans un Set
  const toggleCommentVisibility = (id: string) => {
    setVisibleComments((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleCommentSelection = (postComment: PostCommentWithId) => {
    console.log(postComment);
    setSelectedComments((currentSelection) => {
      const index = currentSelection.findIndex(
        (comment) => comment.id == postComment.id,
      );
      if (index > -1) {
        currentSelection.splice(index, 1);
      } else {
        currentSelection.push(postComment);
      }
      return currentSelection;
    });
  };

  const filteredComments = React.useMemo(
    () =>
      commentsWithId.filter(
        (comment) =>
          comment.textContent
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          comment.author.name.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    [commentsWithId, searchTerm],
  );

  // On utilise une valeur intermédiaire pour le champ de recherche afin de ne pas lancer le filtrage
  // à chaque frappe de l'utilisateur, mais seulement après un court délai d'inactivité (500ms ici)
  // Les performances n'étaient pas top avec le filtrage à chaque frappe
  React.useEffect(() => {
    const timer = setTimeout(() => setSearchTerm(inputValue), 500);
    return () => clearTimeout(timer);
  }, [inputValue]);

  const form = useForm({
    defaultValues: {
      commentIdList: defaultCommentIdList,
    },
    onSubmit: () => {
      onSubmit(form.state.values.commentIdList);
    },
  });

  // La taille de chaque colonne est convertie ensuite en pourcentage. Attention, la somme doit faire 100%.
  const columns = useMemo<ColumnDef<PostCommentWithId>[]>(
    () => [
      {
        id: "selection",
        size: 5,
        header: () => (
          <Checkbox
            className="ms-3 me-5"
            onClick={() => setAllCommentsSelection()}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            onClick={() =>
              toggleCommentSelection({ ...row.original, id: row.id })
            }
            checked={selectedComments.some((x) => x.id == row.id)}
            className="ms-3 me-5"
          />
        ),
      },
      {
        accessorKey: "author.name",
        header: "Auteur",
        size: 15,
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
        size: 35,
        cell: ({ row }) => (
          <div
            className={`${visibleComments.has(row.id) ? "text-wrap" : "blur-sm overflow-hidden"}`}
          >
            {row.original.textContent}
          </div>
        ),
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
                <EyeClosed />
              )}
            </Button>
          </div>
        ),
        cell: ({ row }) => (
          <Button
            variant="ghost"
            onClick={() => toggleCommentVisibility(row.id)}
          >
            {visibleComments.has(row.id) ? <Eye /> : <EyeClosed />}
          </Button>
        ),
      },
      {
        accessorKey: "classification",
        header: "Catégorie",
        size: 13,
        cell: ({ row }) => (
          <div className="">
            {[...new Set(row.original.classification ?? [])].map(
              (category: string) => {
                return (
                  <div
                    key={category}
                    className="bg-gray-200 rounded-full px-2 py-1 my-2 overflow-hidden text-ellipsis"
                    title={category}
                  >
                    {category}
                  </div>
                );
              },
            )}
          </div>
        ),
      },
      // {
      //   // TODO : A remplacer ou à supprimer en fonction de la disponibilité des données
      //   id: "gravite",
      //   header: "Gravité",
      //   size: 7,
      //   cell: () => "-",
      // },
      // {
      //   // TODO : A remplacer ou à supprimer en fonction de la disponibilité des données
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
    [visibleComments, selectedComments],
  );

  const table = useReactTable({
    data: filteredComments,
    columns,
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
      // Génération des identifiants pour tous les rows
      const allVisibleRowIds = new Set(
        filteredComments.map((comment) => comment.id),
      );
      setVisibleComments(allVisibleRowIds);
    }
  };

  const setAllCommentsSelection = () => {
    if (selectedComments.length === filteredComments.length) {
      setSelectedComments([]);
    } else {
      setSelectedComments(filteredComments);
    }
  };

  return (
    <form
      id={formId}
      className="rounded-md border mt-2"
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
    >
      <div className="p-3 flex justify-between">
        <InputGroup className="mx-4 w-1/3">
          <InputGroupInput
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            placeholder="Rechercher"
          />
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
        </InputGroup>
        <div className="flex gap-4">
          <Button variant="outline" disabled>
            Tout sélectionner
          </Button>
          <Button variant="outline" disabled>
            Filtrer <Funnel />
          </Button>
          <Button variant="outline" disabled>
            Trier <ArrowDownUp />
          </Button>{" "}
        </div>
      </div>
      <Table className="w-full table-fixed">
        <TableHeader className="bg-gray-200">
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
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
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
  );
}
