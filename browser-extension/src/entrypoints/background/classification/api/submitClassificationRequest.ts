import z from "zod";
import { apiBaseUrl } from "./baseUrl";
import { ClassificationApiError } from "./ClassificationApiError";

export type ClassificationRequest = {
  title?: string;
  text_content?: string;
  author: ClassificationAuthor;
  comments: ClassificationComment[];
};

export type ClassificationComment = {
  id: string;
  text_content: string;
  author: ClassificationAuthor;
  replies: ClassificationComment[];
};

export type ClassificationAuthor = {
  name: string;
  account_href: string;
};

export const ClassificationResponse = z.object({
  job_id: z.string(),
});
export type ClassificationResponse = z.infer<typeof ClassificationResponse>;

export async function postClassificationRequest(
  classificationRequest: ClassificationRequest,
): Promise<ClassificationResponse> {
  const response = await fetch(apiBaseUrl + "/classification", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(classificationRequest),
  });

  if (response.ok) {
    const data = await response.json();
    return ClassificationResponse.parse(data);
  } else {
    throw new ClassificationApiError(response.status, await response.text());
  }
}
