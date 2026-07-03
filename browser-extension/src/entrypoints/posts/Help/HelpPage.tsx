/* eslint-disable react/no-unescaped-entities */
import { Link } from "react-router";
import type { ComponentType, ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import PageHeader from "../Shared/PageHeader";
import {
  BookOpenTextIcon,
  FileUser,
  Phone,
  SearchIcon,
  ShieldCheck,
} from "lucide-react";
import helpGradientUrl from "~/assets/help-gradient.png";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { main } from "../Menu";

type HelpLinkProps = {
  to: string;
  Icon: ComponentType<React.SVGProps<SVGSVGElement>>;
  title: string;
  children?: ReactNode;
};

const HelpMenuLink = ({ to, Icon, title, children }: HelpLinkProps) => (
  <Link to={to} className="block w-1/3">
    <Card className="h-full hover:bg-selected hover:border-selected-accent dark:hover:bg-gray-700 cursor-pointer transition-colors">
      <CardContent className="flex flex-col items-center text-center gap-1 py-2">
        <Icon className="text-center w-full size-5 text-muted-foreground" />
        <span className="font-semibold text-sm">{title}</span>
        <span className="text-sm text-muted-foreground dark:text-gray-400">
          {children}
        </span>
      </CardContent>
    </Card>
  </Link>
);

type HelpTelNumberProps = {
  number: string;
  children: ReactNode;
};
const HelpTelNumber = ({ number, children }: HelpTelNumberProps) => (
  <div className="w-1/2 bg-gray-50 shadow border-none flex items-center text-center rounded-lg py-2 px-6">
      <Phone className="text-primary me-1 size-4" />
      <span className="text-primary text-[20px] font-semibold me-3">
        {number}
      </span>
      <span className="text-sm text-muted-foreground ">{children}</span>
  </div>
);

function HelpPage() {
  return (
    <main className="flex flex-col gap-6 items-start">
      <PageHeader menuEntry={main.menuEntries.Help} />

      <div className="relative ">
        <img src={helpGradientUrl} className="w-full " alt="" />
        <div className="absolute top-0 left-0 w-full h-full flex flex-col items-center justify-center gap-8 p-4">
          <p className="text-4xl font-semibold text-center">
            Comment pouvons-nous t’aider ?
          </p>
          <InputGroup className="w-1/2 bg-background">
            <InputGroupInput
              // value={""}
              // onChange={() => {return;}}
              placeholder="Rechercher par mot-clé"
              aria-label="Rechercher par mot-clé"
            />
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
          </InputGroup>
        </div>
      </div>
      {/* <div className="bg-[url(/src/assets/help-gradient.png)] w-full h-49 bg-contain "></div> */}

      <div className="flex gap-3 w-full">
        <HelpMenuLink
          to="/help/product"
          Icon={BookOpenTextIcon}
          title="Utiliser Balance tes Haters"
        >
          Informations sur l’outil et guide d’utilisation
        </HelpMenuLink>

        <HelpMenuLink
          to="/help/harrasement"
          Icon={ShieldCheck}
          title="Cyberharcèlement et actions"
        >
          Ressources, conseils et démarches pour agir et se faire accompagner
        </HelpMenuLink>

        <HelpMenuLink
          to="/help/privacy-policy"
          Icon={FileUser}
          title="Données personnelles"
        >
          Informations sur la collecte, l’usage et la sécurité des données
        </HelpMenuLink>
      </div>

      <p className="font-semibold text-lg">Contacts d'urgence</p>
      <div className="flex flex-col w-full gap-2">
        <div className="flex gap-3">
          <HelpTelNumber number="17">Police Secours</HelpTelNumber>
          <HelpTelNumber number="3018">
            Aide aux victimes de cyberharcèlement
          </HelpTelNumber>
        </div>
        <div className="flex gap-3">
          <HelpTelNumber number="116006">
            Aide aux victimes d'une infraction
          </HelpTelNumber>
          <HelpTelNumber number="3919">
            Aide aux femmes victimes de violences
          </HelpTelNumber>
        </div>
      </div>
    </main>
  );
}

export default HelpPage;
