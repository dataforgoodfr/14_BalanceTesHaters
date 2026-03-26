import logging
import re

from llama_cpp import Llama

from balanceteshaters.classification.category import BinaryLabel

logger = logging.getLogger(__name__)

THINK_TAG_RE = re.compile(r"<think>.*?</think>", re.DOTALL)

CLASSIFICATION_PROMPT = """Classifie le commentaire de façon binaire selon s'il s'agit de cyberharcèlement ou non. Sois assez sensible, attention au sarcasme et aux emojis péjoratifs. Ne réponds qu'avec "0" pour un commentaire bénin ou "1" pour du cyberharcèlement."""

BATCH_CLASSIFICATION_PROMPT = """Classifie les commentaires suivants de façon binaire (0 pour bénin, 1 pour cyberharcèlement).
Réponds uniquement par les chiffres 0 ou 1 séparés par des virgules, sans aucun autre texte, dans l'ordre exact des commentaires fournis.
Exemple de réponse pour 3 commentaires : 0, 1, 0"""


class SLMClassifier:
    def __init__(self, model_path: str, n_threads: int, n_ctx: int):
        logger.info(
            "Loading GGUF model: %s (threads=%d, ctx=%d)", model_path, n_threads, n_ctx
        )
        self.llm = Llama(
            model_path=model_path,
            n_threads=n_threads,
            n_ctx=n_ctx,
            n_batch=512,
            verbose=False,
        )
        logger.info("GGUF model loaded successfully")

    def classify(self, text: str) -> list[str]:
        return self.classify_batch([text])[0]

    def classify_batch(self, texts: list[str]) -> list[list[str]]:
        if not texts:
            return []

        if len(texts) == 1:
            messages = [
                {
                    "role": "user",
                    "content": f"{CLASSIFICATION_PROMPT} Commentaire à classifier : {texts[0]} /no_think",
                }
            ]
            max_tokens = 16
        else:
            formatted_prompts = "\n".join(
                [f"{i + 1}. {text}" for i, text in enumerate(texts)]
            )
            messages = [
                {
                    "role": "user",
                    "content": f"{BATCH_CLASSIFICATION_PROMPT}\n\nCommentaires à classifier :\n{formatted_prompts}\n/no_think",
                }
            ]
            max_tokens = len(texts) * 4

        response = self.llm.create_chat_completion(
            messages=messages,
            max_tokens=max_tokens,
            temperature=0.0,
        )

        raw_output = response["choices"][0]["message"]["content"].strip()
        logger.debug("SLM raw answer: %r", raw_output)

        # Qwen3 wraps reasoning in <think>...</think>; strip it to get the answer
        output = THINK_TAG_RE.sub("", raw_output).strip()
        logger.debug("SLM output after stripping think tags: %r", output)

        if len(texts) == 1:
            digits = [ch for ch in reversed(output) if ch in ("0", "1")]
            answers = [digits[0] if digits else "0"]
        else:
            # Extract digits from comma/space/etc separated output
            answers = [
                d.strip()
                for d in re.split(r"[\s,]+", output)
                if d.strip() in ("0", "1")
            ]

        # If model failed to provide enough results, pad with "0" or truncate
        if len(answers) != len(texts):
            logger.warning(
                "Batch size mismatch: expected %d results, got %d. Adjusting...",
                len(texts),
                len(answers),
            )
            if len(answers) < len(texts):
                answers.extend(["0"] * (len(texts) - len(answers)))
            else:
                answers = answers[: len(texts)]

        final_results = []
        for answer in answers:
            if answer == "1":
                final_results.append(
                    [BinaryLabel.CYBERHARCELEMENT_DEFINITION_GENERALE.value]
                )
            else:
                final_results.append([BinaryLabel.ABSENCE_DE_CYBERHARCELEMENT.value])

        return final_results
