import z from "zod";

/**
 * Comment classification categories.
 * Values are the one returned by backend.
 * Shoulb be kept in sync with Backend AnnotatedCategory ( backend/balanceteshaters/classification/category.py)
 */
export enum AnnotatedCategory {
  ABSENCE_DE_CYBERHARCELEMENT = "Absence de cyberharcèlement",
  CYBERHARCELEMENT_DEFINITION_GENERALE = "Cyberharcèlement (autre)",
  CYBERHARCELEMENT_A_CARACTERE_SEXUEL = "Cyberharcèlement à caractère sexuel",
  MENACES = "Menaces",
  INCITATION_AU_SUICIDE = "Incitation au suicide",
  INJURE_ET_DIFFAMATION_PUBLIQUE = "Injure et diffamation publique",
  DOXXING = "Doxxing",
  INCITATION_A_LA_HAINE = "Incitation à la haine",
}

export const AnnotatedCategorySchema = z.enum(AnnotatedCategory);

export function getCategoryLabel(category: AnnotatedCategory): string {
  // Currently category values are labels
  return category;
}

export function isCategoryHateful(category: AnnotatedCategory): boolean {
  return category !== AnnotatedCategory.ABSENCE_DE_CYBERHARCELEMENT;
}
