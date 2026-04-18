import { TabInfoClassificationInProgess } from "../useScrapingAndClassificationTabInfo";
import { ViewPreviousAnalysesButton } from "../ViewPreviousAnalysesButton";
import {
  SidePanelActions,
  SidePanelHeader,
  SidePanelLayout,
  SidePanelTitle,
} from "../SidePanelLayout";
import { BthCustomSpinner } from "../../../components/shared/BthSpinner";
import { Progress } from "@/components/ui/progress";
import { InfoCard, InfoCardDescription, InfoCardTitle } from "./InfoCard";

export function DisplayClassificationInProgress({
  tabInfo: _,
}: {
  tabInfo: TabInfoClassificationInProgess;
}) {
  return (
    <SidePanelLayout>
      <SidePanelHeader>
        <SidePanelTitle>
          <BthCustomSpinner />
          Analyse en cours (2/2)
        </SidePanelTitle>
        <Progress title="Progrès de l'Analyse" value={50} />
      </SidePanelHeader>
      <InfoCard>
        <InfoCardTitle>
          Tu peux fermer cet onglet : l&apos;analyse continue en arrière-plan.
        </InfoCardTitle>
        <InfoCardDescription>
          Suis son avancement dans &quot;Publications analysées&quot;. Tu
          recevras une notification dès que les résultats sont prêts.
        </InfoCardDescription>
      </InfoCard>
      <SidePanelActions>
        <ViewPreviousAnalysesButton />
      </SidePanelActions>
    </SidePanelLayout>
  );
}
