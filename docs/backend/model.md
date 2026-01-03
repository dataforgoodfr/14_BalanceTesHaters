# Modèle de données

```mermaid
classDiagram
    class Auteur {
        stat_nb_publications
        stat_nb_commentaires
    }

    class Identite {
        id: UUID
        pseudo: str
        url: str
    }
    Identite "0..n" -- "1" ReseauSocial
    Auteur "1" *-- "1..n" Identite : possède

    class ReseauSocial {
        <<enumeration>>
        YOUTUBE
        INSTAGRAM
        TIKTOK
        ...
    }
    class Publication {
        id: UUID
        url: str
        date_publication: datetime
        horodatage_capture: datetime
        texte_publication: str
    }
    Identite "1" --> "0..n" Publication : est l'auteur de
    Publication "0..n" --> "1" ReseauSocial : publiée sur

    class Commentaire {
        id: UUID
        texte_commentaire: str
        date_commentaire: str | datetime
        date_relative: bool
        screenshot: str
        horodatage_screenshot: datetime
        classification: list[str]
        horodatage_classification: datetime
    }

    Publication "1" *-- "0..n" Commentaire
    Identite "1" --> "0..n" Commentaire : est l'auteur de
    Commentaire "1" -- "0..n" Commentaire : réponses

```

`User` : Utilisateur de la plate-forme _Balance tes haters_. 
- Dispose d'un login et d'un mot de passe
- Doit s'authentifier pour utiliser la plate-forme et l'API

`AuthToken` : Token d'autenfication associé à un utilisateur de la plate-forme
- Obtenu via un appel à l'API `/auth/login`
- Expire après un temps paramétrable
- est généré sous la forme d'un token JWT

`Publication` : Publication d'un auteur posté sur un réseau social

`Commentaire` : Commentaire posté par un auteur sur une publication

`Auteur`: Auteur d'une publication ou d'un commentaire

`Identité` : Identité d'un auteur sur un réseau social (pseudo et URL)