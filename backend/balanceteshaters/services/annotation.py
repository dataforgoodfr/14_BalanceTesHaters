import logging
import string
import unicodedata
from enum import Enum
from typing import Any

from balanceteshaters.services.nocodb import NocoDBService
from lingua import LanguageDetectorBuilder
from pydantic import BaseModel, Field


class AnnotatedCategory(Enum):
    ABSENCE_DE_CYBERHARCELEMENT = "Absence de cyberharcèlement"
    CYBERHARCELEMENT_DEFINITION_GENERALE = "Cyberharcèlement (définition générale)"
    CYBERHARCELEMENT_AUTRE = "Cyberharcèlement (autre)"
    CYBERHARCELEMENT_A_CARACTERE_SEXUEL = "Cyberharcèlement à caractère sexuel"
    MENACES = "Menaces"
    INCITATION_AU_SUICIDE = "Incitation au suicide"
    INJURE = "Injure"
    DIFFAMATION = "Diffamation"
    INJURE_ET_DIFFAMATION_PUBLIQUE = "Injure et diffamation publique"
    DOXXING = "Doxxing"
    INCITATION_A_LA_HAINE = "Incitation à la haine"
    SUSPECT = "Suspect"


class BinaryConfidence(Enum):
    LOW_CONFIDENCE = "0 low confidence"
    HIGH_CONFIDENCE = "1 high confidence"


class CategoryConfidence(Enum):
    LOW_CONFIDENCE = "0 low confidence"
    HIGH_CONFIDENCE = "1 high confidence"


class Sentiment(Enum):
    NEGATIVE = "Negative"
    NEUTRAL = "Neutral"
    POSITIVE = "Positive"


class Annotation(BaseModel):
    id: int = Field(..., description="ID from NocoDB")
    # FIXME: add CreatedAt and UpdatedAt
    comment: str = Field(..., description="Comment text")
    annotated_category: list[AnnotatedCategory] | None = Field(
        None, description="Category that was chosen to annotate this comment"
    )
    binary_confidence: BinaryConfidence | None = Field(
        None,
        description="Confidence level about whether this comment should be reported"
    )
    category_confidence: CategoryConfidence | None = Field(
        None,
        description="Confidence level of the assigner when choosing `annotated_category`",
    )
    sentiment: Sentiment | None = Field(
        None,
        description="Sentiment expressed in the comment (optional)"
    )
    binary_label: bool | None = Field(
        None,
        description="Target binary label (computed from the other fields)"
    )
    comment_id: str | None = Field(
        None,
        description="Comment ID (if provided)"
    )


class AnnotationService:
    def __init__(self, nocodb: NocoDBService, annotation_table_id: str):
        self.annotation_table_id = annotation_table_id
        self.nocodb = nocodb
        self.logger = logging.getLogger(
            f"{__name__}.{self.__class__.__name__}",
        )

    def get_annotations(self, limit: int = 25) -> list[Annotation]:
        response_dict = self.nocodb.get_records(
            table_id=self.annotation_table_id, limit=limit
        )

        if "records" not in response_dict:
            raise ValueError("No record found in response")

        annotations = []
        records: list[dict[str, Any]] = response_dict["records"]
        for r in records:
            record = {}
            record["Id"] = r["id"]
            record = record | r["fields"]
            annotation = Annotation.model_validate(record)
            annotations.append(annotation)

        return annotations

    def build_where_clause(
        self,
        annotation_category_filter: list[AnnotatedCategory] | str | None = None,
        binary_confidence_filter: list[BinaryConfidence] | str | None = None,
    ) -> str | None:
        """Build NocoDB WHERE clause from filters."""

        if isinstance(annotation_category_filter, str):
            assert annotation_category_filter == "all", "The only accepted string value for annotation_category_filter is 'all'"
            annotation_category_filter = [category for category in AnnotatedCategory]

        if isinstance(binary_confidence_filter, str):
            assert binary_confidence_filter == "all", "The only accepted string value for binary_confidence_filter is 'all'"
            binary_confidence_filter = [category for category in BinaryConfidence]

        if (
            annotation_category_filter is not None
            and binary_confidence_filter is not None
        ):
            return f"(annotated_category,anyof,{','.join(f"'{category.value}'" for category in annotation_category_filter)})~and((binary_confidence,anyof,{','.join(confidence.value for confidence in binary_confidence_filter)})"
        elif annotation_category_filter is not None:
            return f"(annotated_category,anyof,{','.join(f"'{category.value}'" for category in annotation_category_filter)})"
        elif binary_confidence_filter is not None:
            return f"(binary_confidence,anyof,{','.join(f"'{confidence.value}'" for confidence in binary_confidence_filter)}"
        return None

    def fetch_records_paginated(
        self, where_clause: str | None = None, limit: int = 1000
    ) -> list[Annotation]:
        """
        Fetch all records from the table with pagination.

        Args:
            fields: List of field names to fetch (e.g., ["Id", "comment"])
            where_clause: Optional WHERE clause for filtering
            limit: Number of records per page (default: 1000)

        Returns:
            List of annotation records
        """
        all_annotations = []
        offset = 0

        while True:
            # FIXME: This part is very similar to get_annotations
            response_dict = self.nocodb.get_records(
                table_id=self.annotation_table_id,
                where_str=where_clause,
                offset=offset,
                limit=limit,
            )

            if "records" not in response_dict:
                break

            records: list[dict[str, Any]] = response_dict["records"]
            if not records:
                break

            new_annotations = []
            for record in records:
                if "fields" in record and record["fields"] is not None:
                    if "comment" not in record["fields"] or record["fields"]["comment"] is None:
                        self.logger.warning(f"Ignoring this record because it lacks the field 'comment': {record}")
                        continue

                    record_dict = {}
                    record_dict["id"] = record["id"]
                    record_dict = record_dict | record["fields"]
                    annotation = Annotation.model_validate(record_dict)
                    new_annotations.append(annotation)

            all_annotations.extend(new_annotations)

            # Check if there are more pages
            next_url = response_dict.get("next")
            if next_url is not None:
                offset += limit
            else:
                break

        return all_annotations

    def detect_text_language(self, text: str, detector) -> str:
        """
        Detect the language of a text string.

        Args:
            text: The text to analyze
            detector: The lingua language detector instance

        Returns:
            Language code or special category:
            - Language ISO code (e.g., 'fr', 'en')
            - 'too_short_for_detection': for very short text or mostly symbols
            - 'unknown': when language cannot be detected
        """
        text_stripped = text.strip()

        # Check if text is too short or mostly symbols
        symbol_proportion = self.calculate_symbol_proportion(text_stripped)
        tokens = text_stripped.split()

        if len(tokens) < 3 or symbol_proportion > 0.5:
            return "too_short_for_detection"

        # Detect language using lingua
        detected_language = detector.detect_language_of(text_stripped)
        if detected_language is None:
            return "unknown"

        return detected_language.iso_code_639_1.name.lower()

    def calculate_language_stats(
        self, language_counts: dict[str, int], empty_count: int
    ) -> dict[str, dict[str, Any]]:
        """
        Calculate percentages and format language statistics.

        Args:
            language_counts: Dictionary mapping language codes to counts
            empty_count: Number of empty/missing values

        Returns:
            Dictionary with language codes as keys and stats (count, percentage) as values
        """
        total_records = sum(language_counts.values()) + empty_count
        result: dict[str, dict[str, Any]] = {}

        for language, count in language_counts.items():
            percentage = (
                round((count / total_records * 100), 2) if total_records > 0 else 0
            )
            result[language] = {"count": count, "percentage": percentage}

        # Add empty values as a category
        if empty_count > 0:
            empty_percentage = (
                round((empty_count / total_records * 100), 2)
                if total_records > 0
                else 0
            )
            result["empty"] = {"count": empty_count, "percentage": empty_percentage}

        return result

    def count_annotations(
        self,
        annotation_category_filter: list[AnnotatedCategory]
        | None = None,  # FIXME: allow to filter rows for which no category is defined
        binary_confidence_filter: list[CategoryConfidence] | None = None,
    ) -> int:
        where_string = self.build_where_clause(
            annotation_category_filter, binary_confidence_filter
        )
        self.nocodb.count_records(
            table_id=self.annotation_table_id, where_str=where_string
        )

        count = self.nocodb.count_records(
            table_id=self.annotation_table_id, where_str=where_string
        )
        return count

    def count_languages(
        self,
        annotation_category_filter: list[AnnotatedCategory] | None = None,
        binary_confidence_filter: list[CategoryConfidence] | None = None,
    ) -> dict[str, dict[str, Any]]:
        """
        Detect the language of text in each row and return statistics.

        Returns:
            Dictionary with language codes as keys and stats as values.
            Each stat contains 'count' (number of rows) and 'percentage'.
            Includes special categories:
            - 'too_short_for_detection': for very short text or mostly symbols
            - 'empty': for empty or missing values
            - 'unknown': when language cannot be detected
        """
        # Build where clause for filters
        where_clause = self.build_where_clause(
            annotation_category_filter, binary_confidence_filter
        )

        # Fetch all records with pagination
        records = self.fetch_records_paginated(
            where_clause=where_clause
        )

        # Initialize language detector
        detector = LanguageDetectorBuilder.from_all_languages().build()

        # Count languages
        language_counts: dict[str, int] = {}
        empty_count = 0

        for record in records:
            if not record.comment:
                empty_count += 1
                continue

            text = record.comment
            language_key = self.detect_text_language(text, detector)
            language_counts[language_key] = language_counts.get(language_key, 0) + 1

        # Calculate and return statistics
        return self.calculate_language_stats(language_counts, empty_count)

    def is_symbol(self, char: str) -> bool:
        """Check if a character is a symbol (emoji, punctuation, etc.)"""
        # Check if it's punctuation
        if char in string.punctuation:
            return True

        # Check if it's an emoji or symbol using unicode category
        # As seen here https://www.unicode.org/reports/tr44/tr44-34.html#General_Category_Values
        # P	refers to Punctuations
        # S	to Symbols

        category = unicodedata.category(char)
        return category.startswith("S") or category.startswith("P")

    def calculate_symbol_proportion(self, text: str) -> float:
        """Calculate the proportion of symbols (emoji, punctuation) in text"""
        if not text:
            return 0.0

        symbol_count = sum(1 for char in text if self.is_symbol(char))
        return symbol_count / len(text)
