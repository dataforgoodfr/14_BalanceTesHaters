import type React from "react";
import {
  AlertTriangleIcon,
  ChartColumn,
  CylinderIcon,
  File,
  MessageCircleQuestionMark,
} from "lucide-react";

export type MenuSection = "top" | "bottom";

export type MenuEntryInput = {
  label: string;
  to: string;
  icon?: React.ReactNode;
  className?: string;
  section?: MenuSection;
  parentMenu?: MenuEntry;
};

export type MenuEntry = MenuEntryInput & {
  subMenus: MenuEntry[];
};

function defineEntry(input: MenuEntryInput): MenuEntry {
  return { ...input, subMenus: [] };
}

const overview = defineEntry({
  label: "Vue d'ensemble",
  to: "/",
  icon: <ChartColumn size="16" />,
  section: "top",
});
const posts = defineEntry({
  label: "Publications analysées",
  to: "/posts",
  icon: <File size="16" />,
  section: "top",
});
const help = defineEntry({
  label: "Aide et ressources",
  to: "/help",
  icon: <MessageCircleQuestionMark size="16" />,
  className: "w-full",
  section: "top",
});
const product = defineEntry({
  label: "Utiliser Balance Tes Haters",
  to: "/help/product",
  parentMenu: help,
});
const harrasement = defineEntry({
  label: "Cyberharcèlement et actions",
  to: "/help/harrasement",
  parentMenu: help,
});
const privacy = defineEntry({
  label: "Données personnelles",
  to: "/help/privacy-policy",
  parentMenu: help,
});
const contactSupport = defineEntry({
  label: "Signaler un problème technique",
  to: "/contact-support",
  icon: <AlertTriangleIcon size="16" />,
  section: "bottom",
});
const postSnapshots = defineEntry({
  label: "Données brutes",
  to: "/post-snapshots",
  icon: <CylinderIcon size="16" />,
  section: "bottom",
});

export const main = {
  menuEntries: {
    Overview: overview,
    Posts: posts,
    Help: help,
    Product: product,
    Harrasement: harrasement,
    Privacy: privacy,
    ContactSupport: contactSupport,
    PostSnapshots: postSnapshots,
  },
};

// Populate subMenus for each entry based on parentMenu
for (const entry of Object.values(main.menuEntries)) {
  entry.parentMenu?.subMenus.push(entry);
}
