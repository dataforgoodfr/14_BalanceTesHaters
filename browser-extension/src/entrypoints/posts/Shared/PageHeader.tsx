import { Separator } from "@base-ui/react";
import type { MenuEntry } from "../Menu";
import { NavLink } from "react-router";

function PageHeader({
  menuEntry,
  title,
}: Readonly<{ menuEntry?: MenuEntry; title?: string }>) {
  return (
    <div className="w-full relative">
      <h4 className="text-left w-full mb-3">
        {menuEntry?.parentMenu && (
          <NavLink
            to={menuEntry.parentMenu.to}
            className="text-muted-foreground"
          >
            <span className="text-muted-foreground ">
              {menuEntry.parentMenu.label} {"> "}
            </span>
          </NavLink>
        )}
        {menuEntry?.label ?? title}
      </h4>

      {/* 
      PageHeader is meant to be used only inside a <main> tag
      The separator is configured to overflow on <main> padding
      */}
      <Separator className="absolute w-[calc(100%+var(--spacing)*8)] -mx-4 border" />
    </div>
  );
}

export default PageHeader;
