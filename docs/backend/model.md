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
        nom_profil
        url_profil
    }
    Identite "0..n" -- "1" ReseauSocial
    Identite "1..n" --* "1" Auteur

    class ReseauSocial {
        <<Enumeration>>
        YOUTUBE
        INSTAGRAM
        TIKTOK
        ...
    }
    class Publication {
        texte
        horodatage_publication
        url
        horodatage_scraping
    }
    Auteur "0..1" --> "0..n" Publication : est l'auteur de
    Publication "0..n" --> "1" ReseauSocial : publiée sur

    class Commentaire {
        texte
        horodatage_commentaire
        url
        categorie
        scoring
        url_screenshot
        horodatage_scraping
    }

    Publication "1" *-- "0..n" Commentaire
    Auteur "1" --> "0..n" Commentaire : est l'auteur de
    Commentaire "1" -- "0..n" Commentaire : réponses

    User "1" --> "0..n" Publication : surveille
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