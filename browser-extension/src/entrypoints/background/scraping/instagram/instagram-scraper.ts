import {
  ElementHandle,
  Page,
} from "puppeteer-core/lib/esm/puppeteer/puppeteer-core-browser.js";
import { PuppeteerBaseScraper } from "../puppeteer/puppeteer-base-scraper";
import {
  type Author,
  type Post,
  type Comment,
} from "../../../../shared/model/post";
import { parseSocialNetworkUrl } from "@/shared/social-network-url";
import { currentIsoDate } from "../../../../shared/utils/current-iso-date";
import { PublicationDateTextParsing } from "@/shared/utils/date-text-parsing";

//TODO: gérer le scroll et le chargement des commentaires
//TODO: gérer le scraping des réponses aux commentaires
export class InstagramScraper extends PuppeteerBaseScraper {
  private INSTAGRAM_URL = "https://www.instagram.com/";

  extractPostId(url: string): string {
    const parsed = parseSocialNetworkUrl(url);
    if (!parsed) {
      throw new Error("Unexpected");
    }
    return parsed.postId;
  }

  async doScrapTab(tab: Browser.tabs.Tab, page: Page): Promise<Post> {
    // //main/div/div/div
    const cadre_publication = (await page.$("::-p-xpath(//main/div/div/div)"))!;
    const colonne_commentaires = (await cadre_publication.$(
      "::-p-xpath(./div[2]/div)",
    ))!;

    // //main/div/div/div/./div[2]/div/./div[2]
    const zone_defilable = (await colonne_commentaires.$(
      "::-p-xpath(./div[2])",
    ))!;

    // //main/div/div/div/./div[2]/div/./div[2]/./div/div[1]/div/div[2]/div/span
    const publication = (await zone_defilable.$(
      "::-p-xpath(./div/div[1]/div/div[2]/div/span)",
    ))!;

    // //main/div/div/div/./div[2]/div/./div[2]/./div/div[1]/div/div[2]/div/span/./div/div
    const entete_publication = (await publication.$("::-p-xpath(./div/div)"))!;

    // //main/div/div/div/./div[2]/div/./div[2]/./div/div[1]/div/div[2]/div/span/./span[1]
    const auteur = await this.get_auteur_from_span(
      (await entete_publication.$("::-p-xpath(./span[1])"))!,
    );

    // //main/div/div/div/./div[2]/div/./div[2]/./div/div[1]/div/div[2]/div/span/./div/div/.//time
    const date_publication = (await entete_publication.$eval(
      "::-p-xpath(.//time)",
      (node) => node.getAttribute("datetime"),
    ))!;

    // //main/div/div/div/./div[2]/div/./div[2]/./div/div[1]/div/div[2]/div/span/./div/span
    const texte_publication = (await publication.$eval(
      "::-p-xpath(./div/span)",
      (node) => node.textContent,
    ))!;

    // //main/div/div/div/./div[2]/div/./div[2]/./div/div[3]
    const liste_commentaires = (await zone_defilable.$(
      "::-p-xpath(./div/div[3])",
    ))!;
    //const commentaires = (await liste_commentaires.$$("::-p-xpath(./div)")).map(e => this.extract_commentaire(e))!;
    const commentaires: Comment[] = [];
    let div_commentaire = await liste_commentaires.$("::-p-xpath(./div)");
    while (div_commentaire) {
      await div_commentaire.scrollIntoView();
      commentaires.push(await this.extract_commentaire(div_commentaire));
      await this.sleep(500);
      // gérer un peu mieux le scroll et le temps de chargement des pages de
      // commentaires
      div_commentaire = await div_commentaire.$(
        "::-p-xpath(./following-sibling::*)",
      );
      // gérer ici le ce scraping des réponses aux commentaires
    }

    return {
      postId: this.extractPostId(tab.url!),
      socialNetwork: "INSTAGRAM",
      url: tab.url!,
      author: auteur,
      scrapedAt: new Date().toISOString(),
      publishedAt: new PublicationDateTextParsing(date_publication).parse(),
      textContent: texte_publication,
      comments: await Promise.all(commentaires),
    };
  }

  private async get_auteur_from_span(
    span_element: ElementHandle<Element>,
  ): Promise<Author> {
    const auteur_elem = (await span_element.$("::-p-xpath(.//a)"))!;
    const auteur_href = (await auteur_elem.$eval("::-p-xpath(.)", (node) =>
      node.getAttribute("href"),
    ))!;
    const auteur_name = (await auteur_elem.$eval(
      "::-p-xpath(.//span)",
      (node) => node.textContent,
    ))!;
    return {
      name: auteur_name,
      accountHref: this.urlJoin(this.INSTAGRAM_URL, auteur_href),
    };
  }

  private async extract_commentaire(
    comment_element: ElementHandle<Element>,
  ): Promise<Comment> {
    let base = (await comment_element.$(
      "::-p-xpath(./div/div/div[2]/div/div)",
    ))!;
    base = (await base.$("::-p-xpath(.//span[1]/../..)"))!;
    const base_0 = (await base.$("::-p-xpath(div[1])"))!;
    const base_1 = (await base.$("::-p-xpath(div[2])"))!;
    const auteur = await this.get_auteur_from_span(base_0);
    const publicationDateText =
      (await base.$eval("::-p-xpath(.//time)", (node) =>
        node.getAttribute("datetime"),
      )) ?? "";

    const screenshot = await comment_element.screenshot({ encoding: "base64" });
    const screenshotDate = currentIsoDate();
    return {
      author: auteur,
      textContent: await base_1.$eval(
        "::-p-xpath(.)",
        (node) => node.textContent!,
      )!,
      publishedAt: new PublicationDateTextParsing(publicationDateText).parse(),
      screenshotData: screenshot,
      scrapedAt: screenshotDate,
      replies: [],
      nbLikes: 0, // Voir https://github.com/dataforgoodfr/14_BalanceTesHaters/issues/4
    };
  }

  private urlJoin(base: string, relative: string): string {
    const baseWithoutTrailingSlash = base.replace(/\/+$/, "");
    if (relative.startsWith("/")) {
      return baseWithoutTrailingSlash + relative;
    } else {
      return baseWithoutTrailingSlash + "/" + relative;
    }
  }
}
