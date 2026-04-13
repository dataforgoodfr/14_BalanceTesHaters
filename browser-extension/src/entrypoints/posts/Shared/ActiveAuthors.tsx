import { Card, CardContent, CardHeader } from "@/components/ui/card";
import WorkInProgress from "../WorkInProgress";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { CircleUserRound } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { PostComment } from "@/shared/model/post/Post";
import { getAuthorStatsList } from "@/shared/utils/report-stats";
import { getPercentage } from "@/shared/utils/maths";

type ActiveAuthorsProps = {
  postComments: PostComment[];
  isLoading: boolean;
};

function ActiveAuthors({
  postComments,
  isLoading,
}: Readonly<ActiveAuthorsProps>) {
  const authorStatsList = getAuthorStatsList(postComments);

  return (
    <Card className="w-full relative">
      <CardHeader>Auteurs actifs</CardHeader>
      <CardContent className="p-4">
        <WorkInProgress />
        {isLoading && <Spinner className="size-8" />}
        {!isLoading && (
          <Table>
            <TableBody>
              {authorStatsList.map((authorStats) => (
                <TableRow key={authorStats.name}>
                  <TableCell>
                    <CircleUserRound />
                  </TableCell>
                  <TableCell>{authorStats.name}</TableCell>
                  <TableCell>
                    {getPercentage(
                      authorStats.numberOfHatefulComments,
                      authorStats.numberOfComments,
                    ).toFixed(2)}
                    %
                  </TableCell>
                  <TableCell>
                    {authorStats.numberOfComments} commentaire
                    {authorStats.numberOfComments > 1 ? "s" : ""}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export default ActiveAuthors;
