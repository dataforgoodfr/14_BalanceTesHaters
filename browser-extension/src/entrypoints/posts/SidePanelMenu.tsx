import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Link } from "react-router";

function SidePanelMenu() {
  return (
    <div className="flex flex-col p-3 w-1/5">
      <div className="text-lg font-bold my-4">Balance tes haters</div>
      <Button className="text-xs mb-6">
        <Plus />
        <Link to="/build-report">Créer un rapport</Link>
      </Button>
      <div className="text-left">
        <Button variant="ghost">
          <Link to="/">Vue d&apos;ensemble</Link>
        </Button>
        <Button variant="ghost">
          <Link to="/posts">Publications analysées</Link>
        </Button>
        <Button variant="ghost">
          <Link to="/">Aide et ressources</Link>
        </Button>
        <Button variant="ghost">
          <Link to="/post-snapshots">[Dev] Données brutes</Link>
        </Button>
      </div>
    </div>
  );
}

export default SidePanelMenu;
