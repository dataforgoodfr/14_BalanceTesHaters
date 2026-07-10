import PageHeader from "../Shared/PageHeader";
import { main } from "../Menu";
import privacyPolicyMarkdown from "./privacy-policy.md?raw";
import { HelpPageContent } from "./HelpContent";

function PrivacyPolicyPage() {
  return (
    <main className="flex flex-col items-start ">
      <PageHeader menuEntry={main.menuEntries.Privacy} />
      <HelpPageContent mdContent={privacyPolicyMarkdown}></HelpPageContent>
    </main>
  );
}

export default PrivacyPolicyPage;
