import { BookOpenText } from "lucide-react";

export const NoticeUtilisation = () => {
  return (
    <div className="border rounded-lg  bg-indigo-50 border-indigo-100 text-indigo-800">
      <div className="flex items-center gap-2 p-4 border-b-2 border-indigo-100">
        <BookOpenText />
        <span className="text-xl font-semibold">
          Notice sur l’utilisation du rapport de preuves
        </span>
      </div>
      <div className="flex flex-col gap-3 text-left px-8 py-3">
        <div>
          <span className="text-lg font-semibold">1. En cas d’urgence</span>
          <ul className="list-disc list-inside ps-2">
            <li>Si un danger immédiat est identifié : 17 / 112.</li>
            <li>Mettre en sécurité et limiter l’exposition aux contenus.</li>
          </ul>
        </div>
        <div>
          <span className="text-lg font-semibold">
            2. Conserver les preuves
          </span>
          <ul className="list-disc list-inside">
            <li>
              Télécharger et sauvegarder le rapport dans un espace sûr et faire
              une copie.
            </li>
            <li>
              Le rapport contient déjà les liens et les dates associés aux
              contenus.
            </li>
          </ul>
          Option : demander un constat par commissaire de justice
        </div>
        <div>
          <span className="text-lg font-semibold">3. Déposer plainte</span>
          <ul className="list-disc list-inside">
            <li>
              Dépôt au commissariat/gendarmerie ou via pré-plainte en ligne,
              puis signature.
            </li>
            <li>
              Fournir le rapport + tout élément complémentaire utile
              captures/échanges privés, contexte, etc.
            </li>
          </ul>
        </div>
        <div>
          <span className="text-lg font-semibold">4. Se faire accompagner</span>
          <ul className="list-disc list-inside">
            <li>
              En cas de besoin : association, personne de confiance, avocat.
            </li>
          </ul>
        </div>
        <div>
          <span className="text-lg font-semibold">5. À retenir</span>
          <ul className="list-disc list-inside">
            <li>
              Agir rapidement est préférable : certains délais peuvent être
              courts.
            </li>
            <li>
              L’identification des auteurs relève des autorités compétentes.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
