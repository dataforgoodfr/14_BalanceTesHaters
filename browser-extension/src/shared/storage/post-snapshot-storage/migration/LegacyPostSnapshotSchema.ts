import z from "zod";
import { ClassificationStatusSchema } from "../../../model/ClassificationStatus";
import { CommentSharedPropertiesSchema } from "../../../model/CommentSharedPropertiesSchema";
import { PostSharedPropertiesSchema } from "../../../model/PostSharedProperties";

const NonRecursiveLegacyCommentSnapshotSchema =
  CommentSharedPropertiesSchema.extend({
    id: z.uuid(),
    commentId: z.string(),
    screenshotData: z.base64(),
    scrapedAt: z.iso.datetime(),
    nbLikes: z.int(),
  });

export const LegacyCommentSnapshotSchema =
  NonRecursiveLegacyCommentSnapshotSchema.extend({
    get replies() {
      return LegacyCommentSnapshotSchema.array();
    },
  });

export const LegacyPostSnapshotSchema = PostSharedPropertiesSchema.extend({
  id: z.uuid(),
  scrapedAt: z.iso.datetime(),
  comments: LegacyCommentSnapshotSchema.array(),
  classificationJobId: z.string().optional(),
  classificationStatus: ClassificationStatusSchema.optional(),
});
export type LegacyCommentSnapshot = z.infer<typeof LegacyCommentSnapshotSchema>;
export type LegacyPostSnapshot = z.infer<typeof LegacyPostSnapshotSchema>;
