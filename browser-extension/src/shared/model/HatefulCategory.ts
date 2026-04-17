export enum HatefulCategory {
  ABSENCE_DE_CYBERHARCELEMENT = "ABSENCE_DE_CYBERHARCELEMENT",
  CYBERHARCELEMENT_DEFINITION_GENERALE = "CYBERHARCELEMENT_DEFINITION_GENERALE",
  CYBERHARCELEMENT_A_CARACTERE_SEXUEL = "CYBERHARCELEMENT_A_CARACTERE_SEXUEL",
  MENACES = "MENACES",
  INCITATION_AU_SUICIDE = "INCITATION_AU_SUICIDE",
  INJURE_ET_DIFFAMATION_PUBLIQUE = "INJURE_ET_DIFFAMATION_PUBLIQUE",
  DOXXING = "DOXXING",
  INCITATION_A_LA_HAINE = "INCITATION_A_LA_HAINE",
}

export const HatefulCategoryLabels: Record<HatefulCategory, string> = {
  [HatefulCategory.ABSENCE_DE_CYBERHARCELEMENT]: "Absence de cyberharcèlement",
  [HatefulCategory.CYBERHARCELEMENT_DEFINITION_GENERALE]:
    "Cyberharcèlement (autre)",
  [HatefulCategory.CYBERHARCELEMENT_A_CARACTERE_SEXUEL]:
    "Cyberharcèlement à caractère sexuel",
  [HatefulCategory.MENACES]: "Menaces",
  [HatefulCategory.INCITATION_AU_SUICIDE]: "Incitation au suicide",
  [HatefulCategory.INJURE_ET_DIFFAMATION_PUBLIQUE]:
    "Injure et diffamation publique",
  [HatefulCategory.DOXXING]: "Doxxing",
  [HatefulCategory.INCITATION_A_LA_HAINE]: "Incitation à la haine",
};
