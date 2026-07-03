import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Plus } from "lucide-react";
import { Link, NavLink } from "react-router";
import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/shared/Logo";
import { main, MenuEntry } from "./Menu";

const menuEntries = Object.values(main.menuEntries);
const topEntries = menuEntries.filter(
  (entry) => entry.section !== "bottom" && entry.parentMenu === undefined,
);
const bottomEntries = menuEntries.filter((entry) => entry.section === "bottom");

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
        {topEntries.map((entry) => {
          return (
            <React.Fragment key={entry.to}>
              <SidePanelMenuItem
                label={entry.label}
                to={entry.to}
                icon={entry.icon}
                className={entry.className}
                withSubMenu={entry.subMenus.length > 0}
                subMenuOpen={
                  entry.subMenus.length > 0
                    ? aideMenuOpen
                    : false
                }
                onClick={
                  entry.subMenus.length > 0
                    ? () => setaideMenuOpen((current) => !current)
                    : undefined
                }
              />
              {entry.subMenus.length > 0 && aideMenuOpen && (
                <div className="flex flex-col gap-1 pl-6">
                  {entry.subMenus.map((subEntry) => (
                    <SidePanelMenuItem
                      key={subEntry.to}
                      label={subEntry.label}
                      to={subEntry.to}
                    />
                  ))}
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      <div className="grow" />

      <div className="flex flex-col gap-1">
        {bottomEntries.map((entry) => (
          <SidePanelMenuItem
            key={entry.to}
            label={entry.label}
            to={entry.to}
            icon={entry.icon}
          />
        ))}
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
  withSubMenu = false,
  subMenuOpen = false,
}: {
  label: string;
  to: string;
  className?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  withSubMenu?: boolean;
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
      <div className="ms-auto">
        {withSubMenu ? subMenuOpen ? <ChevronDown /> : <ChevronUp /> : null}
      </div>
    </NavLink>
  );
}

export default SidePanelMenu;
