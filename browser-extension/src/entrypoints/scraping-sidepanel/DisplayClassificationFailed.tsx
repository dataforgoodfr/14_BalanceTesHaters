import WorkInProgress from "../posts/WorkInProgress";
import { TabInfoClassificationFailed } from "./useScrapingAndClassificationTabInfo";
import { ViewPreviousAnalysesButton } from "./ViewPreviousAnalysesButton";

export function DisplayClassificationFailed({
  tabInfo,
}: {
  tabInfo: TabInfoClassificationFailed;
}) {
  return (
    <>
      <WorkInProgress />
      <div className="flex flex-col gap-2">
        <h2>La classification a échouée...</h2>
        JobId: {tabInfo.snapshot.classificationJobId}
        <ViewPreviousAnalysesButton />
      </div>
    </>
  );
}
