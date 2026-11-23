import { AI_SCORE_HATE_THRESHOLD } from "@/shared/constants/ai-score-hate-threshold";
import type { PostCommentWithFlag } from "@/shared/model/post/Post";

const isAiSuspected = (comment: PostCommentWithFlag) =>
  comment.hateScore !== undefined &&
  comment.hateScore > AI_SCORE_HATE_THRESHOLD;
const isUserFlagged = (comment: PostCommentWithFlag) => comment.isFlagged;

export const COMMENT_STATISTICS_TABS = [
  {
    value: "ai",
    label: "commentaires suspectés par l'IA",
    isHateful: isAiSuspected,
  },
  {
    value: "users",
    label: "commentaires marqués manuellement",
    isHateful: isUserFlagged,
  },
];
