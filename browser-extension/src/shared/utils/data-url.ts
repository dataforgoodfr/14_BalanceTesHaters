export const PNG_MIME_TYPE = "image/png";
export function buildDataUrl(base64Data: string, mimeType: string): string {
  return "data:" + mimeType + ";base64," + base64Data;
}

export function extractBase64DataFromDataUrl(dataUrl: string): string {
  if (!dataUrl.startsWith("data:")) {
    throw new Error("invalid data URL");
  }

  return dataUrl.substring(dataUrl.indexOf(",") + 1);
}
