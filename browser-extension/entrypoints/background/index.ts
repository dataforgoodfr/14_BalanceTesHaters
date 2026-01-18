import { storePost } from "../shared/storage/posts-storage";
import { getCurrentTab } from "../shared/utils/getCurrentTab";
import { isScrapActiveTabMessage } from "./scraping/scrap-active-tab-message";
import { scrapTab as scrapPostFromTab } from "./scraping/scrap-tab";
import { screenshotSenderTab } from "../shared/native-screenshoting/background/screenshot-sender-tab";
import { isScreenshotSenderTab } from "../shared/native-screenshoting/message";
import { Post } from "../shared/model/post";

export default defineBackground(() => {
    console.log("Hello background!", { extensionId: browser.runtime.id });

    function handleMessages(
        message: unknown,
        sender: Browser.runtime.MessageSender,
        sendResponse: (response: unknown) => void,
    ) {
        console.debug("Background - Message received:", message, sender);

        if (isScrapActiveTabMessage(message)) {
            scrapActiveTab();
            return;
        } else if (isScreenshotSenderTab(message)) {
            screenshotSenderTab(sender).then((data) => {
                sendResponse(data);
            });
            return true;
        }
    }
    console.log("Background - registering listener");
    browser.runtime.onMessage.addListener(handleMessages);
});


async function postToBackend(post: Post) {
    console.debug("Background - Posting post to backend");
    await fetch("http://localhost:8000/ml/post", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(post)
    });
}


async function scrapActiveTab() {
    const tab = await getCurrentTab();

    if (tab) {
        console.debug("Background - Scraping post from active tab ", {
            tabId: tab.id,
            url: tab.url,
        });
        const socialNetworkPost = await scrapPostFromTab(tab);
        await postToBackend(socialNetworkPost);
        console.debug(
            "Background - storing post to local storage",
            socialNetworkPost,
        );
        await storePost(socialNetworkPost);
    }
}
