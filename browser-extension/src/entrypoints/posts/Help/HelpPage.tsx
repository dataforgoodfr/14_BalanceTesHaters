/* eslint-disable react/no-unescaped-entities */
import { Link } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PageHeader from "../Shared/PageHeader";
import {
  BookOpenTextIcon,
  HandHeartIcon,
  SearchIcon,
  ShieldCheckIcon,
} from "lucide-react";
import helpGradientUrl from "~/assets/help-gradient.png";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";

function HelpPage() {
  return (
    <main className="flex flex-col gap-6 items-start">
      <PageHeader title="Aide et ressources" />

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

      <div className="grid gap-4 md:grid-cols-3 w-full">
        <Link to="/help/product" className="block">
          <Card className="h-full hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors">
            <CardHeader>
              <BookOpenTextIcon className="text-center w-full size-10" />
              <CardTitle>Utiliser Balance tes Haters</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                À propos de l'outil, comment ça marche, compléter le dossier,
                périmètre et limites, comprendre les notions.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/help/harrasement" className="block">
          <Card className="h-full hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors">
            <CardHeader>
              <HandHeartIcon className="text-center w-full size-10" />
              <CardTitle>Cyberharcèlement & actions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Premières actions, se protéger en ligne, porter plainte et se
                faire accompagner, accompagner juridique, identifier le
                cyberharcèlement.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/help/privacy-policy" className="block">
          <Card className="h-full hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors">
            <CardHeader>
              <ShieldCheckIcon className="text-center w-full size-10" />
              <CardTitle>
                Données personnelles et politique de confidentialité
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Données collectées, utilisation des données, partage des
                données, localisation & conservation, vos droits, sécurité,
                contact.
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </main>
  );
}

export default HelpPage;
