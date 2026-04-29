"""Shared model definitions for the ML fine-tuning scripts."""
import torch
import torch.nn as nn


class EmbeddingClassifier(nn.Module):
    """Wraps a SentenceTransformer encoder with a linear classification head."""

    def __init__(self, encoder, embed_dim: int, num_labels: int = 2, task: str | None = None, trainable_encoder: bool = False):
        super().__init__()
        self.encoder = encoder
        self.classifier = nn.Linear(embed_dim, num_labels)
        self.task = task
        self.trainable_encoder = trainable_encoder

    def forward(self, texts: list[str], labels: torch.Tensor | None = None):
        if self.trainable_encoder:
            # SentenceTransformer.forward() preserves the computation graph; encode() does not
            features = self.encoder.tokenize(texts)
            features = {k: v.to(self.classifier.weight.device) for k, v in features.items()}
            embeddings = self.encoder(features)["sentence_embedding"]
        else:
            encode_kwargs: dict = {"convert_to_numpy": True, "show_progress_bar": False}
            if self.task:
                encode_kwargs["task"] = self.task
            embeddings = torch.tensor(
                self.encoder.encode(texts, **encode_kwargs),
                dtype=torch.float32,
            ).to(self.classifier.weight.device)
        logits = self.classifier(embeddings)
        if labels is not None:
            loss = nn.CrossEntropyLoss()(logits, labels)
            return loss, logits
        return logits
