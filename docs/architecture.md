```mermaid
C4Context
    Person(Utilisateur , "Utilisateur")    
    System_Boundary(c1, "Balance Tes Haters") {
        Container_Boundary(chrome,"Navigateur chrome") {
            Container(browserTab, "Onglet de navigation", "Post Instagram, Youtube")
            Container(web_extension, "Extension navigateur")
            ContainerDb(db_local, "Stockage local", "JSON")
        }
        Container_Boundary(c2, "Backend") {
            Container(llm, "LLM ?")
            Container(backend, "API Backend", "Python, FastAPI")
            ContainerDb(db, "Base de données", "PostgreSQL")
        }
    }

    Rel(Utilisateur, web_extension, "déclenche")
    Rel(web_extension, backend, "Appelà l'API de classification", "HTTPS")
    Rel(backend, db, "Statistiques", "SQL")
    Rel(web_extension, browserTab, "Scraping", "TypeScript")
    Rel(web_extension, db_local, "Stockage des publications", "JSON")
    Rel(backend, llm, "Classifie", "prompt")
```

# Composants du système

_Extension navigateur_ : WebExtension chrome
 - Extension chrome de scraping des données des publications
 - Sur déclenchement de l'utilisateur : analyse l'onglet courant pour rechercher l'ensemble des commentaires d'une publication Instagrame, Youtube
 - les données scrapées sont transmises au backend via l'API d'analyse
 - le résultat est stocké en stockage local et utilisé par l'extension pour générer un rapport d'analyse

_Stockage local_ : Stockage de l'historique des publications analysées dans le navigateur
 - utilise l'[API de stockage du navigateur](https://developer.chrome.com/docs/extensions/reference/api/storage?hl=fr)

_API Backend_ : Composant serveur
 - fournit le service API d'analyse des publications (analyse et classification LLM des commentaires, statistiques, ...)

_Base de données_ : Stockage des données selon le [modèle](./backend/model.md).

_LLM_ : Composant en charge de l'exécution des traitements de classification

