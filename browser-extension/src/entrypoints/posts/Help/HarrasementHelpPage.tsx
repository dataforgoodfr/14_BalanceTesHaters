import PageHeader from "../Shared/PageHeader";
import harassmentHelpMarkdown from "./harassment-help.md?raw";
import { HelpPageContent } from "./HelpContent";

function HarrasementHelpPage() {
  return (
    <main className="p-4 flex flex-col items-start w-full max-w-4xl">
      <PageHeader title="Aide et ressources - Cyberharcèlement & actions" />
      <HelpPageContent mdContent={harassmentHelpMarkdown}></HelpPageContent>
    </main>
  );
}

export default HarrasementHelpPage;
