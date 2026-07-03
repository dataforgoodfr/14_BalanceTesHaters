import { Button } from "@/components/ui/button";
import {
  AlertTriangleIcon,
  ChartColumn,
  ChevronDown,
  ChevronUp,
  CylinderIcon,
  File,
  MessageCircleQuestionMark,
  Plus,
} from "lucide-react";
import { Link, NavLink } from "react-router";
import React from "react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/shared/Logo";

function SidePanelMenu() {
  const [aideMenuOpen, setaideMenuOpen] = useState(false);

  return (
    <div className="flex flex-col ps-4 h-full">
      <Logo className="mx-auto mt-4 mb-8" />
      <Button roundness="round" className="text-xs mb-6">
        <Plus />
        <Link to="/build-report">Créer un rapport</Link>
      </Button>
      <div className="flex flex-col gap-5 mt-5">
        <SidePanelMenuItem
          label="Vue d'ensemble"
          to="/"
          icon={<ChartColumn size="16" />}
        />
        <SidePanelMenuItem
          label="Publications analysées"
          to="/posts"
          icon={<File size="16" />}
        />
        <div className="flex gap-1 justify-between">
          <SidePanelMenuItem
            label="Aide et ressources"
            className="w-full"
            to="/help"
            icon={<MessageCircleQuestionMark size="16" />}
            onClick={() => setaideMenuOpen(!aideMenuOpen)}
            hasSubMenu={true}
            subMenuOpen={aideMenuOpen}
          />
        </div>
        {aideMenuOpen && (
          <div className="flex flex-col gap-1 pl-6">
            <SidePanelMenuItem
              label="Utiliser Balance Tes Haters"
              to="/help/product"
            />
            <SidePanelMenuItem
              label="Cyberharcèlement et actions"
              to="/help/harrasement"
            />
            <SidePanelMenuItem
              label="Données personnelles"
              to="/help/privacy-policy"
            />
          </div>
        )}
      </div>
      <div className="grow " />
      <div className="flex flex-col gap-1 ">
        <SidePanelMenuItem
          label="Signaler un problème technique"
          to="/contact-support"
          icon={<AlertTriangleIcon size="16" />}
        />
        <SidePanelMenuItem
          label="Données brutes"
          to="/post-snapshots"
          icon={<CylinderIcon size="16" />}
        />
      </div>
    </div>
  );
}

function SidePanelMenuItem({
  label,
  to,
  className,
  icon,
  onClick,
  hasSubMenu = false,
  subMenuOpen = false,
}: {
  label: string;
  to: string;
  className?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  hasSubMenu?: boolean;
  subMenuOpen?: boolean;
}) {
  return (
    <NavLink
      onClick={() => onClick?.()}
      className={({ isActive }) =>
        cn(
          isActive ? "bg-navigation-accent font-medium" : "font-normal",
          "text-left text-sm flex rounded-sm justify-start hover:bg-navigation-accent p-2 items-center",
          className,
        )
      }
      to={to}
    >
      {icon && <span className="mr-2">{icon}</span>}
      {label}
      <div className="ms-auto" >
        {hasSubMenu ? subMenuOpen ? <ChevronDown /> : <ChevronUp /> : null}
      </div>
    </NavLink>
  );
}

export default SidePanelMenu;
