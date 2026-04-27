import { Button } from "@/components/ui/button";
import {
  AlertTriangleIcon,
  ChartColumn,
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
  return (
    <div className="flex flex-col p-3 h-full">
      <Logo className="mx-auto mt-4 mb-8" />
      <Button className="text-xs mb-6">
        <Plus />
        <Link to="/build-report">Créer un rapport</Link>
      </Button>
      <div className="flex flex-col gap-1">
        <SidePanelMenuItem
          label="Vue d'ensemble"
          to="/"
          icon={<ChartColumn />}
        />
        <SidePanelMenuItem
          label="Publications analysées"
          to="/posts"
          icon={<File />}
        />
        <SidePanelMenuItem
          label="Aide et ressources"
          to="/help"
          icon={<MessageCircleQuestionMark />}
        />
      </div>
      <div className="grow " />
      <div className="flex flex-col gap-1 ">
        <SidePanelMenuItem
          label="Signaler un problème technique"
          to="/contact-support"
          icon={<AlertTriangleIcon />}
        />
        <SidePanelMenuItem
          label="Données brutes"
          to="/post-snapshots"
          icon={<CylinderIcon />}
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
}: {
  label: string;
  to: string;
  className?: string;
  icon?: React.ReactNode;
}) {
  return (
    <NavLink
      className={({ isActive }) =>
        cn(
          isActive ? "bg-navigation-accent font-semibold" : "",
          "flex rounded-sm justify-start hover:bg-navigation-accent p-2 items-center",
          className,
        )
      }
      to={to}
    >
      {icon && <span className="mr-2">{icon}</span>}
      {label}
    </NavLink>
  );
}

export default SidePanelMenu;
