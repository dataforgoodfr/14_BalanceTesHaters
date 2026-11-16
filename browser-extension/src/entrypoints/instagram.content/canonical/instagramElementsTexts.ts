export const LIKES_BUTTON_REGEX =
  /(?<nbLikes>[0-9]*)(?:\u00a0J\u2019aime| like[s]?)/m;

export const VIEW_REPLIES_BUTTON_TEXT_REGEX =
  /Voir les .* réponses|View all .* replies|Afficher plus de réponses|View more replies/;
export const HIDE_REPLIES_BUTTON_TEXT_REGEX =
  /Masquer (?:toutes )?les réponses|Hide (?:all )?replies/;
// TODO handle instagram elements localisations in english
export const SHOW_HIDDEN_COMMENTS_REGEX =
  /Voir les commentaires masqués|View hidden comments/;
export const REPLY_BUTTON_REGEX = /Répondre|Reply/;
export const MASQUES_LES_COMMENTAIRES_BUTTON_REGEX =
  /Masqués par Instagram|Hidden by Instagram/;
export const FB_COMMENTS_TEXT_REGEX =
  /^(?:Ce reel compte\s+)?(?<count>[0-9][0-9,.\s]*(?:[KM])?)\s+(?:commentaires? sur Facebook|comments? (?:from|on) Facebook)\.?$/i;

export const COMMENTS_SORT_BUTTON_TEXT_REGEX =
  /^(Pour vous|For you|Les plus pertinents|Most relevant|Les plus récents|Most recent)$/;
export const MOST_RECENT_COMMENTS_TEXT_REGEX =
  /^(Les plus récents|Most recent)$/;
