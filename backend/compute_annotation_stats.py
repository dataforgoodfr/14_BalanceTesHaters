import os
from enum import Enum
from typing import Any

import requests
from pydantic import BaseModel, Field, model_validator


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
    annotated_category: list[AnnotatedCategory] | None = Field(None, description="Category that was chosen to annotate this comment")
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

    @model_validator(mode='before')
    @classmethod
    def handle_annotated_category(cls, data: Any) -> Any:
        data['annotated_category']=data['annotated_category'].split(',')
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


if __name__ == "__main__":
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
        count_by_category_string += f"- {category}: {category_count}\n"

    not_annotated_count = total_count - sum(category_count for category_count in count_by_category.values())
    count_by_category_string += f"- Not annotated: {not_annotated_count}"

    annotation_percentage = round((1 - not_annotated_count / total_count) * 100, 1)

    print("***** Count by category *****")
    print(count_by_category_string)
    print("")
    print("***** Total count *****")
    print(total_count)
    print("")
    print("***** Annotation percentage *****")
    print(f"{annotation_percentage}%")
