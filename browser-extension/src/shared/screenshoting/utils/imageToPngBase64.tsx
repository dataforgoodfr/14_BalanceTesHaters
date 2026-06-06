import { uint8ArrayToBase64 } from "@/shared/utils/base-64";
import { Image, encodePng } from "image-js";

export function imageToPngBase64(image: Image): string {
  return uint8ArrayToBase64(encodePng(image));
}
