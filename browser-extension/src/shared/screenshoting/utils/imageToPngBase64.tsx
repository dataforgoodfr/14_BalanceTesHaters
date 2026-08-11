import { uint8ArrayToBase64 } from "@/shared/utils/base-64";
import type { Image } from "image-js";
import { encodePng } from "image-js";

export function imageToPngBase64(image: Image): string {
  return uint8ArrayToBase64(encodePng(image));
}
