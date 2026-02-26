# Extension Navigateur Balance Tes Haters

Cette extension permet de capturer les commentaires depuis des publications des réseaux sociaux.

# Pour contribuer

Voir [./CONTRIBUTING.md](./CONTRIBUTING.md)

# Installer l'extension

(Pour installer en mode dev voir [./CONTRIBUTING.md](./CONTRIBUTING.md))

Pour installer depuis un zip:

- Télécharger le zip
  - Pour la dernière version de dev: https://github.com/dataforgoodfr/14_BalanceTesHaters/releases/download/extension-latest/bth-extension-0.0.0-chrome.zip
  - Les PR contiennent un lien vers un artifact de build
- Dézipper le fichier et copier le chemin vers le répertoire dézippé
- Ouvrir Google Chrome
- Accéder à la page "Extensions" en cliquant sur le menu "..." > "Extensions" > "Gérer les extensions":
- Activez le mode développeur en cliquant sur le bouton en haut à droite
- Cliquez sur le bouton "Charger l'extension non empaquetée", puis sélectionnez le répertoire où l'extension a été dézippée plus haut.
  ![Menu](doc/install-step1.png)
  ![Page gérer les extensions](doc/install-step2.png)

3. Épingler l'extension en cliquant sur le bouton puzzle puis sur l'épingle à côté de l'extension
   ![Epingler l'extension](doc/install-step3.png)

# Utiliser l'extension

## Faire une capture

1. Naviguer vers une publication pour laquelle une capture est supportée :
   - Pour YouTube il s'agit d'une vidéo avec une URL de la forme https://www.youtube.com/watch?v=videoid
   - Pour instagram il s'agit d'un post avec une url de la forme instagram.com/p/C56ZonItOfO/
2. Lancer la capture en cliquant sur le bouton de l'extension à coté de la barre d'adresse puis sur "Analyser ce post" dans la popup
   ![Analyser ce post](doc/analyser-post.png)

L'extension va alors piloter le tab en cours pour faire la capture.
Il ne faut pas redimensionner la page pendant la capture
Il n'y a pas pour le moment pas de feedback utilisateur sur l'avancé mais on voit la page bouger (a noter que parfois il y a des pauses mais ce n'est pas forcément terminé).
Une fois terminé vous pouvez voir les résultats dans Voir les résultats

## Voir les résultats

- Cliquer sur le bouton de l'extension à côté de la barre d'adresse puis sur "Voir les analyses précédentes" dans la popup
- Puis sur "Publications analysées" dans le side panel à gauche
