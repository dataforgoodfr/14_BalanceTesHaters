from typing import Any

import requests


class NocoDBService:
    def __init__(self, base_url: str, token: str):
        self.base_url = base_url
        self.token = token

    def create_record(
        self, base_id: str, table_id: str, data: dict[str, Any]
    ) -> dict[str, Any]:
        url = f"{self.base_url}/api/v3/data/{base_id}/{table_id}/records"
        headers = {"accept": "application/json", "xc-token": self.token}
        response = requests.post(url, headers=headers, json=data)
        response.raise_for_status()
        return response.json()
