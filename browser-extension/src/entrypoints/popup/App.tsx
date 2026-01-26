import { useState } from "react";
import "./App.css";
import { getCurrentTab } from "../shared/utils/getCurrentTab";
import { parseSocialNetworkUrl } from "../shared/social-network-url";

const sendScrapMessage = () => {
  browser.runtime.sendMessage({ msgType: "scrap-active-tab" });
};

const reportPageUrl = browser.runtime.getURL("/report-page.html");

function App() {
  const [currentTab, setCurrentTab] = useState<Browser.tabs.Tab | undefined>(
    undefined,
  );
  useEffect(() => {
    getCurrentTab().then((tab) => {
      setCurrentTab(tab);
    });
  }, []);

  const parsedUrl = useMemo(() => {
    return (
      currentTab?.url !== undefined && parseSocialNetworkUrl(currentTab.url)
    );
  }, [currentTab]);

  return (
    <>
      <h1>BTH</h1>

      {!parsedUrl && (
        <div className="card">
          Pour capturer des commentaires et les analyser naviguez vers une
          publication d&apos;un réseau social supporté (youtube, instagram...)
          puis ouvrez l&apos;extension à nouveau.
        </div>
      )}
      {parsedUrl && (
        <div className="card">
          <p>
            Vous êtes sur un {parsedUrl.type} {parsedUrl.socialNetwork}. Pour
            capturer les commentaires et les analyser cliquez sur le bouton.
          </p>

          <button onClick={() => sendScrapMessage()}>
            ⏺️ Capturer les commentaires
          </button>
          <p>
            ⚠️ Une fois le bouton cliqué l&apos;extension va prendre le contrôle
            de la page pour effectuer la capture.
          </p>
        </div>
      )}

      <div className="card">
        <a href={reportPageUrl} target="bth-report-page">
          Afficher les résultats précedents
        </a>
      </div>
    </>
  );
}

export default App;
