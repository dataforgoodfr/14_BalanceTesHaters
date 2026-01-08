import { ElementHandle } from "puppeteer-core/lib/esm/puppeteer/puppeteer-core-browser.js";
import { innerHtml } from "./innerHtml";

export async function selectOrThrow(
  container: ElementHandle,
  selector: string
): Promise<ElementHandle> {
  const selectedElement = await container.$(selector)!;

  if (selectedElement !== null) {
    selectedElement.toElement;
    return selectedElement;
  }
  const parentInnerHtml = await innerHtml(container);
  console.error("Failed to select element", {
    parentInnerHtml: parentInnerHtml,
    selector: selector,
  });
  throw new Error("Failed to select element");
}
