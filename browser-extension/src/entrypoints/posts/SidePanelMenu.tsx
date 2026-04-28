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
          icon={<ChartColumn size="16" />}
        />
        <SidePanelMenuItem
          label="Publications analysées"
          to="/posts"
          icon={<File size="16" />}
        />
        <SidePanelMenuItem
          label="Aide et ressources"
          to="/help"
          icon={<MessageCircleQuestionMark size="16" />}
        />
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
          isActive ? "bg-navigation-accent font-medium" : "font-normal",
          "text-left text-sm flex rounded-sm justify-start hover:bg-navigation-accent p-2 items-center",
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
