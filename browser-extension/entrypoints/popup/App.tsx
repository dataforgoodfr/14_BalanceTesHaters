import { useState } from "react";
import "./App.css";
import { getCurrentTab } from "../shared/getCurrentTab";
import { PublicPath } from "wxt/browser";

type SocialNetworkName = "youtube" | "instagram";
type ScrapableType = "post" | "account";

interface Scrapable {
  type: ScrapableType;
  socialNetwork: SocialNetworkName;
}

function computeScrapable(url: string): Scrapable | false {
  if (url.startsWith("https://www.youtube.com/watch?")) {
    return {
      type: "post",
      socialNetwork: "youtube",
    };
  }
  if (url.startsWith("https://www.instagram.com/p/")) {
    return {
      type: "post",
      socialNetwork: "instagram",
    };
  }
  return false;
}

const sendScrapMessage = () => {
  browser.runtime.sendMessage({ messageType: "start-scraping" });
};

const reportPageUrl = browser.runtime.getURL("/report-page.html");

function App() {
  const [currentTab, setCurrentTab] = useState<Browser.tabs.Tab | undefined>(
    undefined
  );
  useEffect(() => {
    getCurrentTab().then((tab) => {
      setCurrentTab(tab);
    });
  });

  const scrapable =
    currentTab?.url !== undefined && computeScrapable(currentTab.url);

  return (
    <>
      <h1>BTH app</h1>

      {!scrapable && (
        <div className="card">
          Pour capturé des commentaires et les analyser naviguez vers une
          publication d'un réseau social supporté (youtube, instagram...) puis
          ouvrez l'extension à nouveau.
        </div>
      )}
      {scrapable && (
        <div className="card">
          Vous êtes sur un {scrapable.type} {scrapable.socialNetwork}. Pour
          capturé les commentaires et les analyser cliqué sur le bouton. ⚠️ une
          fois le bouton cliqué l'extension va prendre le contrôle de la page
          pour effectuer la capture.
          <button onClick={() => sendScrapMessage()}>
            Capturer les commentaires
          </button>
        </div>
      )}

      <div className="card">
        <a href={reportPageUrl} target="bth-report-page">
          Résultats de captures précedents, analyzes et génération de rapport
        </a>
      </div>
    </>
  );
}

export default App;
