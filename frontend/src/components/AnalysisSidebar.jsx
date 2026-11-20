import {
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Eye,
  Layers,
  Sparkles,
  Type,
} from 'lucide-react'
import { getAoiColor } from '../constants'

function ScoreRing({ score }) {
  const colorClass =
    score >= 78
      ? 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10'
      : score >= 58
      ? 'text-amber-400 border-amber-500/40 bg-amber-500/10'
      : 'text-rose-400 border-rose-500/40 bg-rose-500/10'

  return (
    <div
      className={`flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-xl border ${colorClass}`}
    >
      <span className="font-mono text-2xl font-bold leading-none">{score}</span>
      <span className="mt-0.5 font-mono text-[9px] uppercase tracking-wider opacity-80">
        / 100
      </span>
    </div>
  )
}

export default function AnalysisSidebar({ result }) {
  const { critique, aoi_metrics: aoiMetrics = [] } = result
  const isGemini = critique.source === 'gemini-2.5-flash'

  const priorityBadge = (priority) => {
    if (priority === 'High') {
      return 'border-rose-500/40 bg-rose-500/15 text-rose-300'
    }
    if (priority === 'Medium') {
      return 'border-amber-500/40 bg-amber-500/15 text-amber-300'
    }
    return 'border-sky-500/40 bg-sky-500/15 text-sky-300'
  }

  return (
    <aside className="no-print flex flex-col gap-4">
      {/* Overall Score Card */}
      <section className="rounded-xl border border-slate-800/90 bg-[#11141B] p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            OOH Impact Score
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] font-medium ${
              isGemini
                ? 'border-sky-500/40 bg-sky-500/10 text-sky-300'
                : 'border-slate-700 bg-slate-800/80 text-slate-300'
            }`}
            title={critique.fallback_reason || 'Powered by Gemini 2.5 Flash'}
          >
            {isGemini ? (
              <>
                <Sparkles className="h-2.5 w-2.5" />
                Gemini 2.5 Flash
              </>
            ) : (
              <>
                <Cpu className="h-2.5 w-2.5" />
                CV Heuristic Mode
              </>
            )}
          </span>
        </div>

        <div className="flex items-center gap-3.5">
          <ScoreRing score={critique.overall_score} />
          <p className="text-xs font-medium leading-relaxed text-slate-200">
            {critique.verdict_headline}
          </p>
        </div>
      </section>

      {/* AOI Attention Breakdown */}
      <section className="rounded-xl border border-slate-800/90 bg-[#11141B] p-4">
        <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
          <Layers className="h-3.5 w-3.5 text-amber-400" />
          AOI Attention Share
        </h3>
        {aoiMetrics.length === 0 ? (
          <p className="text-xs text-slate-500">
            No AOI boxes were drawn. Click &ldquo;Edit AOIs&rdquo; to measure attention % on Brand Logo, Headline, or Product/CTA.
          </p>
        ) : (
          <div className="space-y-2.5">
            {aoiMetrics.map((aoi) => {
              const color = getAoiColor(aoi.label)
              return (
                <div key={aoi.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 font-medium text-slate-200">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      {aoi.label}
                    </span>
                    <span className="font-mono font-semibold text-slate-100">
                      {aoi.attention_pct}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, Math.max(2, aoi.attention_pct))}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>
                  <div className="flex justify-between font-mono text-[10px] text-slate-500">
                    <span>Peak: {aoi.peak_intensity}%</span>
                    <span>Area: {aoi.area_pct}%</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* 3-Second Glance & Copy Brevity & Contrast */}
      <section className="space-y-3 rounded-xl border border-slate-800/90 bg-[#11141B] p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
          Creative Critique
        </h3>

        {/* 3-Second Glance Comprehension */}
        <div className="rounded-lg border border-slate-800/80 bg-[#0C0F15] p-3">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
              <Eye className="h-3.5 w-3.5 text-sky-400" />
              3-Second Comprehension
            </span>
            <span className="font-mono text-xs font-semibold text-sky-300">
              {critique.three_second_comprehension.score}/100 ·{' '}
              {critique.three_second_comprehension.status}
            </span>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-400">
            {critique.three_second_comprehension.analysis}
          </p>
        </div>

        {/* Word Count & Copy Brevity */}
        <div className="rounded-lg border border-slate-800/80 bg-[#0C0F15] p-3">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
              <Type className="h-3.5 w-3.5 text-amber-400" />
              Copy Brevity (&le; 7 Words)
            </span>
            {critique.copy_brevity.exceeds_limit ? (
              <span className="inline-flex items-center gap-1 rounded border border-rose-500/40 bg-rose-500/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-rose-300">
                <AlertTriangle className="h-2.5 w-2.5" />
                {critique.copy_brevity.word_count} words (&gt;7)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded border border-emerald-500/40 bg-emerald-500/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-emerald-300">
                <CheckCircle2 className="h-2.5 w-2.5" />
                {critique.copy_brevity.word_count > 0
                  ? `${critique.copy_brevity.word_count} words`
                  : 'Checked'}
              </span>
            )}
          </div>
          {critique.copy_brevity.extracted_copy && (
            <p className="mb-1.5 rounded bg-slate-900/90 px-2 py-1 font-mono text-[10px] text-slate-300">
              &ldquo;{critique.copy_brevity.extracted_copy}&rdquo;
            </p>
          )}
          <p className="text-[11px] leading-relaxed text-slate-400">
            {critique.copy_brevity.analysis}
          </p>
        </div>

        {/* Contrast & Clutter */}
        <div className="rounded-lg border border-slate-800/80 bg-[#0C0F15] p-3">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-200">
              Contrast &amp; Clutter
            </span>
            <span className="font-mono text-xs font-semibold text-emerald-300">
              {critique.contrast_and_clutter.score}/100 ·{' '}
              {critique.contrast_and_clutter.status}
            </span>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-400">
            {critique.contrast_and_clutter.analysis}
          </p>
        </div>
      </section>

      {/* Recommendations */}
      <section className="rounded-xl border border-slate-800/90 bg-[#11141B] p-4">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-300">
          Actionable Recommendations
        </h3>
        <div className="space-y-2.5">
          {critique.recommendations.map((rec, i) => (
            <div
              key={i}
              className="rounded-lg border border-slate-800/80 bg-[#0C0F15] p-3"
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-200">
                  {rec.title}
                </span>
                <span
                  className={`shrink-0 rounded border px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase ${priorityBadge(
                    rec.priority
                  )}`}
                >
                  {rec.priority}
                </span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-400">
                {rec.detail}
              </p>
            </div>
          ))}
        </div>
      </section>
    </aside>
  )
}
