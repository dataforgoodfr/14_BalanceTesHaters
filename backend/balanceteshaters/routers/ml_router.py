from balanceteshaters.routers.ml_model import Post
from fastapi import APIRouter

router = APIRouter()


@router.post("/post")
def ml_post(publication: Post):
    results = []
    print(results)
    return {"result": results}
