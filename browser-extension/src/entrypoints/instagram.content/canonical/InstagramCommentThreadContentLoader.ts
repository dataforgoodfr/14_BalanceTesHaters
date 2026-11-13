import type { ScrapingSupport } from "@/shared/scraping/ScrapingSupport";
import { createLogger, scrapingLogger } from "@/shared/utils/createLogger";
import type { InstagramCommentThreadBatch } from "./InstagramCommentThreadBatch";
import { VIEW_REPLIES_BUTTON_TEXT_REGEX } from "./instagramElementsTexts";

const logger = createLogger("ig-thread-content-loader", scrapingLogger);

export class InstagramCommentThreadContentLoader {
  constructor(private readonly scrapingSupport: ScrapingSupport) {}

  async loadReplies(batch: InstagramCommentThreadBatch): Promise<void> {
    let buttons = this.selectViewRepliesButtons(batch);
    while (buttons.length > 0) {
      logger.debug(`Expanding ${buttons.length} reply groups`);
      for (const button of buttons) {
        await this.scrapingSupport.click(button);
      }
      await this.scrapingSupport.sleep(500);
      buttons = this.selectViewRepliesButtons(batch);
    }
  }

  private selectViewRepliesButtons(
    batch: InstagramCommentThreadBatch,
  ): HTMLElement[] {
    return batch.threadElements.flatMap((threadElement) =>
      this.scrapingSupport.selectAll(
        threadElement,
        "[role='button']",
        HTMLElement,
        {
          predicate: (button) =>
            VIEW_REPLIES_BUTTON_TEXT_REGEX.test(button.innerText),
        },
      ),
    );
  }
}
