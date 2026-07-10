export const POST_DETAIL_CSV_COLUMNS = [
  {
    key: "post_last_analysis_at",
    label: "Date de dernière collecte de la publication",
  },
  {
    key: "post_last_analysis_at_raw_utc",
    label: "Date de dernière collecte (UTC brut)",
  },
  { key: "social_network", label: "Plateforme" },
  { key: "social_network_code", label: "Plateforme (code)" },
  { key: "post_id", label: "Identifiant de la publication" },
  { key: "post_url", label: "URL de la publication" },
  { key: "post_title", label: "Titre de la publication" },
  { key: "post_author", label: "Auteur de la publication" },
  { key: "post_published_at", label: "Date de publication" },
  {
    key: "post_published_at_source_text",
    label: "Date de publication (texte source plateforme)",
  },
  { key: "post_published_at_type", label: "Type de date de publication" },
  {
    key: "post_published_at_raw_start_utc",
    label: "Date publication brute début (UTC)",
  },
  {
    key: "post_published_at_raw_end_utc",
    label: "Date publication brute fin (UTC)",
  },
  { key: "comment_id", label: "Identifiant du commentaire" },
  { key: "comment_author", label: "Auteur du commentaire" },
  { key: "comment_published_at", label: "Date du commentaire" },
  {
    key: "comment_published_at_source_text",
    label: "Date du commentaire (texte source plateforme)",
  },
  { key: "comment_published_at_type", label: "Type de date du commentaire" },
  {
    key: "comment_published_at_raw_start_utc",
    label: "Date commentaire brute début (UTC)",
  },
  {
    key: "comment_published_at_raw_end_utc",
    label: "Date commentaire brute fin (UTC)",
  },
  { key: "comment_text", label: "Commentaire" },
  {
    key: "comment_classification",
    label: "Catégorie(s) de cyberharcèlement détectée(s)",
  },
  {
    key: "comment_classification_raw",
    label: "Catégorie(s) détectée(s) (brut)",
  },
  {
    key: "comment_classified_at",
    label: "Date de classification du commentaire",
  },
  {
    key: "comment_classified_at_raw_utc",
    label: "Date de classification (UTC brut)",
  },
  {
    key: "comment_screenshot_available",
    label: "Capture d'écran disponible",
  },
  { key: "comment_is_deleted", label: "Commentaire supprimé" },
  { key: "comment_is_new", label: "Commentaire nouveau" },
] as const;