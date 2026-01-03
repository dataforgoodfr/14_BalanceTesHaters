# Modèle de données pour le stockage côté client (Extension navigateur)

## Schéma
```mermaid
classDiagram
    class Publication {
        url: str
        date_publication: datetime
        horodatage_capture: datetime
        texte_publication: str
    }
    
    class Auteur {
        pseudo: str
        url: str
    }

    class Commentaire {
        texte_commentaire: str
        date_commentaire: str | datetime
        date_relative: bool
        screenshot: str
        horodatage_screenshot: datetime
        classification: list[str]
        horodatage_classification: datetime
    }

    class ReseauSocial {
        <<enumeration>>
        YOUTUBE
        INSTAGRAM
        TIKTOK
        ...
    }

    Publication "1..n" -- "1" Auteur
    Publication "0..n" -- "1" ReseauSocial
    Publication "1" -- "0..n" Commentaire
    Commentaire "1..n" -- "1" Auteur
    Commentaire "1" -- "0..n" Commentaire : réponses
```

## Exemple

```
{
    "publications:" [
        {
            "url": "https://www.instagram.com/p/DRTE4OmAvUN/",
            "reseau_social": "INSTAGRAM",
            "horodatage_capture": "2026-01-03T14:52:01.000Z",
            "date_publication": "2025-11-21T05:04:01.000Z",
            "texte_publication": "⚡️⚡️⚡️LA @barbarabutch ⚡️⚡️⚡️au @petitpalais_musee (!) pour @carambaculturelive ❤️🌈 \"chez Barbara\" le 28 novembre au Petit Palais en partenariat avec @hbomaxfr Merci @viemorgane 🥰🐼 MUA @julieau_makeup.n.paintStylism @appellemoisarah Hair @yann.fontaine.coiffure",
            "auteur": {
                "pseudo": "lynnnsk",
                "url": "https://www.instagram.com/lynnnsk/"
            },
            "commentaires: [
                {
                    "texte_commentaire": "😍💓",
                    "date_commentaire": "2025-11-21T07:21:06.000Z",
                    "date_relative": "false",
                    "screenshot": "<PNG encodé base64>"
                    "horodatage_screenshot": "2026-01-03T14:52:01.000Z"
                    "auteur": {
                        "pseudo": "julieau_makeup.n.paint",
                        "url": "https://www.instagram.com/julieau_makeup.n.paint/"
                    },
                    "classification": ["A caractère sexuel", "Injures et diffamation"]
                    "horodatage_classification: "2026-01-03T15:52:01.000Z"
                },
                ...
            ],
        },
        {
            "url": "https://www.youtube.com/...",
            "reseau_social": "YOUTUBE",
            "date_scraping": "2026-01-03T14:52:01.000Z",
            "date_publication": "2026-01-03T02:18:01.000Z",
            "commentaires: [
                {
                    "texte_commentaire": "Super vidéo !",
                    "date_commentaire": "Il y a 1 jour",
                    "date_relative": "true",
                    "screenshot": "<PNG encodé base64>"
                },
        }
    ],
    "config": {
        "url_backend": "https://balances.tes.haters/api/"
    }
}
```