import { useEffect, useState } from 'react'
import { AlertCircle, Eye, Sparkles, UploadCloud } from 'lucide-react'
import AnalysisSidebar from './components/AnalysisSidebar'
import AoiCanvas from './components/AoiCanvas'
import ComparisonViewer from './components/ComparisonViewer'
import Header from './components/Header'
import PitchReportModal from './components/PitchReportModal'
import UploadPanel from './components/UploadPanel'

export default function App() {
  const [samples, setSamples] = useState([])
  const [geminiConfiguredOnServer, setGeminiConfiguredOnServer] = useState(false)
  const [customApiKey, setCustomApiKey] = useState(() => {
    try {
      return localStorage.getItem('ooh_visionlab_gemini_key') || ''
    } catch {
      return ''
    }
  })

  const [selectedFile, setSelectedFile] = useState(null)
  const [imageUrl, setImageUrl] = useState(null)
  const [imageInfo, setImageInfo] = useState(null)

  const [oohFormat, setOohFormat] = useState('Highway Unipole')
  const [viewingDistance, setViewingDistance] = useState('100m')
  const [activeAoiLabel, setActiveAoiLabel] = useState('Brand Logo')
  const [aois, setAois] = useState([])

  const [stageMode, setStageMode] = useState('draw') // 'draw' | 'results'
  const [activeView, setActiveView] = useState('heatmap')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const [showReport, setShowReport] = useState(false)

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((d) => setGeminiConfiguredOnServer(Boolean(d.gemini_configured)))
      .catch(() => {})

    fetch('/api/samples')
      .then((r) => r.json())
      .then((d) => setSamples(d.samples || []))
      .catch(() => {})
  }, [])

  const handleSaveApiKey = (key) => {
    setCustomApiKey(key)
    try {
      if (key) {
        localStorage.setItem('ooh_visionlab_gemini_key', key)
      } else {
        localStorage.removeItem('ooh_visionlab_gemini_key')
      }
    } catch {
      // ignore storage errors
    }
  }

  const loadFileIntoStudio = (file) => {
    const objectUrl = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      setImageInfo({
        name: file.name,
        width: img.naturalWidth,
        height: img.naturalHeight,
        sizeKb: (file.size / 1024).toFixed(1),
      })
    }
    img.src = objectUrl

    setSelectedFile(file)
    setImageUrl(objectUrl)
    setAois([])
    setResult(null)
    setError(null)
    setStageMode('draw')
  }

  const handleSelectSample = async (sample) => {
    try {
      setError(null)
      const res = await fetch(sample.url)
      if (!res.ok) throw new Error('Failed to fetch sample creative')
      const blob = await res.blob()
      const file = new File([blob], sample.name, { type: blob.type || 'image/png' })
      loadFileIntoStudio(file)
    } catch (err) {
      setError(err.message)
    }
  }

  const handleAnalyze = async () => {
    if (!selectedFile) return
    setIsAnalyzing(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('ooh_format', oohFormat)
      formData.append('viewing_distance', viewingDistance)
      formData.append('aois', JSON.stringify(aois))
      if (customApiKey) {
        formData.append('gemini_api_key', customApiKey)
      }

      const res = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.detail || `Analysis failed (${res.status})`)
      }

      const data = await res.json()
      setResult(data)
      setStageMode('results')
      setActiveView('heatmap')
    } catch (err) {
      setError(err.message)
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#090B0F] text-slate-100">
      <Header
        hasImage={Boolean(selectedFile)}
        hasResult={Boolean(result)}
        isAnalyzing={isAnalyzing}
        onAnalyze={handleAnalyze}
        onOpenReport={() => setShowReport(true)}
        geminiConfiguredOnServer={geminiConfiguredOnServer}
        customApiKey={customApiKey}
        onSaveApiKey={handleSaveApiKey}
      />

      <main className="mx-auto grid max-w-[1680px] grid-cols-1 gap-5 px-5 py-5 lg:grid-cols-[300px_1fr] xl:grid-cols-[310px_1fr_360px]">
        {/* Left Control Rail */}
        <UploadPanel
          imageInfo={imageInfo}
          samples={samples}
          onFileSelected={loadFileIntoStudio}
          onSelectSample={handleSelectSample}
          oohFormat={oohFormat}
          onChangeFormat={setOohFormat}
          viewingDistance={viewingDistance}
          onChangeDistance={setViewingDistance}
          activeAoiLabel={activeAoiLabel}
          onChangeActiveAoiLabel={setActiveAoiLabel}
          aois={aois}
          aoiMetrics={result?.aoi_metrics}
          onRemoveAoi={(id) => setAois((prev) => prev.filter((a) => a.id !== id))}
          onClearAois={() => setAois([])}
        />

        {/* Center Visual Studio Stage */}
        <section className="no-print flex min-w-0 flex-col gap-3">
          {error && (
            <div className="flex items-center gap-2.5 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {!imageUrl ? (
            <div className="flex min-h-[540px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 bg-[#0C0F15] p-8 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-800 bg-[#11141B] text-amber-400">
                <UploadCloud className="h-7 w-7" />
              </div>
              <h2 className="text-base font-semibold text-slate-200">
                Load an OOH Creative to Begin Pre-Testing
              </h2>
              <p className="mt-1.5 max-w-md text-xs leading-relaxed text-slate-400">
                Drag and drop a billboard, airport gantry, or DOOH creative on the left — or click one of the studio sample creatives to test saliency heatmaps, gaze paths, and distance legibility.
              </p>
              {samples.length > 0 && (
                <button
                  id="btn-quick-load-sample"
                  type="button"
                  onClick={() => handleSelectSample(samples[0])}
                  className="mt-5 flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/15 px-4 py-2 text-xs font-semibold text-amber-300 transition hover:bg-amber-500/25"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Load Sample Creative ({samples[0].name})
                </button>
              )}
            </div>
          ) : stageMode === 'results' && result ? (
            <ComparisonViewer
              result={result}
              activeView={activeView}
              onChangeView={setActiveView}
              onSwitchToDraw={() => setStageMode('draw')}
            />
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800/90 bg-[#11141B] px-4 py-2.5">
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <Eye className="h-4 w-4 text-amber-400" />
                  <span>
                    <strong>AOI Drawing Mode:</strong> Drag on the creative to mark{' '}
                    <span className="text-amber-300">{activeAoiLabel}</span>
                  </span>
                </div>
                {result && (
                  <button
                    type="button"
                    onClick={() => setStageMode('results')}
                    className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-medium text-slate-200 hover:bg-slate-700"
                  >
                    Back to Analysis View
                  </button>
                )}
              </div>

              <div className="flex min-h-[480px] items-center justify-center rounded-xl border border-slate-800/90 bg-[#0C0F15] p-4">
                <AoiCanvas
                  imageUrl={imageUrl}
                  aois={aois}
                  activeLabel={activeAoiLabel}
                  onAddAoi={(box) => setAois((prev) => [...prev, box])}
                  onRemoveAoi={(id) =>
                    setAois((prev) => prev.filter((a) => a.id !== id))
                  }
                  aoiMetrics={result?.aoi_metrics}
                />
              </div>
            </div>
          )}
        </section>

        {/* Right Analysis & AI Critique Rail */}
        {result ? (
          <AnalysisSidebar result={result} />
        ) : (
          <aside className="no-print hidden xl:flex flex-col justify-center rounded-xl border border-slate-800/70 bg-[#11141B]/60 p-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Diagnostic Output
            </p>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              Draw optional AOI boxes over Brand Logo, Headline, and Product/CTA, then click{' '}
              <strong className="text-amber-400">Run Saliency Analysis</strong> to compute visual attention % and Gemini Vision critique.
            </p>
          </aside>
        )}
      </main>

      {showReport && result && (
        <PitchReportModal result={result} onClose={() => setShowReport(false)} />
      )}
    </div>
  )
}
