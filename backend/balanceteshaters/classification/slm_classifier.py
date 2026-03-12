import logging

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

from balanceteshaters.classification.category import AnnotatedCategory

logger = logging.getLogger(__name__)

CLASSIFICATION_PROMPT = (
    "Classifie le prompt de façon binaire selon s'il s'agit de "
    "cyberharcèlement ou non. Sois assez sensible, attention au "
    "sarcasme et aux emojis péjoratifs. Ne réponds qu'avec \"0\" "
    "pour un commentaire bénin ou \"1\" pour du cyberharcèlement."
)


class SLMClassifier:
    def __init__(self, model_name: str):
        logger.info("Loading SLM model: %s", model_name)
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        if self.tokenizer.pad_token is None:
            self.tokenizer.pad_token = self.tokenizer.eos_token
        self.model = AutoModelForCausalLM.from_pretrained(
            model_name, torch_dtype="auto", device_map="auto"
        )
        logger.info("SLM model loaded successfully")

    def classify(self, text: str) -> list[str]:
        messages = [
            {
                "role": "user",
                "content": f"{CLASSIFICATION_PROMPT} Prompt à classifier : {text}",
            }
        ]
        inputs = self.tokenizer.apply_chat_template(
            messages,
            add_generation_prompt=True,
            tokenize=True,
            return_dict=True,
            return_tensors="pt",
            enable_thinking=False,
        ).to(self.model.device)

        with torch.no_grad():
            outputs = self.model.generate(
                **inputs,
                max_new_tokens=200,
                do_sample=False,
                pad_token_id=self.tokenizer.pad_token_id,
            )

        decoded = self.tokenizer.decode(
            outputs[0][inputs["input_ids"].shape[-1] :], skip_special_tokens=True
        )
        output = decoded.strip()
        logger.debug("SLM raw answer for %r: %r", text[:80], output)

        if output.startswith("1"):
            return [AnnotatedCategory.CYBERHARCELEMENT_DEFINITION_GENERALE.value]
        return []
