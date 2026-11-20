import base64
import io
from typing import Any, Dict, List, Tuple

import cv2
import numpy as np
from PIL import Image, ImageOps


def _encode_bgr_to_base64(img_bgr: np.ndarray, ext: str = ".jpg", quality: int = 90) -> str:
    encode_params = [cv2.IMWRITE_JPEG_QUALITY, quality] if ext == ".jpg" else []
    success, buf = cv2.imencode(ext, img_bgr, encode_params)
    if not success:
        raise ValueError("Failed to encode image")
    b64 = base64.b64encode(buf.tobytes()).decode("utf-8")
    mime = "image/jpeg" if ext == ".jpg" else "image/png"
    return f"data:{mime};base64,{b64}"


def load_image_bgr(image_bytes: bytes, max_dim: int = 1400) -> Tuple[np.ndarray, int, int]:
    pil_img = Image.open(io.BytesIO(image_bytes))
    pil_img = ImageOps.exif_transpose(pil_img)
    if pil_img.mode != "RGB":
        pil_img = pil_img.convert("RGB")

    orig_w, orig_h = pil_img.size
    scale = min(1.0, max_dim / max(orig_w, orig_h))
    if scale < 1.0:
        new_w = max(1, int(round(orig_w * scale)))
        new_h = max(1, int(round(orig_h * scale)))
        pil_img = pil_img.resize((new_w, new_h), Image.Resampling.LANCZOS)

    rgb = np.array(pil_img)
    bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
    return bgr, orig_w, orig_h


def _normalize_map(m: np.ndarray) -> np.ndarray:
    m = m.astype(np.float32)
    mn, mx = float(np.min(m)), float(np.max(m))
    if mx - mn < 1e-8:
        return np.zeros_like(m, dtype=np.float32)
    return (m - mn) / (mx - mn)


def compute_saliency_map(img_bgr: np.ndarray) -> Tuple[np.ndarray, Dict[str, float]]:
    h, w = img_bgr.shape[:2]

    # 1. OpenCV Spectral Residual Saliency
    spectral_algo = cv2.saliency.StaticSaliencySpectralResidual_create()
    _, spectral_map = spectral_algo.computeSaliency(img_bgr)
    spectral_norm = _normalize_map(spectral_map)

    # 2. OpenCV Fine-Grained Saliency
    fine_algo = cv2.saliency.StaticSaliencyFineGrained_create()
    _, fine_map = fine_algo.computeSaliency(img_bgr)
    fine_norm = _normalize_map(fine_map)

    # 3. Text & High-Contrast Edge Weighting (LAB L-channel + morphological gradient)
    lab = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2LAB)
    l_chan = lab[:, :, 0]
    grad_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    morph_grad = cv2.morphologyEx(l_chan, cv2.MORPH_GRADIENT, grad_kernel).astype(np.float32)

    sobelx = cv2.Sobel(l_chan, cv2.CV_32F, 1, 0, ksize=3)
    sobely = cv2.Sobel(l_chan, cv2.CV_32F, 0, 1, ksize=3)
    edge_mag = np.sqrt(sobelx ** 2 + sobely ** 2)

    contrast_raw = 0.6 * _normalize_map(morph_grad) + 0.4 * _normalize_map(edge_mag)
    blur_k = max(15, (int(min(w, h) * 0.04) | 1))
    contrast_map = _normalize_map(cv2.GaussianBlur(contrast_raw, (blur_k, blur_k), 0))

    # 4. Face Detection Weighting (human faces attract strong OOH fixation)
    gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
    face_map = np.zeros((h, w), dtype=np.float32)
    face_count = 0
    try:
        cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        face_cascade = cv2.CascadeClassifier(cascade_path)
        if not face_cascade.empty():
            faces = face_cascade.detectMultiScale(
                gray,
                scaleFactor=1.1,
                minNeighbors=5,
                minSize=(max(24, w // 25), max(24, h // 25)),
            )
            face_count = len(faces) if faces is not None else 0
            for (fx, fy, fw, fh) in faces:
                cx, cy = fx + fw // 2, fy + fh // 2
                cv2.ellipse(
                    face_map,
                    (cx, cy),
                    (max(1, int(fw * 0.65)), max(1, int(fh * 0.75))),
                    0,
                    0,
                    360,
                    1.0,
                    -1,
                )
            if face_count > 0:
                f_k = max(21, (int(min(w, h) * 0.08) | 1))
                face_map = _normalize_map(cv2.GaussianBlur(face_map, (f_k, f_k), 0))
    except Exception:
        face_count = 0

    # Combine channels
    if face_count > 0:
        combined = (
            0.38 * spectral_norm
            + 0.32 * fine_norm
            + 0.16 * contrast_map
            + 0.14 * face_map
        )
    else:
        combined = (
            0.44 * spectral_norm
            + 0.36 * fine_norm
            + 0.20 * contrast_map
        )

    # Smooth into authentic VAS-style attention clouds
    smooth_k = max(21, (int(min(w, h) * 0.055) | 1))
    saliency_smooth = cv2.GaussianBlur(combined, (smooth_k, smooth_k), 0)
    saliency_norm = _normalize_map(saliency_smooth)

    # Compute CV telemetry metrics for diagnostics & fallback critique
    rms_contrast = float(np.std(l_chan.astype(np.float32)) / 64.0)
    edge_density = float(np.mean(edge_mag > np.percentile(edge_mag, 85)))
    # Attention concentration: fraction of pixels holding >50% peak saliency
    hot_area_ratio = float(np.mean(saliency_norm > 0.55))

    cv_stats = {
        "face_count": float(face_count),
        "rms_contrast": round(min(1.0, rms_contrast), 3),
        "edge_density": round(edge_density, 3),
        "hot_area_ratio": round(hot_area_ratio, 3),
    }
    return saliency_norm, cv_stats


def generate_heatmap_overlay(img_bgr: np.ndarray, saliency_norm: np.ndarray) -> np.ndarray:
    heat_u8 = np.clip(saliency_norm * 255.0, 0, 255).astype(np.uint8)
    heatmap_bgr = cv2.applyColorMap(heat_u8, cv2.COLORMAP_JET)
    # Blend thermal color map at 55% opacity over the creative
    blended = cv2.addWeighted(img_bgr, 0.45, heatmap_bgr, 0.55, 0)
    return blended


def extract_gaze_fixations(
    saliency_norm: np.ndarray, num_points: int = 5
) -> List[Dict[str, Any]]:
    h, w = saliency_norm.shape
    work = saliency_norm.copy()
    ior_radius = max(24, int(0.12 * min(w, h)))
    yy, xx = np.ogrid[:h, :w]

    fixations: List[Dict[str, Any]] = []
    for idx in range(1, num_points + 1):
        min_val, max_val, min_loc, max_loc = cv2.minMaxLoc(work)
        if max_val <= 0.01 and idx > 1:
            break
        px, py = max_loc
        fixations.append(
            {
                "order": idx,
                "x": round(px / w, 4),
                "y": round(py / h, 4),
                "px": int(px),
                "py": int(py),
                "intensity": round(float(saliency_norm[py, px]) * 100.0, 1),
            }
        )
        # Inhibition of Return (IOR) Gaussian suppression
        dist_sq = (xx - px) ** 2 + (yy - py) ** 2
        suppression = 1.0 - np.exp(-dist_sq / (2.0 * (ior_radius ** 2)))
        work *= suppression.astype(np.float32)

    return fixations


def generate_gaze_overlay(
    img_bgr: np.ndarray, fixations: List[Dict[str, Any]]
) -> np.ndarray:
    h, w = img_bgr.shape[:2]
    # Slightly dim background so gaze path pops cleanly
    canvas = (img_bgr.astype(np.float32) * 0.72).astype(np.uint8)

    scale = max(0.7, min(1.8, min(w, h) / 700.0))
    circle_r = int(20 * scale)
    line_thick = max(2, int(3 * scale))
    font_scale = 0.68 * scale
    font_thick = max(2, int(2 * scale))

    # Draw connecting path lines first
    for i in range(len(fixations) - 1):
        p1 = (fixations[i]["px"], fixations[i]["py"])
        p2 = (fixations[i + 1]["px"], fixations[i + 1]["py"])
        # Outer dark stroke for contrast
        cv2.line(canvas, p1, p2, (15, 23, 42), line_thick + 3, cv2.LINE_AA)
        # Inner crisp cyan/gold vector line
        cv2.line(canvas, p1, p2, (56, 189, 248), line_thick, cv2.LINE_AA)

        # Draw small directional chevron at midpoint
        mx = int((p1[0] + p2[0]) * 0.5)
        my = int((p1[1] + p2[1]) * 0.5)
        cv2.circle(canvas, (mx, my), max(3, int(4 * scale)), (248, 250, 252), -1, cv2.LINE_AA)

    # Color ramp from #1 (hot coral/red) -> #5 (cool cyan) in BGR
    palette_bgr = [
        (68, 68, 239),    # 1: Red-coral
        (22, 115, 249),   # 2: Orange
        (11, 158, 245),   # 3: Amber
        (129, 185, 16),   # 4: Emerald
        (248, 189, 56),   # 5: Sky Cyan
    ]

    for idx, fix in enumerate(fixations):
        center = (fix["px"], fix["py"])
        color = palette_bgr[min(idx, len(palette_bgr) - 1)]

        # Halo ring
        cv2.circle(canvas, center, circle_r + 4, (255, 255, 255), 2, cv2.LINE_AA)
        # Main filled circle
        cv2.circle(canvas, center, circle_r, color, -1, cv2.LINE_AA)

        label = str(fix["order"])
        (tw, th), _ = cv2.getTextSize(
            label, cv2.FONT_HERSHEY_SIMPLEX, font_scale, font_thick
        )
        tx = center[0] - tw // 2
        ty = center[1] + th // 2
        cv2.putText(
            canvas,
            label,
            (tx, ty),
            cv2.FONT_HERSHEY_SIMPLEX,
            font_scale,
            (255, 255, 255),
            font_thick,
            cv2.LINE_AA,
        )

    return canvas


def generate_distance_simulation(
    img_bgr: np.ndarray, viewing_distance: str, ooh_format: str
) -> np.ndarray:
    h, w = img_bgr.shape[:2]

    # Viewing distance simulation parameters
    distance_params = {
        "30m": {"scale": 0.55, "blur_ratio": 0.004, "haze": 0.03},
        "100m": {"scale": 0.28, "blur_ratio": 0.011, "haze": 0.08},
        "200m": {"scale": 0.14, "blur_ratio": 0.020, "haze": 0.15},
    }
    params = distance_params.get(viewing_distance, distance_params["100m"])

    down_scale = params["scale"]
    blur_ratio = params["blur_ratio"]
    haze = params["haze"]

    # Format modifiers
    if ooh_format == "Highway Unipole":
        blur_ratio *= 1.15
        haze += 0.03
    elif ooh_format == "Digital DOOH":
        haze = max(0.0, haze - 0.03)
        blur_ratio *= 0.85

    dw = max(16, int(w * down_scale))
    dh = max(16, int(h * down_scale))
    small = cv2.resize(img_bgr, (dw, dh), interpolation=cv2.INTER_AREA)

    # Upscale back to simulate angular resolution loss
    upscaled = cv2.resize(small, (w, h), interpolation=cv2.INTER_LINEAR)

    # Apply optometric Gaussian blur
    ksize = max(3, (int(min(w, h) * blur_ratio) | 1))
    blurred = cv2.GaussianBlur(upscaled, (ksize, ksize), 0)

    # Apply subtle atmospheric haze (blending slightly toward cool daylight gray)
    if haze > 0:
        haze_layer = np.full_like(blurred, (218, 214, 210), dtype=np.uint8)
        blurred = cv2.addWeighted(blurred, 1.0 - haze, haze_layer, haze, 0)

    return blurred


def compute_aoi_metrics(
    saliency_norm: np.ndarray, aois: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    h, w = saliency_norm.shape
    total_mass = float(np.sum(saliency_norm)) + 1e-8
    results: List[Dict[str, Any]] = []

    for aoi in aois:
        x = max(0.0, min(1.0, float(aoi.get("x", 0))))
        y = max(0.0, min(1.0, float(aoi.get("y", 0))))
        bw = max(0.0, min(1.0 - x, float(aoi.get("width", 0))))
        bh = max(0.0, min(1.0 - y, float(aoi.get("height", 0))))

        x1 = int(round(x * w))
        y1 = int(round(y * h))
        x2 = min(w, max(x1 + 1, int(round((x + bw) * w))))
        y2 = min(h, max(y1 + 1, int(round((y + bh) * h))))

        patch = saliency_norm[y1:y2, x1:x2]
        aoi_mass = float(np.sum(patch))
        attention_pct = round((aoi_mass / total_mass) * 100.0, 1)
        peak_intensity = round(float(np.max(patch)) * 100.0, 1) if patch.size > 0 else 0.0
        area_pct = round(((x2 - x1) * (y2 - y1) / float(w * h)) * 100.0, 1)

        results.append(
            {
                "id": aoi.get("id", ""),
                "label": aoi.get("label", "AOI"),
                "x": x,
                "y": y,
                "width": bw,
                "height": bh,
                "attention_pct": attention_pct,
                "peak_intensity": peak_intensity,
                "area_pct": area_pct,
            }
        )

    return results


def run_saliency_pipeline(
    image_bytes: bytes,
    ooh_format: str,
    viewing_distance: str,
    aois: List[Dict[str, Any]],
) -> Dict[str, Any]:
    img_bgr, orig_w, orig_h = load_image_bgr(image_bytes)
    proc_h, proc_w = img_bgr.shape[:2]

    saliency_norm, cv_stats = compute_saliency_map(img_bgr)
    fixations = extract_gaze_fixations(saliency_norm, num_points=5)
    aoi_results = compute_aoi_metrics(saliency_norm, aois)

    heatmap_bgr = generate_heatmap_overlay(img_bgr, saliency_norm)
    gaze_bgr = generate_gaze_overlay(img_bgr, fixations)
    distance_bgr = generate_distance_simulation(img_bgr, viewing_distance, ooh_format)

    return {
        "dimensions": {"width": orig_w, "height": orig_h, "processed_width": proc_w, "processed_height": proc_h},
        "overlays": {
            "original": _encode_bgr_to_base64(img_bgr, ".jpg", 92),
            "heatmap": _encode_bgr_to_base64(heatmap_bgr, ".jpg", 90),
            "gaze_path": _encode_bgr_to_base64(gaze_bgr, ".jpg", 90),
            "distance_blur": _encode_bgr_to_base64(distance_bgr, ".jpg", 90),
        },
        "fixations": fixations,
        "aoi_metrics": aoi_results,
        "cv_stats": cv_stats,
    }
