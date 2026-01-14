from fastapi import APIRouter

router = APIRouter()


@router.post("/post")
def ml_post(publication: str):
    results = []
    print(results)
    return {"result": results}
