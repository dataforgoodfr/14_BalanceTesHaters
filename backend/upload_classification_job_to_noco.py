import argparse
import os

import requests
from balanceteshaters.services.nocodb import NocoDBService


def upload_comments(service, comments: dict[str, str]):
    for comment in comments:
        nocodb.create_record(
            base_id="ppi0re931qn0gqh",
            table_id="m352wosvedsw45k",
            data={
                "fields": {
                    "comment_id": comment["id"],
                    "comment": comment["text_content"],
                }
            },
        )
        upload_comments(service, comment["replies"])


if __name__ == "__main__":
    if "NOCODB_BASE_URL" not in os.environ:
        raise ValueError(
            "You need to set the env variable NOCODB_BASE_URL with the base URL of your NocoDB instance"
        )

    if "NOCODB_TOKEN" not in os.environ:
        raise ValueError(
            "You need to set the env variable NOCODB_TOKEN with your own token value"
        )

    if "BTH_BACKEND_URL" not in os.environ:
        raise ValueError(
            "You need to set the env variable BTH_BACKEND_URL with the URL of the BalanceTesHaters backend instance you want to connect to"
        )

    if "BTH_API_TOKEN" not in os.environ:
        raise ValueError(
            "You need to set the env variable BTH_API_TOKEN with the API token to authenticate to the BalanceTesHaters backend instance"
        )

    nocodb_base_url: str = os.environ["NOCODB_BASE_URL"]
    nocodb_token: str = os.environ["NOCODB_TOKEN"]
    bth_backend_url: str = os.environ["BTH_BACKEND_URL"]
    bth_token_api: str = os.environ["BTH_API_TOKEN"]

    nocodb = NocoDBService(
        base_url=nocodb_base_url,
        token=nocodb_token,
    )

    # Parse command-line arguments
    parser = argparse.ArgumentParser(
        description="Upload a classification job comments to nocodb"
    )
    parser.add_argument(
        "--job-id",
        type=str,
        required=False,
        help="Classification job ID to upload comments for",
    )
    args = parser.parse_args()
    if not args.job_id:
        print("Available jobs:")
        response = requests.get(
            f"{bth_backend_url}/classification/", headers={"x-token": bth_token_api}
        )
        response.raise_for_status()
        for job in response.json():
            print(
                f"{job['id']} @ {job['submitted_at']}: {job['title']} ({job['status']})"
            )
    else:
        print(f"Uploading comments for job {args.job_id}...")
        response = requests.get(
            f"{bth_backend_url}/classification/{args.job_id}/comments",
            headers={"x-token": bth_token_api},
        )
        response.raise_for_status()
        comments = response.json()
        upload_comments(nocodb, comments)
