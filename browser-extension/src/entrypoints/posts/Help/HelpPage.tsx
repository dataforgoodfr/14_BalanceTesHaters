import { TrafficConeIcon } from "lucide-react";
import PageHeader from "../Shared/PageHeader";

import { Alert } from "@/components/ui/alert";

function HelpPage() {
  return (
    <main className="p-4 flex flex-col gap-6  items-start">
      <PageHeader title="Aide et ressources" />
      <Alert variant="destructive">
        <TrafficConeIcon /> En cours de développement
      </Alert>
    </main>
  );
}

export default HelpPage;
