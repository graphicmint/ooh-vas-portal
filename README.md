# OOH VisionLab

An Out-of-Home (OOH) creative pre-testing portal inspired by 3M Visual Attention Software (VAS), built with **FastAPI + OpenCV + Gemini Vision (`gemini-2.5-flash`)** and **React + Tailwind CSS**.

## Features

- **Upload & Placement Context:** Drag-and-drop JPG/PNG/WEBP uploader (plus built-in sample creatives from `Artwork/`), OOH Format selector (`Highway Unipole`, `Airport Gantry`, `Retail Facade`, `Digital DOOH`), and Viewing Distance selector (`30m`, `100m`, `200m`).
- **Interactive AOI Drawer:** Draw bounding boxes over **Brand Logo**, **Headline**, and **Product/CTA** to measure exact visual attention percentages.
- **Computer Vision Saliency Engine (`/api/analyze`):** Combines OpenCV Spectral Residual + Fine-Grained Saliency with face and text-contrast weighting to generate:
  1. **Heatmap Overlay** (3M VAS-style thermal map blended at 55% opacity)
  2. **Gaze Sequence Map** (numbered fixations 1–5 with connecting vector lines)
  3. **Distance Legibility Simulation** (optometric blur/scale preview for 30m, 100m, 200m)
- **AI Creative Critique:** Uses `google-genai` (`gemini-2.5-flash`) to score `0–100` and evaluate 3-second glance comprehension, word count & copy brevity (`>7` words flag), foreground/background contrast & clutter, and actionable recommendations (with a deterministic CV heuristic fallback if no API key is configured).
- **Side-by-Side Comparison & Export:** Toggle between Original, Heatmap, Gaze Path, Distance Blur, or Side-by-Side split view, and export a printable **Executive Pitch Report**.

## Local Setup

### 1. Backend (FastAPI)

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt

# Optional: set your Gemini API key (or enter it in the UI header)
# export GEMINI_API_KEY="your_api_key"
uvicorn main:app --host 0.0.0.0 --port 8000
```

### 2. Frontend (React + Vite + Tailwind CSS)

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.
