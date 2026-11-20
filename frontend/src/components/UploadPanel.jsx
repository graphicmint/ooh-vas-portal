import { useRef, useState } from 'react'
import {
  ImagePlus,
  Layers,
  MapPin,
  Ruler,
  SquareDashedMousePointer,
  Trash2,
  UploadCloud,
} from 'lucide-react'
import { AOI_LABELS, OOH_FORMATS, VIEWING_DISTANCES, getAoiColor } from '../constants'

export default function UploadPanel({
  imageInfo,
  samples,
  onFileSelected,
  onSelectSample,
  oohFormat,
  onChangeFormat,
  viewingDistance,
  onChangeDistance,
  activeAoiLabel,
  onChangeActiveAoiLabel,
  aois,
  aoiMetrics,
  onRemoveAoi,
  onClearAois,
}) {
  const fileInputRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) onFileSelected(file)
  }

  const getAttentionForAoi = (id) => {
    if (!aoiMetrics) return null
    const match = aoiMetrics.find((m) => m.id === id)
    return match ? match.attention_pct : null
  }

  return (
    <aside className="no-print flex flex-col gap-4">
      {/* 1. Creative Upload */}
      <section className="rounded-xl border border-slate-800/90 bg-[#11141B] p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
            <UploadCloud className="h-3.5 w-3.5 text-amber-400" />
            1. Creative Asset
          </h2>
          {imageInfo && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-[11px] font-medium text-sky-400 hover:text-sky-300"
            >
              Replace
            </button>
          )}
        </div>

        <input
          id="file-upload-input"
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) onFileSelected(file)
          }}
        />

        <div
          id="dropzone-creative"
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`cursor-pointer rounded-lg border border-dashed p-3.5 text-center transition ${
            isDragging
              ? 'border-amber-400 bg-amber-500/10'
              : 'border-slate-700/80 bg-[#0C0F15] hover:border-slate-600'
          }`}
        >
          <ImagePlus className="mx-auto mb-1.5 h-5 w-5 text-slate-400" />
          {imageInfo ? (
            <div className="space-y-0.5">
              <p className="truncate text-xs font-medium text-slate-200">
                {imageInfo.name}
              </p>
              <p className="font-mono text-[11px] text-slate-500">
                {imageInfo.width}×{imageInfo.height}px · {imageInfo.sizeKb} KB
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-300">
                Drop OOH creative or click to browse
              </p>
              <p className="text-[11px] text-slate-500">JPG, PNG, or WEBP</p>
            </div>
          )}
        </div>

        {samples.length > 0 && (
          <div className="mt-3">
            <p className="mb-1.5 text-[11px] font-medium text-slate-400">
              Or load studio sample:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {samples.map((s) => (
                <button
                  key={s.name}
                  type="button"
                  onClick={() => onSelectSample(s)}
                  className={`max-w-[140px] truncate rounded-md border px-2 py-1 font-mono text-[10px] transition ${
                    imageInfo?.name === s.name
                      ? 'border-amber-500/60 bg-amber-500/15 text-amber-300'
                      : 'border-slate-800 bg-[#0C0F15] text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                  title={s.name}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 2. OOH Context Setup */}
      <section className="rounded-xl border border-slate-800/90 bg-[#11141B] p-4">
        <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
          <MapPin className="h-3.5 w-3.5 text-sky-400" />
          2. Placement Context
        </h2>

        <div className="mb-3.5">
          <label className="mb-1.5 block text-[11px] font-medium text-slate-400">
            OOH Format
          </label>
          <div className="grid grid-cols-1 gap-1.5">
            {OOH_FORMATS.map((fmt) => {
              const active = oohFormat === fmt.id
              return (
                <button
                  key={fmt.id}
                  id={`format-${fmt.id.toLowerCase().replace(/\s+/g, '-')}`}
                  type="button"
                  onClick={() => onChangeFormat(fmt.id)}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left transition ${
                    active
                      ? 'border-sky-500/60 bg-sky-500/10 text-slate-100'
                      : 'border-slate-800/90 bg-[#0C0F15] text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <span className="text-xs font-medium">{fmt.label}</span>
                  <span className="text-[10px] text-slate-500">{fmt.hint}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
            <Ruler className="h-3 w-3 text-slate-500" />
            Viewing Distance
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {VIEWING_DISTANCES.map((dist) => {
              const active = viewingDistance === dist.id
              return (
                <button
                  key={dist.id}
                  id={`distance-${dist.id}`}
                  type="button"
                  onClick={() => onChangeDistance(dist.id)}
                  className={`rounded-lg border px-2 py-2 text-center transition ${
                    active
                      ? 'border-amber-500/60 bg-amber-500/15 text-amber-200'
                      : 'border-slate-800/90 bg-[#0C0F15] text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <div className="font-mono text-xs font-semibold">{dist.label}</div>
                  <div className="text-[10px] text-slate-500">{dist.hint}</div>
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {/* 3. Interactive AOI Boxes */}
      <section className="rounded-xl border border-slate-800/90 bg-[#11141B] p-4">
        <div className="mb-2.5 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
            <SquareDashedMousePointer className="h-3.5 w-3.5 text-emerald-400" />
            3. AOI Regions
          </h2>
          {aois.length > 0 && (
            <button
              id="btn-clear-aois"
              type="button"
              onClick={onClearAois}
              className="text-[11px] font-medium text-slate-400 hover:text-rose-400"
            >
              Clear all
            </button>
          )}
        </div>

        <p className="mb-2.5 text-[11px] leading-relaxed text-slate-400">
          Select a label below, then drag on the creative to draw Areas of Interest.
        </p>

        <div className="mb-3 flex flex-wrap gap-1.5">
          {AOI_LABELS.map((item) => {
            const active = activeAoiLabel === item.id
            return (
              <button
                key={item.id}
                id={`aoi-label-${item.id.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                type="button"
                onClick={() => onChangeActiveAoiLabel(item.id)}
                className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[11px] font-medium transition ${
                  active
                    ? item.bgClass
                    : 'border-slate-800 bg-[#0C0F15] text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${item.dotClass}`} />
                {item.label}
              </button>
            )
          })}
        </div>

        {aois.length === 0 ? (
          <div className="rounded-lg border border-slate-800/70 bg-[#0C0F15] px-3 py-2.5 text-center text-[11px] text-slate-500">
            No AOI boxes drawn yet.
          </div>
        ) : (
          <div className="space-y-1.5">
            {aois.map((aoi) => {
              const attn = getAttentionForAoi(aoi.id)
              const color = getAoiColor(aoi.label)
              return (
                <div
                  key={aoi.id}
                  className="flex items-center justify-between rounded-lg border border-slate-800/80 bg-[#0C0F15] px-2.5 py-1.5"
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-sm"
                      style={{ backgroundColor: color }}
                    />
                    <span className="truncate text-xs font-medium text-slate-200">
                      {aoi.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {attn !== null && (
                      <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-amber-300">
                        {attn}%
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => onRemoveAoi(aoi.id)}
                      className="text-slate-500 hover:text-rose-400"
                      title="Remove AOI"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </aside>
  )
}
