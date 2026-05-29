export interface NoticeItem {
  text: string;
  isSpecial?: boolean;
}

export interface NoticeSection {
  title: string;
  items: NoticeItem[];
}

export interface NoticeData {
  mainTitle: string;
  sections: NoticeSection[];
}

export const NOTICE_UTILISATION_DATA: NoticeData = {
  mainTitle: "Notice sur l'utilisation du rapport de preuves",
  sections: [
    {
      title: "1. En cas d'urgence",
      items: [
        { text: "Si un danger immédiat est identifié : 17 / 112." },
        { text: "Mettre en sécurité et limiter l'exposition aux contenus." },
      ],
    },
    {
      title: "2. Conserver les preuves",
      items: [
        {
          text: "Télécharger et sauvegarder le rapport dans un espace sûr et faire une copie.",
        },
        {
          text: "Le rapport contient déjà les liens et les dates associés aux contenus.",
        },
        {
          text: "Option : demander un constat par commissaire de justice",
          isSpecial: true,
        },
      ],
    },
    {
      title: "3. Déposer plainte",
      items: [
        {
          text: "Dépôt au commissariat/gendarmerie ou via pré-plainte en ligne, puis signature.",
        },
        {
          text: "Fournir le rapport + tout élément complémentaire utile captures/échanges privés, contexte, etc.",
        },
      ],
    },
    {
      title: "4. Se faire accompagner",
      items: [
        { text: "En cas de besoin : association, personne de confiance, avocat." },
      ],
    },
    {
      title: "5. À retenir",
      items: [
        {
          text: "Agir rapidement est préférable : certains délais peuvent être courts.",
        },
        {
          text: "L'identification des auteurs relève des autorités compétentes.",
        },
      ],
    },
  ],
};
