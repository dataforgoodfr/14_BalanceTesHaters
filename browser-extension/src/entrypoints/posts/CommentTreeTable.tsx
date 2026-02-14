import { useState, useMemo } from "react";
import type { ColumnDef, ExpandedState } from "@tanstack/react-table";
import {
  useReactTable,
  getCoreRowModel,
  getExpandedRowModel,
  flexRender,
  Row,
} from "@tanstack/react-table";
import { Comment } from "@/shared/model/post";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ChevronRight,
  ChevronDown,
  Eye,
  EyeOff,
  MessageCircleMoreIcon,
} from "lucide-react";
import { buildDataUrl, PNG_MIME_TYPE } from "@/shared/utils/data-url";
import { Badge } from "@/components/ui/badge";

interface CommentTreeTableProps {
  comments: Comment[];
}

export function CommentTreeTable({ comments }: CommentTreeTableProps) {
  const [expandedState, setExpandedState] = useState<ExpandedState>({});
  const [showScreenshot, setShowScreenshot] = useState(false);
  const [contentDialogOpen, setContentDialogOpen] = useState(false);
  const [screenshotDialogOpen, setScreenshotDialogOpen] = useState(false);
  const [selectedContent, setSelectedContent] = useState<{
    title: string;
    content: string;
  } | null>(null);
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(
    null,
  );

  const openContentDialog = (title: string, content: string) => {
    setSelectedContent({ title, content });
    setContentDialogOpen(true);
  };

  const openScreenshotDialog = (screenshot: string) => {
    setSelectedScreenshot(screenshot);
    setScreenshotDialogOpen(true);
  };

  const expandAll = () => {
    const newExpandedState: Record<string, boolean> = {};
    const traverse = (rows: Comment[], depth = 0) => {
      rows.forEach((comment, index) => {
        const id = `${depth}-${index}`;
        if (comment.replies && comment.replies.length > 0) {
          newExpandedState[id] = true;
          traverse(comment.replies, depth + 1);
        }
      });
    };
    traverse(comments);
    setExpandedState(newExpandedState);
  };

  const collapseAll = () => {
    setExpandedState({});
  };

  const getRowId = (_: Comment, index: number, parent?: Row<Comment>) => {
    return parent ? `${parent.id}-${index}` : `${index}`;
  };

  const columns = useMemo<ColumnDef<Comment>[]>(
    () => [
      {
        accessorKey: "author",
        header: () => <span className="pl-4 ">Auteur</span>,
        size: 90,
        cell: ({ row }) => {
          const author = row.original.author;
          return (
            <div
              style={{
                paddingLeft: `${row.depth * 16}px`,
              }}
              className="align-top h-full text-left"
            >
              <div>
                {!row.getCanExpand() ? (
                  <span className="pl-4" />
                ) : row.getIsExpanded() ? (
                  <ChevronDown
                    className="h-4 w-4 cursor-pointer inline-block"
                    onClick={row.getToggleExpandedHandler()}
                  />
                ) : (
                  <ChevronRight
                    className="h-4 w-4 cursor-pointer inline-block"
                    onClick={row.getToggleExpandedHandler()}
                  />
                )}
                <a
                  href={author.accountHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium"
                >
                  {author.name}
                </a>
              </div>
              <div>
                <span className="pl-4" />
                {row.original.publishedAt && (
                  <span className="text-muted-foreground">
                    ({row.original.publishedAt})
                  </span>
                )}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "textContent",
        header: "Texte",
        cell: ({ row }) => {
          const content = row.original.textContent || "";
          const previewLength = 300;
          const isLong = content.length > previewLength;
          const preview = isLong
            ? content.slice(0, previewLength) + "…"
            : content;

          return (
            <div className="flex text-left whitespace-pre-wrap">
              <p className="flex-grow">{preview}</p>
              {isLong && (
                <Button
                  onClick={() =>
                    openContentDialog(
                      `Comment by ${row.original.author.name}`,
                      content,
                    )
                  }
                  variant="outline"
                  size="icon-sm"
                >
                  <MessageCircleMoreIcon />
                </Button>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "classification",
        header: "Classification",
        cell: ({ row }) => {
          if (row.original.classifiedAt) {
            return (row.original.classification || []).map(
              (category, index) => <Badge key={index}>{category}</Badge>,
            );
          } else {
            return "Non ";
          }
        },
      },
      {
        id: "screenshot",
        header: "Capture d'écran",
        size: 300,
        cell: ({ row }) => {
          if (!row.original.screenshotData) {
            return <span className="text-muted-foreground">N/A</span>;
          }
          return (
            <img
              src={buildDataUrl(row.original.screenshotData, PNG_MIME_TYPE)}
              alt="Screenshot"
              className="cursor-pointer h-full max-h-full!"
              onClick={() => openScreenshotDialog(row.original.screenshotData)}
            />
          );
        },
      },
      {
        accessorKey: "scrapedAt",
        header: "Date capture",
        size: 90,
        cell: ({ row }) => {
          return (
            <time dateTime={row.original.scrapedAt}>
              {new Date(row.original.scrapedAt).toLocaleDateString()}
            </time>
          );
        },
      },
    ],
    [showScreenshot],
  );

  const table = useReactTable({
    data: comments,
    columns: columns.filter((c) => c.id !== "screenshot" || showScreenshot),
    getRowId,
    getSubRows: (row) => row.replies,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    onExpandedChange: setExpandedState,
    state: {
      expanded: expandedState,
    },
  });

  return (
    <div className="space-y-4">
      {/* Global Actions Toolbar */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={expandAll}>
          Tout déplier
        </Button>
        <Button variant="outline" size="sm" onClick={collapseAll}>
          Tout replier
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowScreenshot(!showScreenshot)}
        >
          {showScreenshot ? (
            <>
              <EyeOff className="h-4 w-4 mr-1" />
              Cacher les captures d&apos;écrans
            </>
          ) : (
            <>
              <Eye className="h-4 w-4 mr-1" />
              Afficher les captures d&apos;écrans
            </>
          )}
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
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
                  <TableCell key={cell.id} className="align-top">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Content Dialog */}
      <Dialog open={contentDialogOpen} onOpenChange={setContentDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedContent?.title || ""}</DialogTitle>
          </DialogHeader>
          {selectedContent && (
            <div className="whitespace-pre-wrap">{selectedContent.content}</div>
          )}
        </DialogContent>
      </Dialog>

      {/* Screenshot Dialog */}
      <Dialog
        open={screenshotDialogOpen}
        onOpenChange={setScreenshotDialogOpen}
      >
        <DialogContent className="max-w-fit!">
          <DialogHeader>
            <DialogTitle>Screenshot</DialogTitle>
          </DialogHeader>
          {selectedScreenshot && (
            <img
              src={buildDataUrl(selectedScreenshot, PNG_MIME_TYPE)}
              alt="Screenshot"
              className="max-w-fit max-h-fit"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
