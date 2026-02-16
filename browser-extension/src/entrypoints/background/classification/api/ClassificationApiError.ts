export class ClassificationApiError extends Error {
  constructor(
    public readonly responseStatus: number,
    public readonly responseText: string,
  ) {
    super(
      "API error: status:" + responseStatus + " and text:\n" + responseText,
    );
  }
}
