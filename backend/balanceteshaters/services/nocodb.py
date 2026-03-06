from typing import Any

import requests


class NocoDBService:
    def __init__(self, nocodb_url: str, token: str, base_id: str):
        self.nocodb_url = nocodb_url
        self.token = token
        self.base_id = base_id

    def create_record(self, table_id: str, data: dict[str, Any]) -> dict[str, Any]:
        url = f"{self.nocodb_url}/api/v3/data/{self.base_id}/{table_id}/records"
        headers = {"accept": "application/json", "xc-token": self.token}
        response = requests.post(url, headers=headers, json=data)
        response.raise_for_status()
        return response.json()

    def get_records(
        self,
        table_id: str,
        limit: int | None = None,
        offset: int | None = None,
        where_str: str | None = None,
        fields: list[str] | None = None,
    ) -> dict[str, Any]:
        url = f"{self.nocodb_url}/api/v3/data/{self.base_id}/{table_id}/records"
        headers = {"accept": "application/json", "xc-token": self.token}
        params = {}
        if limit is not None:
            params["limit"] = limit
        if offset is not None:
            params["offset"] = offset
        if where_str is not None:
            params["where"] = where_str
        if fields is not None:
            params["fields"] = ",".join(fields)
        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status()
        return response.json()

    def get_table_info(self, table_id: str) -> dict[str, Any]:
        """Fetch table metadata from NocoDB."""
        url = f"{self.nocodb_url}/api/v3/meta/bases/{self.base_id}/tables/{table_id}"
        headers = {"accept": "application/json", "xc-token": self.token}

        response = requests.get(url, headers=headers)
        response.raise_for_status()
        return response.json()

    def count_records(self, table_id: str, where_str: str | None = None) -> int:
        """Count the number of records in a NocoDB table."""
        url = f"{self.nocodb_url}/api/v3/data/{self.base_id}/{table_id}/count"
        headers = {"accept": "application/json", "xc-token": self.token}
        params = {}
        if where_str is not None:
            params["where"] = where_str

        response = requests.get(url, headers=headers, params=params)
        response.raise_for_status()
        data = response.json()
        return data.get("count", 0)
