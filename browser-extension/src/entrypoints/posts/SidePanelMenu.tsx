import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Link } from "react-router";

function SidePanelMenu() {
  return (
    <div className="flex flex-col bg-gray-100 dark:bg-gray-800 p-4 w-1/4">
      <div className="text-lg font-bold my-4">Balance tes haters</div>
      <Button className="text-sm mb-4">
        <Plus />
        Créer un rapport
      </Button>
      <Button variant="ghost">
        <Link to="/">Vue d&apos;ensemble</Link>
      </Button>
      <Button variant="ghost">
        <Link to="/posts">Publications analysées</Link>
      </Button>
      <Button variant="ghost">
        <Link to="/">Aide et ressources</Link>
      </Button>
    </div>
  );
}

export default SidePanelMenu;
