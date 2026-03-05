import string
import unicodedata
from enum import Enum
from typing import Any

from balanceteshaters.classification.category import AnnotatedCategory
from balanceteshaters.services.nocodb import NocoDBService
from lingua import LanguageDetectorBuilder
from pydantic import BaseModel, Field, model_validator


class AnnotationConfidence(Enum):
    LOW_CONFIDENCE = "0 (no confidence / high doubt)"
    HIGH_CONFIDENCE = "1 (high confidence / no doubt)"


class Annotation(BaseModel):
    id: int = Field(..., description="ID from NocoDB")
    # FIXME: add CreatedAt and UpdatedAt
    comment: str = Field(..., description="Comment text")
    original_file_name: str | None = Field(
        None, description="Name of the file from which this comment was imported"
    )

    annotated_category: list[AnnotatedCategory] | None = Field(
        None, description="Category that was chosen to annotate this comment"
    )
    annotation_confidence: AnnotationConfidence | None = Field(
        None,
        description="Confidence level of the assigner when choosing `annotated_category`",
    )
    comment_translation: str | None = Field(
        None, description="Translation in french of the comment (when applicable)"
    )
    original_category: str | None = Field(
        None, description="Category that was assigned in the original file"
    )

    @model_validator(mode="before")
    @classmethod
    def parse_id(cls, data: Any) -> Any:
        if "Id" not in data:
            raise ValueError("Missing field 'Id'")
        # Rename 'Id' to 'id'
        data["id"] = data["Id"]
        del data["Id"]

        return data


class AnnotationService:
    def __init__(self, nocodb: NocoDBService, annotation_table_id: str):
        self.annotation_table_id = annotation_table_id
        self.nocodb = nocodb

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
        annotation_category_filter: list[AnnotatedCategory] | None = None,
        annotation_confidence_filter: list[AnnotationConfidence] | None = None,
    ) -> str | None:
        """Build NocoDB WHERE clause from filters."""
        if (
            annotation_category_filter is not None
            and annotation_confidence_filter is not None
        ):
            return f"(annotated_category,anyof,{','.join(f"'{category.value}'" for category in annotation_category_filter)})~and((annotation_confidence,anyof,{','.join(confidence.value for confidence in annotation_confidence_filter)})"
        elif annotation_category_filter is not None:
            return f"(annotated_category,anyof,{','.join(f"'{category.value}'" for category in annotation_category_filter)})"
        elif annotation_confidence_filter is not None:
            return f"(annotation_confidence,anyof,{','.join(f"'{confidence.value}'" for confidence in annotation_confidence_filter)}"
        return None

    def fetch_records_paginated(
        self, fields: list[str], where_clause: str | None = None, limit: int = 1000
    ) -> list[dict[str, Any]]:
        """
        Fetch all records from the table with pagination.

        Args:
            fields: List of field names to fetch (e.g., ["Id", "comment"])
            where_clause: Optional WHERE clause for filtering
            limit: Number of records per page (default: 1000)

        Returns:
            List of all records matching the criteria
        """
        all_records = []
        offset = 0

        while True:
            response_dict = self.nocodb.get_records(table_id=self.annotation_table_id)

            if "list" not in response_dict:
                break

            records: list[dict[str, Any]] = response_dict["list"]
            if not records:
                break

            all_records.extend(records)

            # Check if there are more pages
            page_info = response_dict.get("pageInfo", {})
            if not page_info.get("isLastPage", True):
                offset += limit
            else:
                break

        return all_records

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
        annotation_confidence_filter: list[AnnotationConfidence] | None = None,
    ) -> int:
        where_string = self.build_where_clause(
            annotation_category_filter, annotation_confidence_filter
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
        text_field: str = "comment",
        annotation_category_filter: list[AnnotatedCategory] | None = None,
        annotation_confidence_filter: list[AnnotationConfidence] | None = None,
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
            annotation_category_filter, annotation_confidence_filter
        )

        # Fetch all records with pagination
        records = self.fetch_records_paginated(
            fields=["Id", text_field], where_clause=where_clause
        )

        # Initialize language detector
        detector = LanguageDetectorBuilder.from_all_languages().build()

        # Count languages
        language_counts: dict[str, int] = {}
        empty_count = 0

        for record in records:
            if text_field not in record or not record[text_field]:
                empty_count += 1
                continue

            text = record[text_field]
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
