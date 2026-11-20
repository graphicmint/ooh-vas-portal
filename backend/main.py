import json
import os
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from critique import generate_ooh_critique
from saliency import run_saliency_pipeline

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent
ARTWORK_DIR = BASE_DIR / "Artwork"

app = FastAPI(
    title="OOH VisionLab API",
    description="3M VAS-inspired Out-of-Home creative pre-testing saliency and Gemini Vision critique engine",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health_check():
    has_key = bool(
        os.getenv("GEMINI_API_KEY", "").strip()
        or os.getenv("GOOGLE_API_KEY", "").strip()
    )
    return {"status": "ok", "gemini_configured": has_key}


@app.get("/api/samples")
def list_samples():
    if not ARTWORK_DIR.exists():
        return {"samples": []}
    allowed_exts = {".png", ".jpg", ".jpeg", ".webp"}
    samples = []
    for p in sorted(ARTWORK_DIR.iterdir()):
        if p.is_file() and p.suffix.lower() in allowed_exts:
            samples.append(
                {
                    "name": p.name,
                    "url": f"/api/samples/{p.name}",
                    "size_kb": round(p.stat().st_size / 1024, 1),
                }
            )
    return {"samples": samples}


@app.get("/api/samples/{filename}")
def get_sample(filename: str):
    safe_name = Path(filename).name
    target = ARTWORK_DIR / safe_name
    if not target.exists() or not target.is_file():
        raise HTTPException(status_code=404, detail="Sample artwork not found")
    return FileResponse(target)


@app.post("/api/analyze")
async def analyze_creative(
    file: UploadFile = File(...),
    ooh_format: str = Form("Highway Unipole"),
    viewing_distance: str = Form("100m"),
    aois: str = Form("[]"),
    gemini_api_key: Optional[str] = Form(None),
):
    if not file.content_type or not file.content_type.startswith("image/"):
        # Allow by extension fallback if browser omits mime
        ext = Path(file.filename or "").suffix.lower()
        if ext not in {".jpg", ".jpeg", ".png", ".webp"}:
            raise HTTPException(
                status_code=400,
                detail="Unsupported file type. Please upload JPG, PNG, or WEBP.",
            )

    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        parsed_aois = json.loads(aois) if aois else []
        if not isinstance(parsed_aois, list):
            parsed_aois = []
    except json.JSONDecodeError:
        parsed_aois = []

    try:
        saliency_result = run_saliency_pipeline(
            image_bytes=image_bytes,
            ooh_format=ooh_format,
            viewing_distance=viewing_distance,
            aois=parsed_aois,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=500, detail=f"Saliency processing failed: {str(exc)}"
        )

    critique = generate_ooh_critique(
        image_bytes=image_bytes,
        mime_type=file.content_type or "image/jpeg",
        ooh_format=ooh_format,
        viewing_distance=viewing_distance,
        aoi_metrics=saliency_result["aoi_metrics"],
        fixations=saliency_result["fixations"],
        cv_stats=saliency_result["cv_stats"],
        api_key_override=gemini_api_key,
    )

    return {
        "context": {
            "filename": file.filename,
            "ooh_format": ooh_format,
            "viewing_distance": viewing_distance,
        },
        **saliency_result,
        "critique": critique,
    }
