import { buildDataUrl, PNG_MIME_TYPE } from "@/shared/utils/data-url";
import type { Image } from "image-js";
import { imageToPngBase64 } from "./imageToPngBase64";

export function imageToDataUrl(image: Image): string {
  return buildDataUrl(imageToPngBase64(image), PNG_MIME_TYPE);
}
