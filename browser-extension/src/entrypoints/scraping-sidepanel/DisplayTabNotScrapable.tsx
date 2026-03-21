import WorkInProgress from "../posts/WorkInProgress";
import { ViewPreviousAnalysesButton } from "./ViewPreviousAnalysesButton";

export function DisplayTabNotScrapable() {
  return (
    <>
      <WorkInProgress />
      <div className="flex flex-col gap-2">
        <h2>Page non capturable</h2>
        <p>
          Navigue vers une publication d&apos;un réseau social supporté
          (youtube, instagram...) pour pouvoir lancer l&apos;analyse.
        </p>
        <ViewPreviousAnalysesButton />
      </div>
    </>
  );
}
