import { Printer, X } from 'lucide-react'

export default function PitchReportModal({ result, onClose }) {
  const { context, overlays, aoi_metrics: aoiMetrics = [], critique } = result

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 p-4 sm:p-8 backdrop-blur-sm">
      <div className="print-only-container w-full max-w-5xl rounded-2xl bg-white text-slate-900 shadow-2xl">
        {/* Modal Action Bar (hidden on print) */}
        <div className="no-print flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
            <span className="text-sm font-semibold text-slate-800">
              Executive Pitch Report Preview
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              id="btn-print-report"
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
            >
              <Printer className="h-3.5 w-3.5" />
              Print / Save PDF
            </button>
            <button
              id="btn-close-report"
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 p-2 text-slate-600 hover:bg-slate-100"
              title="Close report"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Printable Report Body */}
        <div className="space-y-6 p-6 sm:p-8">
          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5">
            <div>
              <p className="font-mono text-xs font-semibold uppercase tracking-wider text-amber-600">
                OOH VisionLab · Visual Attention Pre-Test Report
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                {context.filename}
              </h2>
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-600">
                <span>
                  Format: <strong>{context.ooh_format}</strong>
                </span>
                <span>·</span>
                <span>
                  Viewing Distance: <strong>{context.viewing_distance}</strong>
                </span>
                <span>·</span>
                <span>
                  Resolution:{' '}
                  <strong>
                    {result.dimensions.width}×{result.dimensions.height}px
                  </strong>
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-5 py-3 text-center">
              <div className="font-mono text-3xl font-bold text-slate-900">
                {critique.overall_score}
                <span className="text-base font-normal text-slate-500">/100</span>
              </div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                OOH Impact Score
              </div>
            </div>
          </div>

          <p className="rounded-lg border-l-4 border-amber-500 bg-amber-50/70 px-4 py-3 text-sm font-medium text-slate-800">
            {critique.verdict_headline}
          </p>

          {/* 4 Visual Overlays */}
          <div>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
              Visual Attention &amp; Legibility Overlays
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[
                { key: 'original', label: '1. Original Creative' },
                { key: 'heatmap', label: '2. 3M VAS-Style Saliency Heatmap (55%)' },
                { key: 'gaze_path', label: '3. Predicted Gaze Sequence (1–5)' },
                {
                  key: 'distance_blur',
                  label: `4. Distance Simulation (${context.viewing_distance})`,
                },
              ].map((item) => (
                <div
                  key={item.key}
                  className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
                >
                  <div className="border-b border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700">
                    {item.label}
                  </div>
                  <div className="flex items-center justify-center bg-slate-900/5 p-2">
                    <img
                      src={overlays[item.key]}
                      alt={item.label}
                      className="max-h-56 w-auto object-contain"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AOI Table */}
          {aoiMetrics.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                Area of Interest (AOI) Attention Breakdown
              </h3>
              <table className="w-full border-collapse overflow-hidden rounded-lg border border-slate-200 text-left text-xs">
                <thead className="bg-slate-100 text-slate-600">
                  <tr>
                    <th className="border-b border-slate-200 px-3 py-2 font-semibold">
                      AOI Element
                    </th>
                    <th className="border-b border-slate-200 px-3 py-2 font-semibold">
                      Attention Share
                    </th>
                    <th className="border-b border-slate-200 px-3 py-2 font-semibold">
                      Peak Saliency
                    </th>
                    <th className="border-b border-slate-200 px-3 py-2 font-semibold">
                      Canvas Area
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {aoiMetrics.map((aoi) => (
                    <tr key={aoi.id} className="border-b border-slate-100">
                      <td className="px-3 py-2 font-medium text-slate-800">
                        {aoi.label}
                      </td>
                      <td className="px-3 py-2 font-mono font-bold text-slate-900">
                        {aoi.attention_pct}%
                      </td>
                      <td className="px-3 py-2 font-mono text-slate-600">
                        {aoi.peak_intensity}%
                      </td>
                      <td className="px-3 py-2 font-mono text-slate-600">
                        {aoi.area_pct}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Critique Metrics */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-slate-200 p-4">
              <div className="mb-1 text-xs font-bold text-slate-800">
                3-Second Comprehension ({critique.three_second_comprehension.score}/100)
              </div>
              <p className="text-xs leading-relaxed text-slate-600">
                {critique.three_second_comprehension.analysis}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <div className="mb-1 text-xs font-bold text-slate-800">
                Copy Brevity ({critique.copy_brevity.word_count} words
                {critique.copy_brevity.exceeds_limit ? ' — Exceeds 7-Word Rule' : ''})
              </div>
              <p className="text-xs leading-relaxed text-slate-600">
                {critique.copy_brevity.analysis}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <div className="mb-1 text-xs font-bold text-slate-800">
                Contrast &amp; Clutter ({critique.contrast_and_clutter.score}/100)
              </div>
              <p className="text-xs leading-relaxed text-slate-600">
                {critique.contrast_and_clutter.analysis}
              </p>
            </div>
          </div>

          {/* Recommendations */}
          <div>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
              Creative Director Recommendations
            </h3>
            <div className="space-y-2">
              {critique.recommendations.map((rec, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">
                      {i + 1}. {rec.title}
                    </span>
                    <span className="font-mono text-[10px] font-semibold uppercase text-slate-500">
                      {rec.priority} Priority
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">{rec.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
