import { getPercentage } from "@/shared/utils/maths";
import { PostComment } from "@/shared/model/post/Post";
import { isCommentHateful } from "@/shared/utils/post-util";

export type AuthorStats = {
  name: string;
  numberOfComments: number;
  numberOfHatefulComments: number;
};

const ACTIVE_AUTHORS_LIMIT = 6;

export const getNumberOfHatefulAuthors = (
  hatefulCommentList: readonly PostComment[],
) => new Set(hatefulCommentList.map((comment) => comment.author.name)).size;

export const getAuthorStatsList = (
  postComments: readonly PostComment[],
): AuthorStats[] => {
  const authorStatsList = postComments
    .reduce((authorStatsList: AuthorStats[], currentComment) => {
      const existingAuthorIndex = authorStatsList.findIndex(
        (author) => author.name === currentComment.author.name,
      );

      // Si l'auteur n'est pas encore dans la liste des commentaires les plus récents, on l'ajoute
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
    .slice(0, ACTIVE_AUTHORS_LIMIT); // Récupérer les 6 auteurs les plus actifs parmi ceux ayant posté au moins un commentaire haineux (en attendant une éventuelle pagination)

  return authorStatsList;
};
