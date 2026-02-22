from enum import Enum


class AnnotatedCategory(Enum):
    ABSENCE_DE_CYBERHARCELEMENT = "Absence de cyberharcèlement"
    CYBERHARCELEMENT_DEFINITION_GENERALE = "Cyberharcèlement (définition générale)"
    CYBERHARCELEMENT_A_CARACTERE_SEXUEL = "Cyberharcèlement à caractère sexuel"
    MENACES = "Menaces"
    INCITATION_AU_SUICIDE = "Incitation au suicide"
    INJURE_ET_DIFFAMATION_PUBLIQUE = "Injure et diffamation publique"
    DOXXING = "Doxxing"
    INCITATION_A_LA_HAINE = "Incitation à la haine"
