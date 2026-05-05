/* eslint-disable react/no-unescaped-entities */
import { Link } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PageHeader from "../Shared/PageHeader";
import { BookOpenTextIcon, HandHeartIcon, ShieldCheckIcon } from "lucide-react";

function HelpPage() {
  return (
    <main className="flex flex-col gap-6 items-start">
      <PageHeader title="Aide et ressources" />

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
