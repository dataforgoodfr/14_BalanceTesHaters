from typing import Annotated
from uuid import UUID

from balanceteshaters.infra.container import Container
from balanceteshaters.services.auth_service import AuthService, User
from dependency_injector.wiring import Provide, inject
from fastapi import APIRouter, Depends, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr

router = APIRouter()


class RegisterUserRequest(BaseModel):
    email: EmailStr
    login: str
    password: str
    display_name: str | None = None


class RegisterResponse(BaseModel):
    user_id: UUID
    email: EmailStr


@router.post("/register", status_code=status.HTTP_201_CREATED)
@inject
async def register(
    request: RegisterUserRequest,
    auth_service: Annotated[AuthService, Depends(Provide[Container.auth_service])],
):
    user = await auth_service.register(
        email=request.email,
        login=request.login,
        password=request.password,
        display_name=request.display_name,
    )
    return {
        "id": str(user.id),
        "email": user.email,
        "login": user.login,
        "display_name": user.display_name,
    }


@router.post("/token")
@inject
async def login(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    auth_service: Annotated[AuthService, Depends(Provide[Container.auth_service])],
):
    token = await auth_service.login(form_data.username, form_data.password)
    return {"access_token": token.jwt_token}


@inject
async def get_current_user(
    auth_service: Annotated[AuthService, Depends(Provide[Container.auth_service])],
    token: str = Depends(Container.oauth2_scheme),
):
    return await auth_service.get_user_from_token(token)


@router.get("/me")
@inject
async def get_me(
    current_user: Annotated[User, Depends(get_current_user)],
    auth_service: Annotated[AuthService, Depends(Provide[Container.auth_service])],
):
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "login": current_user.login,
        "display_name": current_user.display_name,
    }
