import { TabInfoClassificationFailed } from "../popup/useScrapingAndClassificationTabInfo";
import { ViewPreviousAnalysesButton } from "../popup/ViewPreviousAnalysesButton";

export function DisplayClassificationFailed({
  tabInfo,
}: {
  tabInfo: TabInfoClassificationFailed;
}) {
  return (
    <>
      <h2>Oups. La classificaiton a échouée...</h2>
      JobId: {tabInfo.snapshot.classificationJobId}
      <ViewPreviousAnalysesButton />
    </>
  );
}
