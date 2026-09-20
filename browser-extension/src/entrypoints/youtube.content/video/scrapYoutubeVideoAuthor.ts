import type { Author } from "@/shared/model/Author";
import type { ScrapingSupport } from "@/shared/scraping/ScrapingSupport";

export async function scrapYoutubeVideoAuthor(
  scrapingSupport: ScrapingSupport,
): Promise<Author> {
  const ownerElement = await scrapingSupport.waitForSelectorOrThrow(
    document,
    "#owner",
    HTMLElement,
  );
  const channelNameElement = scrapingSupport.select(
    ownerElement,
    "#channel-name",
    HTMLElement,
  );

  if (channelNameElement && scrapingSupport.isVisible(channelNameElement)) {
    return authorFromLink(scrapingSupport, channelNameElement);
  }

  const attributedChannelNameElement = scrapingSupport.select(
    ownerElement,
    "#attributed-channel-name",
    HTMLElement,
  );
  if (
    !attributedChannelNameElement ||
    !scrapingSupport.isVisible(attributedChannelNameElement)
  ) {
    throw new Error("Failed to scrap post author");
  }

  const attributedChannelLink = scrapingSupport.selectOrThrow(
    attributedChannelNameElement,
    "a",
    HTMLAnchorElement,
  );
  if (attributedChannelLink.href) {
    return {
      name: attributedChannelNameElement.innerText,
      accountHref: attributedChannelLink.href,
    };
  }

  await scrapingSupport.click(attributedChannelLink);
  const primaryCollaboratorLink = await scrapingSupport.waitForSelectorOrThrow(
    document,
    "ytd-popup-container [role='listitem'] a[href]",
    HTMLAnchorElement,
    {
      predicate: (element) => scrapingSupport.isVisible(element),
      selectedElementDescriptor: "primary collaborator link",
    },
  );

  return {
    name: primaryCollaboratorLink.innerText.trim(),
    accountHref: primaryCollaboratorLink.href,
  };
}

function authorFromLink(
  scrapingSupport: ScrapingSupport,
  channelNameElement: HTMLElement,
): Author {
  const link = scrapingSupport.selectOrThrow(
    channelNameElement,
    "a",
    HTMLAnchorElement,
  );
  return {
    name: channelNameElement.innerText,
    accountHref: link.href,
  };
}
