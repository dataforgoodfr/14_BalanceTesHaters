import argparse
import os
import string
import unicodedata
from enum import Enum
from typing import Any

import requests
from lingua import LanguageDetectorBuilder
from pydantic import BaseModel, Field, model_validator


def is_symbol(char: str) -> bool:
    """Check if a character is a symbol (emoji, punctuation, etc.)"""
    # Check if it's punctuation
    if char in string.punctuation:
        return True
    
    # Check if it's an emoji or symbol using unicode category
    # As seen here https://www.unicode.org/reports/tr44/tr44-34.html#General_Category_Values 
    # P	refers to Punctuations
    # S	to Symbols

    category = unicodedata.category(char)
    return category.startswith('S') or category.startswith('P')


def calculate_symbol_proportion(text: str) -> float:
    """Calculate the proportion of symbols (emoji, punctuation) in text"""
    if not text:
        return 0.0
    
    symbol_count = sum(1 for char in text if is_symbol(char))
    return symbol_count / len(text)


class AnnotatedCategory(Enum):
    ABSENCE_DE_CYBERHARCELEMENT = "Absence de cyberharcèlement"
    CYBERHARCELEMENT_DEFINITION_GENERALE = "Cyberharcèlement (définition générale)"
    CYBERHARCELEMENT_A_CARACTERE_SEXUEL = "Cyberharcèlement à caractère sexuel"
    MENACES = "Menaces"
    INCITATION_AU_SUICIDE = "Incitation au suicide"
    INJURE_ET_DIFFAMATION_PUBLIQUE = "Injure et diffamation publique"
    DOXXING = "Doxxing"
    INCITATION_A_LA_HAINE = "Incitation à la haine"


class AnnotationConfidence(Enum):
    LOW_CONFIDENCE = "0 (no confidence / high doubt)"
    HIGH_CONFIDENCE = "1 (high confidence / no doubt)"


class Annotation(BaseModel):
    id: int = Field(..., description="ID from NocoDB")
    # FIXME: add CreatedAt and UpdatedAt
    comment: str = Field(..., description="Comment text")
    original_file_name: str = Field(..., description="Name of the file from which this comment was imported")
    annotated_category: AnnotatedCategory | None = Field(None, description="Category that was chosen to annotate this comment")
    annotation_confidence: AnnotationConfidence | None = Field(None, description="Confidence level of the assigner when choosing `annotated_category`")
    comment_translation: str | None = Field(None, description="Translation in french of the comment (when applicable)")
    original_category: str | None = Field(None, description="Category that was assigned in the original file")

    @model_validator(mode='before')
    @classmethod
    def parse_id(cls, data: Any) -> Any:
        if "Id" not in data:
            raise ValueError("Missing field 'Id'")
        
        # Rename 'Id' to 'id'
        data["id"] = data["Id"]
        del data["Id"]

        return data


class NocoDBService:
    def __init__(self, base_url: str, annotation_table_id: str, token: str):
        self.base_url = base_url
        self.annotation_table_id = annotation_table_id
        self.token = token

    def get_annotations(self, limit: int = 25) -> list[Annotation]:
        url = f"{self.base_url}/api/v2/tables/{self.annotation_table_id}/records"
        headers = {
            "accept": "application/json",
            "xc-token": self.token
        }
        params = {
            "limit": limit
        }

        # FIXME: Implement pagination by leveraging the key "pageInfo" and the parameter "offset"
        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status()

        response_dict: dict[str, Any] = response.json()
        if "list" not in response_dict:
            raise ValueError("No record found in response")

        annotations = []
        records: list[dict[str, Any]] = response_dict["list"]
        for record in records:
            annotation = Annotation.model_validate(record)
            annotations.append(annotation)

        return annotations

    def get_table_info(self) -> dict[str, Any]:
        """Fetch table metadata from NocoDB."""
        url = f"{self.base_url}/api/v2/meta/tables/{self.annotation_table_id}"
        headers = {
            "accept": "application/json",
            "xc-token": self.token
        }

        response = requests.get(url, headers=headers)
        response.raise_for_status()

        return response.json()

    def count_annotations(
        self,
        annotation_category_filter: list[AnnotatedCategory] | None = None,  # FIXME: allow to filter rows for which no category is defined
        annotation_confidence_filter: list[AnnotationConfidence] | None = None
    ) -> int:
        url = f"{self.base_url}/api/v2/tables/{self.annotation_table_id}/records/count"
        headers = {
            "accept": "application/json",
            "xc-token": self.token
        }

        where_string = None
        if annotation_category_filter is not None and annotation_confidence_filter is not None:
            where_string = f"(annotated_category,anyof,{','.join(category.value for category in annotation_category_filter)})~and((annotation_confidence,anyof,{','.join(confidence.value for confidence in annotation_confidence_filter)})"
        elif annotation_category_filter is not None:
            where_string = f"(annotated_category,anyof,{','.join(category.value for category in annotation_category_filter)})"
        elif annotation_confidence_filter is not None:
            where_string = f"(annotation_confidence,anyof,{','.join(confidence.value for confidence in annotation_confidence_filter)}"

        params = {}
        if where_string is not None:
            params["where"] = where_string

        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status()

        response_dict: dict[str, Any] = response.json()
        if "count" not in response_dict:
            raise ValueError("No count found in response")

        count = response_dict["count"]
        return count

    def count_languages(
        self,
        text_field: str = "comment",
        annotation_category_filter: list[AnnotatedCategory] | None = None,
        annotation_confidence_filter: list[AnnotationConfidence] | None = None
    ) -> dict[str, dict[str, Any]]:
        """
        Detect the language of text in each row and return statistics.
        
        Returns:
            Dictionary with language codes as keys and stats as values.
            Each stat contains 'count' (number of rows) and 'percentage'.
            Includes special categories:
            - 'too_short_for_detection': for text whose length is <=10 or is mostly symbols
            - 'empty': for empty or missing values
            - 'unknown': when language cannot be detected
        """
        url = f"{self.base_url}/api/v2/tables/{self.annotation_table_id}/records"
        headers = {
            "accept": "application/json",
            "xc-token": self.token
        }

        # Build where clause for filters (same logic as count_annotations)
        where_string = None
        if annotation_category_filter is not None and annotation_confidence_filter is not None:
            where_string = f"(annotated_category,anyof,{','.join(category.value for category in annotation_category_filter)})~and((annotation_confidence,anyof,{','.join(confidence.value for confidence in annotation_confidence_filter)})"
        elif annotation_category_filter is not None:
            where_string = f"(annotated_category,anyof,{','.join(category.value for category in annotation_category_filter)})"
        elif annotation_confidence_filter is not None:
            where_string = f"(annotation_confidence,anyof,{','.join(confidence.value for confidence in annotation_confidence_filter)}"

        # Initialize language detector
        detector = LanguageDetectorBuilder.from_all_languages().build()
        
        # Manage pagination, default page size is 1000
        language_counts: dict[str, int] = {}
        empty_count = 0
        offset = 0
        limit = 1000
        
        while True:
            params = {
                "limit": limit,
                "offset": offset,
                "fields": f"Id,{text_field}"
            }
            if where_string is not None:
                params["where"] = where_string
            
            response = requests.get(url, headers=headers, params=params)
            response.raise_for_status()
            
            response_dict: dict[str, Any] = response.json()
            if "list" not in response_dict:
                break
            
            records: list[dict[str, Any]] = response_dict["list"]
            if not records:
                break
            
            # Process each record
            for record in records:
                if text_field not in record or not record[text_field]:
                    empty_count += 1
                    continue
                
                text = record[text_field].strip()
                
                # Detect language
                # Check if text is too short or mostly symbols
                symbol_proportion = calculate_symbol_proportion(text)
                
                if symbol_proportion > 0.75 and len(text) <= 10:
                    language_key = "too_short_for_detection"
                else:
                    detected_language = detector.detect_language_of(text)
                    if detected_language is None:
                        language_key = "unknown"
                    else:
                        language_key = detected_language.iso_code_639_1.name.lower()
                
                language_counts[language_key] = language_counts.get(language_key, 0) + 1
            
            # Check if there are more pages and restarts loop at offset + limit
            page_info = response_dict.get("pageInfo", {})
            if not page_info.get("isLastPage", True):
                offset += limit
            else:
                break
        
        # Calculate percentages and build result
        total_records = sum(language_counts.values()) + empty_count
        result: dict[str, dict[str, Any]] = {}
        
        for language, count in language_counts.items():
            percentage = round((count / total_records * 100), 2) if total_records > 0 else 0
            result[language] = {
                "count": count,
                "percentage": percentage
            }
        
        # Add empty values as a category
        if empty_count > 0:
            empty_percentage = round((empty_count / total_records * 100), 2) if total_records > 0 else 0
            result["empty"] = {
                "count": empty_count,
                "percentage": empty_percentage
            }
        
        return result


if __name__ == "__main__":
    # Parse command-line arguments
    parser = argparse.ArgumentParser(description="Compute annotation statistics from NocoDB")
    parser.add_argument(
        "--top-languages",
        type=int,
        default=5,
        help="Number of top languages to display individually (default: 5)"
    )
    args = parser.parse_args()

    if "NOCODB_BASE_URL" not in os.environ:
        raise ValueError("You need to set the env variable NOCODB_BASE_URL with the base URL of your NocoDB instance")

    if "NOCODB_ANNOTATION_TABLE_ID" not in os.environ:
        raise ValueError("You need to set the env variable NOCODB_ANNOTATION_TABLE_ID with the id of the annotation table in your NocoDB database")

    if "NOCODB_TOKEN" not in os.environ:
        raise ValueError("You need to set the env variable NOCODB_TOKEN with your own token value")

    nocodb_base_url: str = os.environ["NOCODB_BASE_URL"]
    nocodb_annotation_table_id: str = os.environ["NOCODB_ANNOTATION_TABLE_ID"]
    nocodb_token: str = os.environ["NOCODB_TOKEN"]
    service = NocoDBService(
        base_url=nocodb_base_url,
        annotation_table_id=nocodb_annotation_table_id,
        token=nocodb_token
    )

    # Fetch table info to get the table name
    table_info = service.get_table_info()
    table_name = table_info.get("title", nocodb_annotation_table_id)

    total_count = service.count_annotations()

    count_by_category = {}
    categories = [
        AnnotatedCategory.ABSENCE_DE_CYBERHARCELEMENT,
        AnnotatedCategory.CYBERHARCELEMENT_DEFINITION_GENERALE,
        AnnotatedCategory.CYBERHARCELEMENT_A_CARACTERE_SEXUEL,
        AnnotatedCategory.MENACES,
        AnnotatedCategory.INCITATION_AU_SUICIDE,
        AnnotatedCategory.INJURE_ET_DIFFAMATION_PUBLIQUE,
        AnnotatedCategory.DOXXING,
        AnnotatedCategory.INCITATION_A_LA_HAINE
    ]
    for category in categories:
        category_count = service.count_annotations(annotation_category_filter=[category])
        count_by_category[category.value] = category_count
    
    count_by_category_string = ""
    for category, category_count in count_by_category.items():
        count_by_category_string += f"- {category}: {category_count} ({round(category_count / total_count * 100, 1)}%) \n"

    not_annotated_count = total_count - sum(category_count for category_count in count_by_category.values())
    count_by_category_string += f"- Not annotated: {not_annotated_count}"

    annotation_percentage = round((1 - not_annotated_count / total_count) * 100, 1)

    # Get language statistics
    language_stats = service.count_languages()
    
    # Separate special categories from regular languages
    special_categories = ['too_short_for_detection', 'empty', 'unknown']
    special_stats = {}
    regular_languages = {}
    
    for language, stats in language_stats.items():
        if language in special_categories:
            special_stats[language] = stats
        else:
            regular_languages[language] = stats
    
    # Sort regular languages by count and take top N
    top_n = args.top_languages
    sorted_languages = sorted(regular_languages.items(), key=lambda x: x[1]["count"], reverse=True)
    
    display_languages = {}
    other_count = 0
    other_percentage = 0.0
    
    for i, (language, stats) in enumerate(sorted_languages):
        if i < top_n:
            display_languages[language] = stats
        else:
            other_count += stats['count']
            other_percentage += stats['percentage']
    
    # Add "other_languages" category if there are languages beyond top N
    if other_count > 0:
        display_languages['other_languages'] = {
            'count': other_count,
            'percentage': round(other_percentage, 2)
        }
    
    # Combine special categories with display languages
    final_stats = {**special_stats, **display_languages}

    print(f"***** Table: {table_name} *****")
    print("")
    print("***** Count by category *****")
    print(count_by_category_string)
    print("")
    print("***** Total count *****")
    print(total_count)
    print("")
    print("***** Annotation percentage *****")
    print(f"{annotation_percentage}%")
    print("")
    print(f"***** Language statistics (top {top_n}) *****")
    for language, stats in sorted(final_stats.items(), key=lambda x: x[1]["count"], reverse=True):
        print(f"- {language}: {stats['count']} ({stats['percentage']}%)")
