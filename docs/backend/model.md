# Modèle de données

```mermaid
classDiagram
    class User {
        id: UUID
        email: str
        login: str
        password_hash: str
        display_name: str
        enabled: bool
        created_at: datetime
        updated_at: datetime
    }

    class AuthToken {
        jwt_token: str
        expires_at: datetime
        created_at: datetime
    }
    User "1" -- "0..n" AuthToken

    class Auteur {
        stat_nb_publications
        stat_nb_commentaires
    }

    class Identite {
        id: UUID
        nom_profil: str
        url_profil: str
        url_avatar: str
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
        texte: str
        horodatage_publication: datetime
        url: str
        horodatage_scraping: datetime
    }
    Identite "1" --> "0..n" Publication : est l'auteur de
    Publication "0..n" --> "1" ReseauSocial : publiée sur

    class Commentaire {
        id: UUID
        texte: str
        horodatage_commentaire: datetime
        url: str
        categorie: str
        scoring: float
        url_screenshot: str
        horodatage_scraping: datetime
    }

    Publication "1" *-- "0..n" Commentaire
    Identite "1" --> "0..n" Commentaire : est l'auteur de
    Commentaire "1" -- "0..n" Commentaire : réponses

    User "1" --> "0..n" Publication : suit
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