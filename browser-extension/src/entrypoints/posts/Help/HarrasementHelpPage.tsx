import PageHeader from "../Shared/PageHeader";
import { main } from "../Menu";
import harassmentHelpMarkdown from "./harassment-help.md?raw";
import { HelpPageContent } from "./HelpContent";

function HarrasementHelpPage() {
  return (
    <main className="flex flex-col items-start ">
      <PageHeader menuEntry={main.menuEntries.Harrasement} />
      <HelpPageContent mdContent={harassmentHelpMarkdown}></HelpPageContent>
    </main>
  );
}

export default HarrasementHelpPage;
