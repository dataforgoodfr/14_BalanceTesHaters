import argparse
import json
import os

import requests
from balanceteshaters.services.nocodb import NocoDBService


def upload_comments(
    service, title, text_content, parent=None, comments: dict[str, str] = None
):
    for comment in comments:
        nocodb.create_record(
            table_id="m73fiuonzrp4rex",
            data={
                "fields": {
                    "comment_id": comment["id"],
                    "comment": comment["text_content"],
                    "ctx_title": title,
                    "ctx_publication": text_content,
                    "ctx_parent_comment": parent["text_content"] if parent else None,
                    "ctx_sibling_comments": json.dumps(
                        [
                            c["text_content"]
                            for c in comment["replies"]
                            if c["id"] != comment["id"]
                        ]
                    ),
                }
            },
        )
        upload_comments(service, title, text_content, comment, comment["replies"])


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

    if "BTH_PRIVATE_API_TOKEN" not in os.environ:
        raise ValueError(
            "You need to set the env variable BTH_PRIVATE_API_TOKEN with the API token to authenticate to the BalanceTesHaters backend instance"
        )

    nocodb_base_url: str = os.environ["NOCODB_BASE_URL"]
    nocodb_token: str = os.environ["NOCODB_TOKEN"]
    bth_backend_url: str = os.environ["BTH_BACKEND_URL"]
    bth_token_api: str = os.environ["BTH_PRIVATE_API_TOKEN"]

    nocodb = NocoDBService(
        nocodb_url=nocodb_base_url, token=nocodb_token, base_id="ppi0re931qn0gqh"
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

    jobs = requests.get(
        f"{bth_backend_url}/classification/", headers={"x-token": bth_token_api}
    )
    jobs.raise_for_status()

    if not args.job_id:
        print("Available jobs:")
        for job in jobs.json():
            print(
                f"{job['id']} @ {job['submitted_at']}: {job['title']} ({job['status']})"
            )
    else:
        jobs = jobs.json()
        job = [j for j in jobs if j["id"] == args.job_id][0]
        print(f"Uploading comments for job {job['id']}...")
        response = requests.get(
            f"{bth_backend_url}/classification/{job['id']}/comments",
            headers={"x-token": bth_token_api},
        )
        response.raise_for_status()
        comments = response.json()
        upload_comments(nocodb, job["title"], job["text_content"], None, comments)
