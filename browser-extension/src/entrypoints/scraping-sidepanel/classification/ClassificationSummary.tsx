import { CircleUserRoundIcon, MessageSquareWarningIcon } from "lucide-react";
import { LIMIT_HATE_SCORE, type HateStats } from "./hateStats";
import type React from "react";
import { cn } from "@/lib/utils";
import {
  descriptionTextStyle,
  InfoCard,
  InfoCardDescription,
  InfoCardTitle,
  titleTextStyle,
} from "./InfoCard";

export function ClassificationSummary({ hateStats }: { hateStats: HateStats }) {
  if (hateStats.hatefulCommentsCount > 0) {
    return (
      <div className="w-full rounded-lg px-4 py-3 border flex flex-row">
        <HateCard className="basis-1/2">
          <HateCardIcon>
            <MessageSquareWarningIcon />
          </HateCardIcon>
          <HateCardTitle>
            {hateStats.hatefulCommentsCount} commentaires
          </HateCardTitle>
          <HateCardDescription>
            malveillants détectés avec un seuil de confiance supérieur à{" "}
            {LIMIT_HATE_SCORE * 100}%
          </HateCardDescription>
        </HateCard>
        <HateCard className="basis-1/2">
          <HateCardIcon>
            <CircleUserRoundIcon />
          </HateCardIcon>
          <HateCardTitle>{hateStats.hatersCount} auteurs</HateCardTitle>
          <HateCardDescription>
            de commentaires malveillants détectés avec un seuil de confiance
            supérieur à {LIMIT_HATE_SCORE * 100}%
          </HateCardDescription>
        </HateCard>
      </div>
    );
  } else {
    return (
      <InfoCard>
        <InfoCardTitle>
          Aucun commentaire malveillant détecté détectés avec un seuil de
          confiance supérieur à {LIMIT_HATE_SCORE * 100}%
        </InfoCardTitle>
        <InfoCardDescription>
          Pour analyser une autre publication : ouvre-la sur YouTube/Instagram,
          puis clique sur “Lancer une nouvelle analyse”.
        </InfoCardDescription>
      </InfoCard>
    );
  }
}

export function HateCard({
  children,
  className,
}: React.PropsWithChildren<{ className: string }>) {
  return <div className={className}>{children}</div>;
}

export function HateCardIcon({ children }: React.PropsWithChildren) {
  return (
    <div className="m-auto size-10 rounded-lg text-primary bg-primary-background flex justify-center items-center *:[svg]:size-6">
      {children}
    </div>
  );
}
export function HateCardTitle({ children }: React.PropsWithChildren) {
  return (
    <div className={cn("m-auto text-center", titleTextStyle)}>{children}</div>
  );
}

export function HateCardDescription({ children }: React.PropsWithChildren) {
  return (
    <div className={cn("m-auto text-center", descriptionTextStyle)}>
      {children}
    </div>
  );
}
