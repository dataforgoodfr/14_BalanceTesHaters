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

export default function CommentsTable({
  comments,
}: Readonly<{
  comments: PostComment[];
}>) {
  const [inputValue, setInputValue] = React.useState("");
  const [searchTerm, setSearchTerm] = React.useState("");
  const [visibleComments, setVisibleComments] = React.useState<Set<string>>(
    new Set(),
  );

  const toggleCommentVisibility = (rowId: string) => {
    setVisibleComments((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }
      return next;
    });
  };

  const filteredComments = React.useMemo(
    () =>
      comments.filter(
        (comment) =>
          comment.textContent
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          comment.author.name.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    [comments, searchTerm],
  );

  // On utilise une valeur intermédiaire pour le champ de recherche afin de ne pas lancer le filtrage
  //  à chaque frappe de l'utilisateur, mais seulement après un court délai d'inactivité (500ms ici)
  React.useEffect(() => {
    const timer = setTimeout(() => setSearchTerm(inputValue), 500);
    return () => clearTimeout(timer);
  }, [inputValue]);

  const columns = useMemo<ColumnDef<PostComment>[]>(
    () => [
      {
        id: "selection",
        size: 5, // % de la largeur totale du tableau
        cell: () => <Checkbox className="ms-3 me-5" />,
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
      {
        id: "gravite",
        header: "Gravité",
        size: 7,
        cell: () => "-",
      },
      {
        id: "propos",
        header: "Propos",
        size: 7,
        cell: () => "-",
      },
      {
        accessorKey: "publishedAt",
        header: "Date",
        size: 11,
        cell: ({ row }) => (
          <DisplayPublicationDate date={row.original.publishedAt} />
        ),
      },
    ],
    [visibleComments],
  );

  const table = useReactTable({
    data: filteredComments,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageIndex: 0, //custom initial page index
        pageSize: 10, //custom default page size
      },
    },
  });

  const setAllCommentsVisibility = () => {
    if (visibleComments.size === filteredComments.length) {
      setVisibleComments(new Set());
    } else {
      // Generate row IDs for ALL filtered comments, not just paginated ones
      const allVisibleRowIds = new Set(
        filteredComments.map((_, i) => i.toString()),
      );
      setVisibleComments(allVisibleRowIds);
    }
  };

  return (
    <div className="rounded-md border mt-2">
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
    </div>
  );
}
