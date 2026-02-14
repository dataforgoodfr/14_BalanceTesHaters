import * as z from "zod";
import { apiBaseUrl } from "./baseUrl";

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

export class CreateClassificationError extends Error {
  constructor(
    public readonly responseStatus: number,
    public readonly responseText: string,
  ) {
    super(
      "CreateClassification failed with status " +
        responseStatus +
        " and text\n" +
        responseText,
    );
  }
}

export async function requestClassification(
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
    throw new CreateClassificationError(response.status, await response.text());
  }
}
