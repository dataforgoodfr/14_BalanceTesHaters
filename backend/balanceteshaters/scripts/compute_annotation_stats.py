import argparse
import os

from balanceteshaters.classification.category import AnnotatedCategory
from balanceteshaters.services.annotation import AnnotationService
from balanceteshaters.services.nocodb import NocoDBService

if __name__ == "__main__":
    # Parse command-line arguments
    parser = argparse.ArgumentParser(
        description="Compute annotation statistics from NocoDB"
    )
    parser.add_argument(
        "--top-languages",
        type=int,
        default=5,
        help="Number of top languages to display individually (default: 5)",
    )
    args = parser.parse_args()

    if "NOCODB_BASE_URL" not in os.environ:
        raise ValueError(
            "You need to set the env variable NOCODB_BASE_URL with the base URL of your NocoDB instance"
        )

    if "NOCODB_ANNOTATION_TABLE_ID" not in os.environ:
        raise ValueError(
            "You need to set the env variable NOCODB_ANNOTATION_TABLE_ID with the id of the annotation table in your NocoDB database"
        )

    if "NOCODB_TOKEN" not in os.environ:
        raise ValueError(
            "You need to set the env variable NOCODB_TOKEN with your own token value"
        )

    nocodb_base_url: str = os.environ["NOCODB_BASE_URL"]
    nocodb_base_id: str = os.environ["NOCODB_BASE_ID"]
    nocodb_annotation_table_id: str = os.environ["NOCODB_ANNOTATION_TABLE_ID"]
    nocodb_token: str = os.environ["NOCODB_TOKEN"]
    nocodb = NocoDBService(
        nocodb_url=nocodb_base_url, token=nocodb_token, base_id=nocodb_base_id
    )
    service = AnnotationService(
        nocodb=nocodb, annotation_table_id=nocodb_annotation_table_id
    )

    # Fetch table info to get the table name
    table_info = nocodb.get_table_info(nocodb_annotation_table_id)
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
        AnnotatedCategory.INCITATION_A_LA_HAINE,
    ]
    for category in categories:
        category_count = service.count_annotations(
            annotation_category_filter=[category]
        )
        count_by_category[category.value] = category_count

    count_by_category_string = ""
    for category, category_count in count_by_category.items():
        count_by_category_string += f"- {category}: {category_count} ({round(category_count / total_count * 100, 1)}%) \n"

    not_annotated_count = total_count - sum(
        category_count for category_count in count_by_category.values()
    )
    count_by_category_string += f"- Not annotated: {not_annotated_count}"

    annotation_percentage = round((1 - not_annotated_count / total_count) * 100, 1)

    # Get language statistics
    language_stats = service.count_languages()

    # Separate special categories from regular languages
    special_categories = ["too_short_for_detection", "empty", "unknown"]
    special_stats = {}
    regular_languages = {}

    for language, stats in language_stats.items():
        if language in special_categories:
            special_stats[language] = stats
        else:
            regular_languages[language] = stats

    # Sort regular languages by count and take top N
    top_n = args.top_languages
    sorted_languages = sorted(
        regular_languages.items(), key=lambda x: x[1]["count"], reverse=True
    )

    display_languages = {}
    other_count = 0
    other_percentage = 0.0

    for i, (language, stats) in enumerate(sorted_languages):
        if i < top_n:
            display_languages[language] = stats
        else:
            other_count += stats["count"]
            other_percentage += stats["percentage"]

    # Add "other_languages" category if there are languages beyond top N
    if other_count > 0:
        display_languages["other_languages"] = {
            "count": other_count,
            "percentage": round(other_percentage, 2),
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
    for language, stats in sorted(
        final_stats.items(), key=lambda x: x[1]["count"], reverse=True
    ):
        print(f"- {language}: {stats['count']} ({stats['percentage']}%)")
