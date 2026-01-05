import { useState } from "react";
import "./App.css";
import { getCurrentTab } from "../shared/utils/getCurrentTab";
import { parseSocialNetworkUrl } from "../shared/social-network-url";

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

  const parsedUrl = useMemo(() => {
    return (
      currentTab?.url !== undefined && parseSocialNetworkUrl(currentTab.url)
    );
  }, [currentTab]);

  return (
    <>
      <h1>BTH app</h1>

      {!parsedUrl && (
        <div className="card">
          Pour capturé des commentaires et les analyser naviguez vers une
          publication d'un réseau social supporté (youtube, instagram...) puis
          ouvrez l'extension à nouveau.
        </div>
      )}
      {parsedUrl && (
        <div className="card">
          Vous êtes sur un {parsedUrl.type} {parsedUrl.socialNetwork}. Pour
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
