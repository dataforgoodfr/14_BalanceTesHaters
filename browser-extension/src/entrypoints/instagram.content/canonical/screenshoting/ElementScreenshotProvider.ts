/**
 * Interface abstracting away the capture of Element screenshots
 */
export interface ElementScreenshotProvider {
  captureElementScreenshotAsPngBase64(element: HTMLElement): Promise<string>;
}
