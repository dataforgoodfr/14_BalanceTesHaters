import secrets
from collections.abc import Callable

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials

security = HTTPBasic()


def create_metrics_authentication(
    username: str | None, password: str | None
) -> Callable:
    def authenticate_metrics_request(
        credentials: HTTPBasicCredentials = Depends(security),
    ) -> None:
        if not username or not password:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Metrics authentication is not configured",
            )

        valid_username = secrets.compare_digest(
            credentials.username.encode("utf-8"), username.encode("utf-8")
        )
        valid_password = secrets.compare_digest(
            credentials.password.encode("utf-8"), password.encode("utf-8")
        )
        if not (valid_username and valid_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid metrics credentials",
                headers={"WWW-Authenticate": "Basic"},
            )

    return authenticate_metrics_request
