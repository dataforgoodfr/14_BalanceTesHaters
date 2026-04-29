# ruff: noqa: E402
"""
Remove duplicate rows from the NocoDB eval table (m0ww7qnx69u9r1a).
Keeps the most recently inserted record per model_name, deletes the rest.
"""
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

SCRIPTS_DIR = Path(__file__).resolve().parent.parent.parent.parent
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

from balanceteshaters.scripts.ml.config import EVAL_TABLE_ID
from balanceteshaters.services.nocodb import NocoDBService


def main():
    load_dotenv()
    nocodb = NocoDBService(
        nocodb_url=os.environ["NOCODB_BASE_URL"],
        token=os.environ["NOCODB_TOKEN"],
        base_id=os.environ["NOCODB_BASE_ID"],
    )

    # Fetch all records with pagination
    print(f"Fetching all records from {EVAL_TABLE_ID}...")
    all_records = []
    offset = 0
    limit = 1000
    while True:
        resp = nocodb.get_records(EVAL_TABLE_ID, limit=limit, offset=offset)
        records = resp.get("records", [])
        if not records:
            break
        all_records.extend(records)
        if resp.get("next") is None:
            break
        offset += limit

    print(f"  Total records: {len(all_records)}")

    # Group by model_name, keep highest id (most recent insert)
    seen: dict[str, int] = {}   # model_name -> record id to keep
    to_delete: list[int] = []

    for rec in all_records:
        fields = rec.get("fields", {})
        model_name = fields.get("model_name", "")
        rec_id = rec["id"]

        if model_name not in seen:
            seen[model_name] = rec_id
        else:
            # Keep the higher id (more recent), mark the other for deletion
            if rec_id > seen[model_name]:
                to_delete.append(seen[model_name])
                seen[model_name] = rec_id
            else:
                to_delete.append(rec_id)

    print(f"  Unique model_names: {len(seen)}")
    print(f"  Duplicates to delete: {len(to_delete)}")

    if not to_delete:
        print("Nothing to delete.")
        return

    print(f"Deleting {len(to_delete)} duplicate records...")
    nocodb.delete_records(EVAL_TABLE_ID, to_delete)
    print("Done.")


if __name__ == "__main__":
    main()
