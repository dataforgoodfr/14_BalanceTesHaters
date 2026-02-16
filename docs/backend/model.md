# Modèle de données

```mermaid
classDiagram
    class Author {
        name: str
        account_href: str
    }

    class ClassificationJob {
        id: UUID
        title: str
        textContent?: str
    }

    Author "1" --> "0..n" ClassificationJob : publish
    class Comment {
        id: UUID
        text_content: str
        classification: list[str]
        classified_at: datetime
    }

    ClassificationJob "1" *-- "0..n" Comment : comments
    Author "1" --> "0..n" Comment
    Comment "1" -- "0..n" Comment : replies


```

`Post` : Publication d'un auteur posté sur un réseau social

`Comment` : Commentaire posté par un auteur sur une publication

`Author`: Auteur d'une publication ou d'un commentaire