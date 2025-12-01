import logging
from datetime import datetime, timedelta, timezone

import argon2
import jwt
from balanceteshaters.infra.database import Database
from balanceteshaters.infra.errors import AppException
from balanceteshaters.infra.settings import Settings
from balanceteshaters.model.auth import User
from balanceteshaters.model.repositories import auth_token_repository, user_repository


class AuthServiceException(AppException):
    def __init__(self, error_code: str, status_code: int = 500) -> None:
        super().__init__(
            status_code=status_code, message="AuthService error", error_code=error_code
        )


class AuthService:
    def __init__(self, db: Database, settings: Settings):
        self.logger = logging.getLogger(
            f"{__name__}.{self.__class__.__name__}",
        )
        self.db = db
        time_cost = settings.auth.argon2.time_cost
        memory_cost = settings.auth.argon2.memory_cost
        parallelism = settings.auth.argon2.parallelism
        hash_len = settings.auth.argon2.hash_len
        salt_len = settings.auth.argon2.salt_len
        self.logger.debug(
            f"Argon2 password hasher settings: time_cost={time_cost}, memory_cost={memory_cost}, "
            f"parallelism={parallelism}, hash_len={hash_len}, salt_len={salt_len}"
        )

        # Create the hasher
        self.ph = argon2.PasswordHasher(
            time_cost=time_cost,
            memory_cost=memory_cost,
            parallelism=parallelism,
            hash_len=hash_len,
            salt_len=salt_len,
            type=argon2.Type.ID,  # Using Argon2id variant
        )

        self.jwt_secret_key = settings.auth.jwt.secret_key
        self.jwt_algorithm = settings.auth.jwt.algorithm
        self.jwt_token_expire_minutes = settings.auth.jwt.token_expire_minutes

    async def register(
        self, email: str, login: str, password: str, display_name: str | None = None
    ) -> User:
        async with self.db.get_session() as session, session.begin():
            # Check if user already exists
            user_by_login = await user_repository.find_user_by_login(session, login)
            user_by_email = await user_repository.find_user_by_email(session, email)
            if user_by_email or user_by_login:
                raise AuthServiceException("user_already_exists", 409)

            new_user = user_repository.create_user(session, email, login, display_name)
            await session.flush()
            new_user.password_hash = self.ph.hash(password)
            await session.commit()
            return new_user

    async def get_user_from_token(self, token_str: str) -> User:
        """Retourne l'utilisateur associé au token d'authentification.
        Renvoie une exception si le token n'exite pas ou a expiré.
        """
        async with self.db.get_session() as session, session.begin():
            token = await auth_token_repository.find_auth_token_with_user(
                session, token_str
            )
            if not token:
                await session.rollback()
                raise AuthServiceException("invalid_token", 404)
            if token.expires_at < datetime.now(timezone.utc):
                auth_token_repository.delete_auth_token(session, token)
                await session.commit()
                raise AuthServiceException("token_expired", 409)
            user = await token.awaitable_attrs.user
            await session.commit()
            return user

    async def find_user_with_login(self, username) -> User | None:
        async with self.db.get_session() as session, session.begin():
            return await user_repository.find_user_by_login(username)

    def __create_access_token(self, data: dict):
        encoded_jwt = jwt.encode(
            data, self.jwt_secret_key, algorithm=self.jwt_algorithm
        )
        return encoded_jwt

    async def login(
        self, username: str, password: str
    ) -> auth_token_repository.AuthToken:
        async with self.db.get_session() as session, session.begin():
            user = await user_repository.find_user_by_login(session, username)
            if not user:
                raise AuthServiceException("invalid_username_or_password", 400)
            if not user.enabled:
                raise AuthServiceException("user_login_disabled", 400)
            try:
                self.ph.verify(user.password_hash, password)
            except Exception:
                raise AuthServiceException("invalid_username_or_password", 400)
            # Create token
            expires_delta = datetime.now(timezone.utc) + timedelta(
                minutes=self.jwt_token_expire_minutes
            )
            data = {"sub": user.login, "exp": expires_delta}
            jwt_token = self.__create_access_token(data)
            token = auth_token_repository.create_auth_token(
                session, jwt_token, expires_delta
            )
            token.user = user
            await session.commit()
            return token
