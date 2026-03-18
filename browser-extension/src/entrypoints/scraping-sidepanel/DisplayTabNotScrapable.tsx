import WorkInProgress from "../posts/WorkInProgress";
import { ViewPreviousAnalysesButton } from "./ViewPreviousAnalysesButton";

export function DisplayTabNotScrapable() {
  return (
    <>
      <WorkInProgress />
      <div className="flex flex-col gap-2">
        <h2>Page non capturable</h2>
        <p>
          Pour capturer des commentaires et les analyser naviguez vers une
          publication d&apos;un réseau social supporté (youtube, instagram...).
        </p>
        <ViewPreviousAnalysesButton />
      </div>
    </>
  );
}
