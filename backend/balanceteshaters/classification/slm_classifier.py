import logging
import re

from llama_cpp import Llama

from balanceteshaters.classification.category import BinaryLabel

logger = logging.getLogger(__name__)

THINK_TAG_RE = re.compile(r"<think>.*?</think>", re.DOTALL)

CLASSIFICATION_PROMPT = """Classifie le prompt de façon binaire selon s'il s'agit de cyberharcèlement ou non. Sois assez sensible, attention au sarcasme et aux emojis péjoratifs. Ne réponds qu'avec "0" pour un commentaire bénin ou "1" pour du cyberharcèlement."""


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
            return [BinaryLabel.CYBERHARCELEMENT_DEFINITION_GENERALE.value]
        return [BinaryLabel.ABSENCE_DE_CYBERHARCELEMENT.value]
