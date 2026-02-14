import z from "zod";
import { apiBaseUrl } from "./baseUrl";
import { ClassificationApiError } from "./ClassificationApiError";

export const ClassificationResultStatus = z.enum([
  "SUBMITTED",
  "IN_PROGRESS",
  "COMPLETED",
  "FAILED",
]);
export type ClassificationResultStatus = z.output<
  typeof ClassificationResultStatus
>;

export const CommentClassificationResult = z.object({
  classification: z.array(z.string()),
  classified_at: z.iso.datetime(),
});

export type CommentClassificationResult = z.output<
  typeof CommentClassificationResult
>;
export const ClassificationResult = z.object({
  id: z.string().nonempty(),
  status: ClassificationResultStatus,
  comments: z.record(z.uuid(), CommentClassificationResult).nullable(),
});
export type ClassificationResult = z.output<typeof ClassificationResult>;

export type ClassificationResultPayload = z.input<typeof ClassificationResult>;

export async function getClassificationResult(
  jobId: string,
): Promise<ClassificationResult> {
  const endPoint = apiBaseUrl + "/classification/" + jobId;
  const response = await fetch(endPoint, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (response.ok) {
    const data = await response.json();
    return ClassificationResult.parse(data);
  } else {
    throw new ClassificationApiError(response.status, await response.text());
  }
}
