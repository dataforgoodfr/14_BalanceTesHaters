import type { Box } from "./Box";

export function computeContainingBox(boxes: Box[]): Box {
  const left = Math.floor(Math.min(...boxes.map((rect) => rect.x)));
  const right = Math.ceil(Math.max(...boxes.map((box) => box.x + box.width)));
  const top = Math.floor(Math.min(...boxes.map((box) => box.y)));
  const bottom = Math.ceil(Math.max(...boxes.map((box) => box.y + box.height)));
  return { x: left, y: top, width: right - left, height: bottom - top };
}
