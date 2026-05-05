import PageHeader from "../Shared/PageHeader";
import privacyPolicyMarkdown from "./privacy-policy.md?raw";
import { HelpPageContent } from "./HelpContent";

function PrivacyPolicyPage() {
  return (
    <main className="flex flex-col items-start ">
      <PageHeader title="Aide et ressources - Données personnelles et politique de confidentialité" />
      <HelpPageContent mdContent={privacyPolicyMarkdown}></HelpPageContent>
    </main>
  );
}

export default PrivacyPolicyPage;
