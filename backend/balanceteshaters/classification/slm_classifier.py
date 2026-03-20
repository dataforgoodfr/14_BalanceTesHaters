import logging
import re

from llama_cpp import Llama

from balanceteshaters.classification.category import BinaryLabel

logger = logging.getLogger(__name__)

THINK_TAG_RE = re.compile(r"<think>.*?</think>", re.DOTALL)

CLASSIFICATION_PROMPT = """Tu vas recevoir des commentaires provenants des réseaux sociaux (commentaires de vidéos Youtube, par exemple). Le but est de classifier ces commentaires pour savoir s'ils constituent ou non du cyberharcèlement.

Tu recevras un exemple de commentaire et ton rôle sera de proposer une classe : tu répondras "0" si le commentaire n'est pas du cyberharcèlement, "1" si le commentaire est du cyberharcèlement. Tu ne répondras rien d'autre que 1 ou 0. 

A prendre en compte : si le commentaire semble ironique, sarcastique, cela peut être compté comme du cyberharcèlement si cela dénigre une personne. Les emojis péjoratifs sont aussi potentiellement du cyberharcèlement s'ils participent à dénigrer quelqu'un. 

Par exemple (tu trouveras justement des exemples d'ironie ou d'emojis qui sont déjà du cyberharcèlement car ils semblent dénigrer la personne à qui ils s'adressent):
- 💩 : 1
- 🐒 : 1
- ❤️ : 0
- Tu es grosse : 1
- Belle vidéo ! : 0
- Qu'est-ce qu'il est intelligent… : 1
- J'adore cette vidéo… Merci : 0
- Va te f**** : 1
- Répugnant : 1
- Bravo : 0
- Que Dieu te guide… : 1
- Tu es incroyable ! 0
- On t'aime ! 0


Explication des exemples (Ces explications sont faites pour t'aider, tu ne dois pas en fournir dans tes réponses):
- L'emoji 💩 dans le contexte d'un commentaire sur un réseau social sous-entend que le contenu est "merdique", ce qui peut constituer du cyberharcèlement.
- L'emoji 🐒 sous-entend souvent "tu es un singe" pour dire "ce que tu as dit est bête", donc c'est dénigrant 
- L'emoji ❤️ est bienveillant
- 'Tu es grosse' est une attaque et dénigrent la personne concernée
- 'Belle vidéo' est positif, glorifiant
- 'Qu'est-ce qu'il est intelligent…' est un exemple d'ironie/sarcasme, à cause des '...' qui dans ce contexte rendent le ton négatif, dénigrant
- 'J'adore cette vidéo… Merci' Il y a trois petits points mais ici le ton global est positif
- 'Va te f****' : L'insulte est masquée par les ***, mais le commentaire veut dire "Va te faire foutre", ce qui est clairement dénigrant
- 'Répugnant' : Clairement dénigrant
- 'Bravo' : Positif 
- 'Que Dieu te guide...' : la phrase à elle seule semble indiquer que la personne est "égarée", ce qui est déjà dénigrant, et les '...' rajoute un ton négatif.
- 'Tu es incroyable' est très positif et aucune ponctuation n'indique un ton ironique 
- 'On t'aime !' est également dit de façon positive, encore plus avec la ponctuation'!' 

Ne Réponds qu'avec "0" pour un commentaire bénin ou "1" pour du cyberharcèlement."""


class SLMClassifier:
    def __init__(self, model_path: str, n_threads: int, n_ctx: int):
        logger.info("Loading GGUF model: %s (threads=%d, ctx=%d)", model_path, n_threads, n_ctx)
        self.llm = Llama(
            model_path=model_path,
            n_threads=n_threads,
            n_ctx=n_ctx,
            n_batch=512,
            verbose=False,
        )
        logger.info("GGUF model loaded successfully")

    def classify(self, text: str) -> list[str]:
        messages = [
            {
                "role": "user",
                "content": f"{CLASSIFICATION_PROMPT} Prompt à classifier : {text} /no_think",
            }
        ]

        response = self.llm.create_chat_completion(
            messages=messages,
            max_tokens=16,
            temperature=0.0,
        )

        raw_output = response["choices"][0]["message"]["content"].strip()
        logger.debug("SLM raw answer for %r: %r", text[:80], raw_output)

        # Qwen3 wraps reasoning in <think>...</think>; strip it to get the answer
        output = THINK_TAG_RE.sub("", raw_output).strip()
        logger.debug("SLM output after stripping think tags: %r", output)

        digits = [ch for ch in reversed(output) if ch in ("0", "1")]
        answer = digits[0] if digits else "0"
        logger.debug("SLM parsed answer: %s", answer)

        if answer == "1":
            return [BinaryLabel.HARCELEMENT.value]
        return [BinaryLabel.ABSENCE_DE_CYBERHARCELEMENT.value]
