import { CircleXIcon } from "lucide-react";
import { PageNotScrapableAlert } from "../popup/PageNotScrapableAlert";
import {
  SidePanelActions,
  SidePanelHeader,
  SidePanelLayout,
  SidePanelTitle,
} from "./SidePanelLayout";
import { ViewPreviousAnalysesButton } from "./ViewPreviousAnalysesButton";

export function DisplayTabNotScrapable() {
  return (
    <SidePanelLayout>
      <SidePanelHeader>
        <SidePanelTitle>
          <CircleXIcon /> Page non compatible
        </SidePanelTitle>
      </SidePanelHeader>
      <PageNotScrapableAlert />
      <SidePanelActions>
        <ViewPreviousAnalysesButton />
      </SidePanelActions>
    </SidePanelLayout>
  );
}
