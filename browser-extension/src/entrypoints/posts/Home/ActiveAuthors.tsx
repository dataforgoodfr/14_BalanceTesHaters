import { Card, CardContent, CardHeader } from "@/components/ui/card";
import WorkInProgress from "../WorkInProgress";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { CircleUserRound } from "lucide-react";
import { PostSnapshot } from "@/shared/model/PostSnapshot";
import { Spinner } from "@/components/ui/spinner";
import {
  getAllCommentsAndRepliesFromPostList,
  isCommentHateful,
} from "@/shared/utils/post-util";
import { getPercentage } from "@/shared/utils/maths";

type AuthorStats = {
  name: string;
  numberOfComments: number;
  numberOfHatefulComments: number;
};

type ActiveAuthorsProps = {
  posts: PostSnapshot[] | undefined;
  isLoading: boolean;
};

function ActiveAuthors({ posts, isLoading }: Readonly<ActiveAuthorsProps>) {
  const allComments = getAllCommentsAndRepliesFromPostList(posts ?? []);

  const authorStatsList = allComments
    .reduce((authorStatsList: AuthorStats[], currentComment) => {
      const existingAuthorIndex = authorStatsList.findIndex(
        (author) => author.name === currentComment.author.name,
      );

      // Si l'auteur n'est pas encore dans la liste des posts les plus récents, on l'ajoute
      if (existingAuthorIndex === -1) {
        authorStatsList.push({
          name: currentComment.author.name,
          numberOfComments: 1,
          numberOfHatefulComments: isCommentHateful(currentComment) ? 1 : 0,
        });
      } else {
        // Si l'auteur est déjà dans la liste, on incrémente le nombre de commentaires
        authorStatsList[existingAuthorIndex].numberOfComments += 1;
        if (isCommentHateful(currentComment)) {
          authorStatsList[existingAuthorIndex].numberOfHatefulComments += 1;
        }
      }
      return authorStatsList;
    }, [])
    .filter((authorStats) => authorStats.numberOfHatefulComments >= 1) // ne garder que les auteurs avec au moins 1 commentaire haineux;
    .sort(
      // trier par ratio de commentaires haineux décroissant
      (a, b) =>
        getPercentage(b.numberOfHatefulComments, b.numberOfComments) -
        getPercentage(a.numberOfHatefulComments, a.numberOfComments),
    )
    .slice(0, 6); // Récupérer les 6 auteurs les plus actifs parmi ceux ayant posté au moins un commentaire haineux (en attendant une éventuelle pagination)

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
                    {authorStats.numberOfComments} commentaires
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
