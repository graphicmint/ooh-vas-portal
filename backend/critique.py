import os
from typing import Any, Dict, List, Optional

from google import genai
from google.genai import types
from pydantic import BaseModel, Field


class ComprehensionEval(BaseModel):
    score: int = Field(ge=0, le=100)
    status: str = Field(description="One of: Strong, Moderate, Weak")
    analysis: str


class CopyBrevityEval(BaseModel):
    word_count: int = Field(ge=0)
    exceeds_limit: bool = Field(description="True if word_count > 7")
    extracted_copy: str
    analysis: str


class ContrastClutterEval(BaseModel):
    score: int = Field(ge=0, le=100)
    status: str = Field(description="One of: Clean, Moderate, Cluttered")
    analysis: str


class RecommendationItem(BaseModel):
    priority: str = Field(description="One of: High, Medium, Low")
    title: str
    detail: str


class CreativeCritique(BaseModel):
    overall_score: int = Field(ge=0, le=100)
    verdict_headline: str
    three_second_comprehension: ComprehensionEval
    copy_brevity: CopyBrevityEval
    contrast_and_clutter: ContrastClutterEval
    recommendations: List[RecommendationItem]


def _build_fallback_critique(
    ooh_format: str,
    viewing_distance: str,
    aoi_metrics: List[Dict[str, Any]],
    cv_stats: Dict[str, float],
    reason: str,
) -> Dict[str, Any]:
    rms_contrast = cv_stats.get("rms_contrast", 0.5)
    edge_density = cv_stats.get("edge_density", 0.15)
    hot_area_ratio = cv_stats.get("hot_area_ratio", 0.15)
    face_count = int(cv_stats.get("face_count", 0))

    contrast_score = int(min(96, max(35, round(rms_contrast * 95))))
    clutter_penalty = max(0, int((edge_density - 0.18) * 140))
    clutter_score = int(max(30, min(95, 88 - clutter_penalty)))

    # Evaluate AOI attention balance
    total_aoi_pct = sum(a.get("attention_pct", 0.0) for a in aoi_metrics)
    logo_aois = [a for a in aoi_metrics if "logo" in a.get("label", "").lower()]
    logo_pct = sum(a.get("attention_pct", 0.0) for a in logo_aois)

    comp_base = int(round(0.5 * clutter_score + 0.5 * contrast_score))
    if aoi_metrics and total_aoi_pct >= 35:
        comp_base = min(96, comp_base + 8)
    if face_count > 0:
        comp_base = min(98, comp_base + 4)

    overall = int(round(0.45 * comp_base + 0.35 * contrast_score + 0.20 * clutter_score))

    comp_status = "Strong" if comp_base >= 75 else ("Moderate" if comp_base >= 55 else "Weak")
    clutter_status = "Clean" if clutter_score >= 75 else ("Moderate" if clutter_score >= 55 else "Cluttered")

    recs: List[Dict[str, str]] = []
    if aoi_metrics and logo_pct < 10.0 and logo_aois:
        recs.append(
            {
                "priority": "High",
                "title": "Boost Brand Logo Visual Weight",
                "detail": f"Brand Logo currently captures {logo_pct:.1f}% of visual attention. Increase logo scale or place it on a higher-contrast backing plate for {viewing_distance} legibility.",
            }
        )
    elif not aoi_metrics:
        recs.append(
            {
                "priority": "Medium",
                "title": "Define Key AOI Zones for Precision Scoring",
                "detail": "Draw bounding boxes over Brand Logo, Headline, and Product/CTA to quantify exact attention share across key brand elements.",
            }
        )

    if contrast_score < 68:
        recs.append(
            {
                "priority": "High",
                "title": "Increase Foreground/Background Luminance Contrast",
                "detail": f"Measured RMS luminance contrast is {rms_contrast:.2f}. Add a dark scrim or high-contrast color separation behind primary typography for {ooh_format} viewing.",
            }
        )

    if clutter_score < 70 or hot_area_ratio > 0.22:
        recs.append(
            {
                "priority": "Medium",
                "title": "Consolidate Focal Hierarchy",
                "detail": "Visual energy is spread across multiple high-edge zones. Simplify secondary background textures so eye fixations #1 and #2 land directly on the hero message.",
            }
        )

    recs.append(
        {
            "priority": "Low",
            "title": f"Validate {viewing_distance} Typographic Stroke Width",
            "detail": f"In {ooh_format} environments at {viewing_distance}, thin serif or light-weight fonts degrade rapidly. Ensure headline stroke thickness remains bold and sans-serif.",
        }
    )

    return {
        "overall_score": overall,
        "verdict_headline": (
            f"CV Pre-Test Score {overall}/100 for {ooh_format} at {viewing_distance} "
            f"({comp_status} visual hierarchy)."
        ),
        "three_second_comprehension": {
            "score": comp_base,
            "status": comp_status,
            "analysis": (
                f"Based on OpenCV Spectral Residual & Fine-Grained saliency dispersion, "
                f"hot-zone concentration is {hot_area_ratio * 100:.1f}% of canvas"
                + (f" with {face_count} human face(s) anchoring early fixations." if face_count > 0 else ".")
                + (f" Drawn AOIs capture {total_aoi_pct:.1f}% of total attention." if aoi_metrics else "")
            ),
        },
        "copy_brevity": {
            "word_count": 0,
            "exceeds_limit": False,
            "extracted_copy": "OCR/Word-count requires Gemini Vision API key",
            "analysis": "Configure GEMINI_API_KEY to enable automated OCR word-count extraction and >7-word OOH brevity flagging.",
        },
        "contrast_and_clutter": {
            "score": clutter_score,
            "status": clutter_status,
            "analysis": (
                f"LAB luminance contrast index is {rms_contrast:.2f} and high-frequency edge density is "
                f"{edge_density * 100:.1f}%, indicating a {clutter_status.lower()} visual field for {viewing_distance}."
            ),
        },
        "recommendations": recs[:4],
        "source": "cv-heuristic-fallback",
        "fallback_reason": reason,
    }


def generate_ooh_critique(
    image_bytes: bytes,
    mime_type: str,
    ooh_format: str,
    viewing_distance: str,
    aoi_metrics: List[Dict[str, Any]],
    fixations: List[Dict[str, Any]],
    cv_stats: Dict[str, float],
    api_key_override: Optional[str] = None,
) -> Dict[str, Any]:
    api_key = (
        (api_key_override or "").strip()
        or os.getenv("GEMINI_API_KEY", "").strip()
        or os.getenv("GOOGLE_API_KEY", "").strip()
    )

    if not api_key:
        return _build_fallback_critique(
            ooh_format=ooh_format,
            viewing_distance=viewing_distance,
            aoi_metrics=aoi_metrics,
            cv_stats=cv_stats,
            reason="No GEMINI_API_KEY configured in environment.",
        )

    aoi_summary = (
        "\n".join(
            [
                f"- {a['label']}: {a['attention_pct']}% of total visual attention "
                f"(peak saliency {a['peak_intensity']}%, box area {a['area_pct']}%)"
                for a in aoi_metrics
            ]
        )
        if aoi_metrics
        else "No custom AOI boxes were drawn by the user."
    )

    fixation_summary = ", ".join(
        [f"#{f['order']} at ({int(f['x']*100)}%, {int(f['y']*100)}%)" for f in fixations]
    )

    prompt = f"""You are an expert Out-of-Home (OOH) Creative Director and Visual Attention Specialist (3M VAS methodology).
Evaluate the attached OOH creative for:
- OOH Format: {ooh_format}
- Target Viewing Distance: {viewing_distance}

Measured Saliency & AOI Attention Data:
{aoi_summary}

Predicted Eye-Fixation Gaze Sequence (1 to 5):
{fixation_summary}

Provide a rigorous, structured OOH creative critique:
1. overall_score (0-100): Holistic OOH effectiveness score considering format, distance, and attention distribution.
2. verdict_headline: One sharp executive takeaway sentence.
3. three_second_comprehension: Score (0-100), status ("Strong", "Moderate", or "Weak"), and concise analysis of whether a passerby grasps the brand & message within 3 seconds.
4. copy_brevity: Transcribe/extract the visible headline & body copy words (`extracted_copy`), count the total words (`word_count`), set `exceeds_limit` to true if `word_count > 7` (the 7-word OOH golden rule), and explain the impact.
5. contrast_and_clutter: Score (0-100), status ("Clean", "Moderate", or "Cluttered"), and evaluate figure-ground separation, typography legibility at {viewing_distance}, and background noise.
6. recommendations: 3 to 4 specific, actionable creative director recommendations with priority ("High", "Medium", "Low"), title, and concrete detail referencing the AOI percentages or layout."""

    try:
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[
                types.Part.from_bytes(data=image_bytes, mime_type=mime_type or "image/jpeg"),
                prompt,
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=CreativeCritique,
                temperature=0.3,
            ),
        )
        parsed = CreativeCritique.model_validate_json(response.text)
        result = parsed.model_dump()
        # Enforce deterministic > 7 word flag consistency
        if result["copy_brevity"]["word_count"] > 7:
            result["copy_brevity"]["exceeds_limit"] = True
        result["source"] = "gemini-2.5-flash"
        result["fallback_reason"] = None
        return result
    except Exception as exc:
        return _build_fallback_critique(
            ooh_format=ooh_format,
            viewing_distance=viewing_distance,
            aoi_metrics=aoi_metrics,
            cv_stats=cv_stats,
            reason=f"Gemini API unavailable ({type(exc).__name__}: {str(exc)[:120]})",
        )
