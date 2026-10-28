import type { Box } from "../box/Box";

export class UnstableElementBoxError extends Error {
  constructor(
    private readonly htmlElement: HTMLElement,
    private readonly beforeBox: Box,
    private readonly afterBox: Box,
  ) {
    super(
      "Element box is unstabled box beforeBox:" +
        JSON.stringify(beforeBox) +
        " afterBox:" +
        JSON.stringify(afterBox),
    );
  }
}
