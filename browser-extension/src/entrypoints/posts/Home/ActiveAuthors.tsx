import { Card, CardContent, CardHeader } from "@/components/ui/card";
import WorkInProgress from "../WorkInProgress";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { CircleUserRound } from "lucide-react";
import { PostSnapshot } from "@/shared/model/PostSnapshot";

type ActiveAuthorsProps = {
  posts: PostSnapshot[] | undefined;
  isLoading: boolean;
};

function ActiveAuthors({ posts, isLoading }: Readonly<ActiveAuthorsProps>) {
  // could calculate active authors from `posts`
  return (
    <Card className="w-full relative">
      <CardHeader>Auteurs actifs</CardHeader>
      <CardContent className="p-4">
        <WorkInProgress />
        <Table>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <CircleUserRound />
                </TableCell>
                <TableCell>Hater {i + 1}</TableCell>
                <TableCell>{(i + 1) * 10}%</TableCell>
                <TableCell>{i + 2} commentaires</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export default ActiveAuthors;
