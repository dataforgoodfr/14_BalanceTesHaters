import { useMemo } from "react";
import {
  useReactTable,
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

export default function CommentsTable({
  comments,
}: Readonly<{
  comments: PostComment[];
}>) {
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
          <div className="text-wrap">{row.original.textContent}</div>
        ),
      },
      {
        id: "vue",
        size: 5,
        header: () => (
          <div className="flex gap-2">
            Vue <EyeClosed />
          </div>
        ),
        cell: () => <EyeClosed />,
      },
      {
        accessorKey: "classification",
        header: "Catégorie",
        size: 13,
        cell: ({ row }) => (
          <div className="">
            {row.original.classification?.map((category) => {
              return (
                <>
                  <div
                    key={category}
                    className="bg-gray-200 rounded-full px-2 py-1 my-2 overflow-hidden text-ellipsis"
                  >
                    {category}
                  </div>
                </>
              );
            })}
          </div>
        ),
      },
      {
        id: "gravite",
        header: "Gravité",
        size: 8,
        cell: () => "-",
      },
      {
        id: "propos",
        header: "Propos",
        size: 8,
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
    [],
  );

  const table = useReactTable({
    data: comments,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="rounded-md border mt-2">
      <div className="p-3 flex justify-between">
        <InputGroup className="mx-4 w-1/3">
          <InputGroupInput id="input-group-url" placeholder="Rechercher" />
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
    </div>
  );
}
