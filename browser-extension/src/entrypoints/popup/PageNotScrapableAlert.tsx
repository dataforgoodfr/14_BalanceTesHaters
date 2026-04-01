import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CircleAlertIcon } from "lucide-react";

export function PageNotScrapableAlert() {
  return (
    <Alert className="max-w-md" variant="destructive">
      <CircleAlertIcon />
      <AlertTitle>Impossible de lancer l&apos;analyse</AlertTitle>
      <AlertDescription>
        Pour démarrer, ouvre ta publication YouTube ou Instagram.
      </AlertDescription>
    </Alert>
  );
}
