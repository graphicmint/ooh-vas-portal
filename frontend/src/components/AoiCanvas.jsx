import { useRef, useState } from 'react'
import { X } from 'lucide-react'
import { getAoiColor } from '../constants'

export default function AoiCanvas({
  imageUrl,
  aois,
  activeLabel,
  onAddAoi,
  onRemoveAoi,
  aoiMetrics,
}) {
  const containerRef = useRef(null)
  const [drawStart, setDrawStart] = useState(null)
  const [draftBox, setDraftBox] = useState(null)

  const getNormalizedPoint = (e) => {
    const rect = containerRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
    return { x, y }
  }

  const handlePointerDown = (e) => {
    if (e.target.closest('button')) return
    e.currentTarget.setPointerCapture(e.pointerId)
    const pt = getNormalizedPoint(e)
    setDrawStart(pt)
    setDraftBox({ x: pt.x, y: pt.y, width: 0, height: 0 })
  }

  const handlePointerMove = (e) => {
    if (!drawStart) return
    const pt = getNormalizedPoint(e)
    const x = Math.min(drawStart.x, pt.x)
    const y = Math.min(drawStart.y, pt.y)
    const width = Math.abs(pt.x - drawStart.x)
    const height = Math.abs(pt.y - drawStart.y)
    setDraftBox({ x, y, width, height })
  }

  const handlePointerUp = () => {
    if (!drawStart || !draftBox) {
      setDrawStart(null)
      setDraftBox(null)
      return
    }
    if (draftBox.width >= 0.02 && draftBox.height >= 0.02) {
      onAddAoi({
        id: `aoi-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        label: activeLabel,
        x: Number(draftBox.x.toFixed(4)),
        y: Number(draftBox.y.toFixed(4)),
        width: Number(draftBox.width.toFixed(4)),
        height: Number(draftBox.height.toFixed(4)),
      })
    }
    setDrawStart(null)
    setDraftBox(null)
  }

  const getAttention = (id) => {
    if (!aoiMetrics) return null
    const found = aoiMetrics.find((m) => m.id === id)
    return found ? found.attention_pct : null
  }

  return (
    <div className="flex flex-col items-center justify-center">
      <div
        id="aoi-drawing-surface"
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="relative inline-block max-h-[68vh] select-none overflow-hidden rounded-lg border border-slate-700/80 bg-[#07090D] shadow-xl cursor-crosshair"
      >
        <img
          src={imageUrl}
          alt="Uploaded OOH Creative"
          draggable={false}
          className="block max-h-[68vh] w-auto max-w-full object-contain pointer-events-none"
        />

        {/* Existing AOI boxes */}
        {aois.map((aoi) => {
          const color = getAoiColor(aoi.label)
          const attn = getAttention(aoi.id)
          return (
            <div
              key={aoi.id}
              style={{
                left: `${aoi.x * 100}%`,
                top: `${aoi.y * 100}%`,
                width: `${aoi.width * 100}%`,
                height: `${aoi.height * 100}%`,
                borderColor: color,
                backgroundColor: `${color}1A`,
              }}
              className="absolute border-2 transition-colors"
            >
              <div
                style={{ backgroundColor: color }}
                className="absolute -top-5 left-0 flex items-center gap-1 rounded-t px-1.5 py-0.5 text-[10px] font-semibold text-slate-950 whitespace-nowrap shadow"
              >
                <span>{aoi.label}</span>
                {attn !== null && (
                  <span className="rounded bg-slate-950/20 px-1 font-mono">
                    {attn}%
                  </span>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onRemoveAoi(aoi.id)
                  }}
                  className="ml-0.5 rounded hover:bg-slate-950/20"
                  title="Delete box"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            </div>
          )
        })}

        {/* Active draft box while dragging */}
        {draftBox && draftBox.width > 0.005 && draftBox.height > 0.005 && (
          <div
            style={{
              left: `${draftBox.x * 100}%`,
              top: `${draftBox.y * 100}%`,
              width: `${draftBox.width * 100}%`,
              height: `${draftBox.height * 100}%`,
              borderColor: getAoiColor(activeLabel),
              backgroundColor: `${getAoiColor(activeLabel)}26`,
            }}
            className="absolute border-2 border-dashed pointer-events-none"
          />
        )}
      </div>
    </div>
  )
}
