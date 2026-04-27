import { Alert } from "@/components/ui/alert";
import PageHeader from "../Shared/PageHeader";
import { TrafficConeIcon } from "lucide-react";

function ContactSupport() {
  return (
    <main className="p-4 flex flex-col gap-6  items-start">
      <PageHeader title="Signaler un problème" />
      <Alert variant="destructive">
        <TrafficConeIcon /> En cours de développement
      </Alert>
    </main>
  );
}

export default ContactSupport;
