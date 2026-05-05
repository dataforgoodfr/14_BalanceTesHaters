import PageHeader from "../Shared/PageHeader";

import productHelpMarkdown from "./product-help.md?raw";
import { HelpPageContent } from "./HelpContent";

function ProductHelpPage() {
  return (
    <main className="flex flex-col items-start">
      <PageHeader title="Aide et ressources - Utiliser Balance tes Haters" />
      <HelpPageContent mdContent={productHelpMarkdown}></HelpPageContent>
    </main>
  );
}

export default ProductHelpPage;
