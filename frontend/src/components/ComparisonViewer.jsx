import { useState } from 'react'
import {
  Columns2,
  Eye,
  Flame,
  GitCommitHorizontal,
  PenTool,
  ScanEye,
  Square,
} from 'lucide-react'
import { getAoiColor } from '../constants'

const VIEW_TABS = [
  { id: 'original', label: 'Original', icon: Eye },
  { id: 'heatmap', label: 'Heatmap', icon: Flame },
  { id: 'gaze_path', label: 'Gaze Path', icon: GitCommitHorizontal },
  { id: 'distance_blur', label: 'Distance Blur', icon: ScanEye },
]

export default function ComparisonViewer({
  result,
  activeView,
  onChangeView,
  onSwitchToDraw,
}) {
  const [sideBySide, setSideBySide] = useState(false)
  const [showAois, setShowAois] = useState(true)

  const overlays = result.overlays
  const aoiMetrics = result.aoi_metrics || []

  const renderImageWithAois = (src, altLabel, badgeText) => (
    <div className="relative inline-block overflow-hidden rounded-lg border border-slate-700/80 bg-[#07090D]">
      {badgeText && (
        <span className="absolute left-2.5 top-2.5 z-10 rounded border border-slate-700/80 bg-slate-950/80 px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-slate-200 backdrop-blur-sm">
          {badgeText}
        </span>
      )}
      <img
        src={src}
        alt={altLabel}
        className={`block w-auto max-w-full object-contain ${
          sideBySide ? 'max-h-[54vh]' : 'max-h-[65vh]'
        }`}
      />
      {showAois &&
        aoiMetrics.map((aoi) => {
          const color = getAoiColor(aoi.label)
          return (
            <div
              key={aoi.id}
              style={{
                left: `${aoi.x * 100}%`,
                top: `${aoi.y * 100}%`,
                width: `${aoi.width * 100}%`,
                height: `${aoi.height * 100}%`,
                borderColor: color,
              }}
              className="pointer-events-none absolute border-2"
            >
              <div
                style={{ backgroundColor: color }}
                className="absolute -top-5 left-0 flex items-center gap-1 rounded-t px-1.5 py-0.5 text-[10px] font-semibold text-slate-950 whitespace-nowrap shadow"
              >
                <span>{aoi.label}</span>
                <span className="rounded bg-slate-950/20 px-1 font-mono">
                  {aoi.attention_pct}%
                </span>
              </div>
            </div>
          )
        })}
    </div>
  )

  const rightViewId = activeView === 'original' ? 'heatmap' : activeView

  return (
    <div className="flex flex-col gap-3">
      {/* Viewer Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800/90 bg-[#11141B] px-3 py-2.5">
        <div className="flex flex-wrap items-center gap-1">
          {VIEW_TABS.map((tab) => {
            const Icon = tab.icon
            const active = activeView === tab.id
            return (
              <button
                key={tab.id}
                id={`tab-view-${tab.id}`}
                type="button"
                onClick={() => onChangeView(tab.id)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  active
                    ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-toggle-side-by-side"
            type="button"
            onClick={() => setSideBySide((v) => !v)}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
              sideBySide
                ? 'border-sky-500/60 bg-sky-500/15 text-sky-300'
                : 'border-slate-800 bg-[#0C0F15] text-slate-400 hover:border-slate-700 hover:text-slate-200'
            }`}
          >
            <Columns2 className="h-3.5 w-3.5" />
            <span>Side-by-Side</span>
          </button>

          {aoiMetrics.length > 0 && (
            <button
              id="btn-toggle-aois"
              type="button"
              onClick={() => setShowAois((v) => !v)}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                showAois
                  ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
                  : 'border-slate-800 bg-[#0C0F15] text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <Square className="h-3 w-3" />
              <span>AOIs</span>
            </button>
          )}

          <button
            id="btn-edit-aois"
            type="button"
            onClick={onSwitchToDraw}
            className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-[#0C0F15] px-2.5 py-1.5 text-xs font-medium text-slate-300 transition hover:border-slate-700 hover:text-white"
          >
            <PenTool className="h-3.5 w-3.5 text-amber-400" />
            <span>Edit AOIs</span>
          </button>
        </div>
      </div>

      {/* Main Stage */}
      <div className="flex min-h-[420px] flex-col items-center justify-center rounded-xl border border-slate-800/90 bg-[#0C0F15] p-4">
        {sideBySide ? (
          <div className="grid w-full grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="flex flex-col items-center justify-center">
              {renderImageWithAois(overlays.original, 'Original Creative', 'Original')}
            </div>
            <div className="flex flex-col items-center justify-center">
              {renderImageWithAois(
                overlays[rightViewId],
                `Comparison ${rightViewId}`,
                VIEW_TABS.find((t) => t.id === rightViewId)?.label
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center">
            {renderImageWithAois(
              overlays[activeView],
              `Active view ${activeView}`,
              activeView === 'distance_blur'
                ? `${result.context.viewing_distance} · ${result.context.ooh_format}`
                : null
            )}
          </div>
        )}

        {/* Contextual Legend Footer */}
        <div className="mt-4 flex w-full flex-wrap items-center justify-between gap-3 border-t border-slate-800/80 pt-3 text-[11px] text-slate-400">
          {(activeView === 'heatmap' || (sideBySide && rightViewId === 'heatmap')) && (
            <div className="flex items-center gap-2.5">
              <span className="font-medium text-slate-300">Saliency Intensity:</span>
              <span>Low</span>
              <div
                className="h-2.5 w-36 rounded-full"
                style={{
                  background:
                    'linear-gradient(90deg, #00008B 0%, #00BFFF 28%, #00FF7F 52%, #FFD700 76%, #FF2400 100%)',
                }}
              />
              <span>Peak Fixation</span>
            </div>
          )}

          {(activeView === 'gaze_path' || (sideBySide && rightViewId === 'gaze_path')) && (
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-medium text-slate-300">Predicted Fixation Order:</span>
              {(result.fixations || []).map((f) => (
                <span key={f.order} className="font-mono text-[11px] text-slate-300">
                  #{f.order} ({f.intensity}%)
                </span>
              ))}
            </div>
          )}

          {activeView === 'distance_blur' && !sideBySide && (
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-300">
                Optometric Simulation:
              </span>
              <span>
                {result.context.ooh_format} viewed at{' '}
                <strong className="text-amber-300">{result.context.viewing_distance}</strong>
              </span>
            </div>
          )}

          {activeView === 'original' && !sideBySide && (
            <span>Original uploaded creative ({result.dimensions.width}×{result.dimensions.height}px)</span>
          )}

          <span className="font-mono text-[10px] text-slate-500">
            Faces detected: {result.cv_stats?.face_count ?? 0} · Contrast:{' '}
            {result.cv_stats?.rms_contrast ?? 0}
          </span>
        </div>
      </div>
    </div>
  )
}
