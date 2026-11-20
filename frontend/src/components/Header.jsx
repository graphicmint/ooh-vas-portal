import { useState } from 'react'
import { Eye, FileText, KeyRound, Play, Sparkles, Check, X } from 'lucide-react'

export default function Header({
  hasImage,
  hasResult,
  isAnalyzing,
  onAnalyze,
  onOpenReport,
  geminiConfiguredOnServer,
  customApiKey,
  onSaveApiKey,
}) {
  const [showKeyPopover, setShowKeyPopover] = useState(false)
  const [draftKey, setDraftKey] = useState(customApiKey || '')

  const keyActive = geminiConfiguredOnServer || Boolean(customApiKey)

  const handleSave = (e) => {
    e.preventDefault()
    onSaveApiKey(draftKey.trim())
    setShowKeyPopover(false)
  }

  return (
    <header className="no-print sticky top-0 z-30 border-b border-slate-800/80 bg-[#090B0F]/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1680px] items-center justify-between px-5">
        <div className="flex items-center gap-3.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400">
            <Eye className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-base font-semibold tracking-tight text-slate-100">
                OOH VisionLab
              </h1>
              <span className="rounded border border-slate-700/80 bg-slate-800/70 px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-slate-400">
                VAS Pre-Test
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Visual Attention Saliency &amp; Gemini OOH Creative Critique
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative">
            <button
              id="btn-gemini-key"
              type="button"
              onClick={() => {
                setDraftKey(customApiKey || '')
                setShowKeyPopover((v) => !v)
              }}
              className="flex items-center gap-2 rounded-lg border border-slate-800 bg-[#11141B] px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-slate-700 hover:text-white"
              title="Configure Gemini Vision API Key"
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  keyActive ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
              <KeyRound className="h-3.5 w-3.5 text-slate-400" />
              <span className="hidden sm:inline">
                {keyActive ? 'Gemini Connected' : 'Add Gemini Key'}
              </span>
            </button>

            {showKeyPopover && (
              <form
                onSubmit={handleSave}
                className="absolute right-0 mt-2 w-80 rounded-xl border border-slate-700/80 bg-[#131722] p-4 shadow-2xl"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-200">
                    Gemini Vision API Key
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowKeyPopover(false)}
                    className="text-slate-400 hover:text-slate-200"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="mb-3 text-[11px] leading-relaxed text-slate-400">
                  {geminiConfiguredOnServer
                    ? 'Server environment key is active. You may optionally override it below.'
                    : 'Optional: paste a Google AI Studio key for Gemini 2.5 Flash critique, or use built-in CV heuristics.'}
                </p>
                <input
                  id="input-gemini-key"
                  type="password"
                  value={draftKey}
                  onChange={(e) => setDraftKey(e.target.value)}
                  placeholder="AIza..."
                  className="mb-3 w-full rounded-lg border border-slate-700 bg-[#090B0F] px-3 py-2 font-mono text-xs text-slate-100 placeholder:text-slate-600 focus:border-amber-500 focus:outline-none"
                />
                <div className="flex justify-end gap-2">
                  {customApiKey && (
                    <button
                      type="button"
                      onClick={() => {
                        setDraftKey('')
                        onSaveApiKey('')
                        setShowKeyPopover(false)
                      }}
                      className="rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
                    >
                      Clear
                    </button>
                  )}
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-amber-400"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Save Key
                  </button>
                </div>
              </form>
            )}
          </div>

          <button
            id="btn-export-report"
            type="button"
            disabled={!hasResult}
            onClick={onOpenReport}
            className="flex items-center gap-2 rounded-lg border border-slate-700/80 bg-[#11141B] px-3.5 py-2 text-xs font-medium text-slate-200 transition hover:border-slate-600 hover:bg-slate-800/80 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <FileText className="h-3.5 w-3.5 text-sky-400" />
            <span>Export Pitch Report</span>
          </button>

          <button
            id="btn-run-analysis"
            type="button"
            disabled={!hasImage || isAnalyzing}
            onClick={onAnalyze}
            className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-xs font-semibold text-slate-950 shadow-sm transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isAnalyzing ? (
              <>
                <Sparkles className="h-3.5 w-3.5 animate-spin" />
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>Run Saliency Analysis</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  )
}
