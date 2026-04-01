# Authentification

L'API nécessite un API tokentransmis en header : 
`x-token: <token value`

*Note :*
Ce jeton n'est pas strictement un secret car il est intégré dans les artefacts de l'extension, mais c'est un moyen simple de réduire l'utilisation d'API en dehors de l'extension aux personnes ayant connaissance de l'extension...
Nous pourrons faire évoluer cela à l'avenir si on met en place une authentification des utilisateurs de l'extension.
Voir https://mattermost.services.dataforgood.fr/data-for-good/pl/4mc7gjz4opyybqahrm3nr4cyny pour plus de contexte.

# `POST /classification`

Soumet au backend un Job de classification d'un post et de ses commentaires

## Requête 
```mermaid
classDiagram
    class Author {
        name: str
        account_href: str
    }

    class ClassificationJob {
        title?: str
        text_content?: str
        comments: dict[str, Comment]
    }
    Author "1" <-- "0..n" ClassificationJob : author

    class Comment {
        id: UUID
        text_content: str
        replies: dict[str, Comment]
    }
    Author "1" <-- "0..n" Comment : author
    Comment "1" -- "0..n" Comment : replies
```

Exemple: 
```
{
    "text_content": "⚡️⚡️⚡️LA @barbarabutch ⚡️⚡️⚡️au @petitpalais_musee (!) pour @carambaculturelive ❤️🌈 \"chez Barbara\" le 28 novembre au Petit Palais en partenariat avec @hbomaxfr Merci @viemorgane 🥰🐼 MUA @julieau_makeup.n.paintStylism @appellemoisarah Hair @yann.fontaine.coiffure",
    "author": {
        "name": "lynnnsk",
        "account_href": "https://www.instagram.com/lynnnsk/"
    },
    "comments": {
        "0698ce2e-2716-7d7e-8000-5f7481c5d55a": {
            "text_content": "😍💓",
            "author": {
                "name": "julieau_makeup.n.paint",
                "account_href": "https://www.instagram.com/julieau_makeup.n.paint/"
            }
        },
        "0698ce2e-2716-7e37-8000-a9362feb377d": {
            "text_content": "Super vidéo",
            "author": {
                "name": "gros.lourd",
                "account_href": "https://www.instagram.com/gros.lourd/"
            },
            "replies": {
                "0698ce2e-2716-7e69-8000-f012d86bb1b4": {
                    "text_content": "Ouai, génial !!",
                    "author": {
                        "name": "petit.lapin",
                        "account_href": "https://www.instagram.com/petit.lapin/"
                    }
                }
            }
        }
    }
}
```

## Réponse

Identifiant unique du job soumis au backend

```mermaid
classDiagram
    class Reponse {
        job_id: uuid
    }
```

Exemple:
```
{'job_id': '0698ce2e-2708-7030-8000-2a4bac70cb66'}
```
# `GET /classification/{job_id}`

Interroge le backend pour connaitre le statut et le résultat d'un job de classification.

## Requête

`job_id` : identifiant du job à interrogé

## Réponse

```mermaid
classDiagram
    class ClassificationJob {
        id: str
        status: str
        comments: dict[str, Comment]
    }
    Author "1" <-- "0..n" ClassificationJob : author

    class Comment {
        classification: list[str]
        classified_at: datetime
    }
    Author "1" <-- "0..n" Comment : author
    Comment "1" -- "0..n" Comment : replies
```

`status` peut avoir les valeurs:
 - `SUBMITTED`: le job vient d'être soumis au backend et pas encore traité
 - `IN_PROGRESS`: classification en cours
 - `COMPLETED` / `FAILED` : la classification est terminé en succès / en échec.

Exemple: 
```
{
    "id": "0698cee8-dce2-79a5-8000-3bed6b870158",
    "status": "COMPLETED",
    "comments": {
        "0698ce2e-2716-7d7e-8000-5f7481c5d55a": {
            "classification": ["Catégorie 1"],
            "classified_at": "2026-02-11T19:54:10.920Z"
        }
        "0698ce2e-2716-7e37-8000-a9362feb377d": {
            "classification": ["Catégorie 2", "Catégorie 3"],
            "classified_at": "2026-02-11T19:54:10.920Z"
        },
        "0698ce2e-2716-7e69-8000-f012d86bb1b4": {
            "classification": [],
            "classified_at": "2026-02-11T19:54:10.920Z"
        }

    }
}
```

