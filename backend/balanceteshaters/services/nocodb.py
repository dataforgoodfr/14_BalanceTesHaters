from typing import Any

import requests


class NocoDBService:
    def __init__(self, base_url: str, token: str):
        self.base_url = base_url
        self.token = token

    def create_table(
        self,
        base_id: str,
        table_name: str,
        description: str,
        fields: list[dict[str, str]],
    ) -> dict[str, Any]:
        url = f"{self.base_url}/api/v3/meta/bases/{base_id}/tables"
        headers = {"accept": "application/json", "xc-token": self.token}
        data = {"title": table_name, "fields": fields}
        response = requests.post(url, headers=headers, json=data)
        response.raise_for_status()
        return response.json()

    def create_record(
        self, base_id: str, table_id: str, data: dict[str, Any]
    ) -> dict[str, Any]:
        url = f"{self.base_url}/api/v3/data/{base_id}/{table_id}/records"
        headers = {"accept": "application/json", "xc-token": self.token}
        response = requests.post(url, headers=headers, json=data)
        response.raise_for_status()
        return response.json()

    def get_table_info(self) -> dict[str, Any]:
        """Fetch table metadata from NocoDB."""
        url = f"{self.base_url}/api/v2/meta/tables/{self.annotation_table_id}"
        headers = {"accept": "application/json", "xc-token": self.token}

        response = requests.get(url, headers=headers)
        response.raise_for_status()

        return response.json()
