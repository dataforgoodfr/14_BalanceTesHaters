# Modèle de données

```mermaid
classDiagram
    class Author {
        name: str
        account_href: str
    }

    class SocialNetwork {
        <<enumeration>>
        YOUTUBE
        INSTAGRAM
        TIKTOK
        ...
    }
    class Post {
        id: UUID
        url: str
        published_at: str
        scraped_at: datetime
        text_content: str
        post_id: str;
        title?: str;
    }
    Author "1" --> "0..n" Post : publish
    Post "0..n" --> "1" SocialNetwork : posted on

    class Comment {
        id: UUID
        text_c_ontent: str
        published_at: str
        scraped_at: datetime
        screenshot_data: str
        classification: list[str]
        classified_at: datetime
        nb_likes: int
    }

    Post "1" *-- "0..n" Comment
    Author "1" --> "0..n" Comment : post
    Comment "1" -- "0..n" Comment : replies
```

`Post` : Publication d'un auteur posté sur un réseau social

`Comment` : Commentaire posté par un auteur sur une publication

`Author`: Auteur d'une publication ou d'un commentaire