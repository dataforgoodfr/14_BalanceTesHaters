import PageHeader from "../Shared/PageHeader";
import { main } from "../Menu";

import productHelpMarkdown from "./product-help.md?raw";
import { HelpPageContent } from "./HelpContent";

function ProductHelpPage() {
  return (
    <main className="flex flex-col items-start">
      <PageHeader menuEntry={main.menuEntries.Product} />
      <HelpPageContent mdContent={productHelpMarkdown}></HelpPageContent>
    </main>
  );
}

export default ProductHelpPage;
