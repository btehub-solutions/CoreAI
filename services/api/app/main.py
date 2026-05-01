from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

app = FastAPI(title="CoreAI API Bare Minimum", version="1.0.0")

@app.api_route("/{path_name:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def catch_all(path_name: str):
    return JSONResponse(
        status_code=200,
        content={"message": "Bare minimum Vercel test successful", "path": path_name}
    )
