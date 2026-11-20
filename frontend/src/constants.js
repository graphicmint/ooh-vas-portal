export const OOH_FORMATS = [
  { id: 'Highway Unipole', label: 'Highway Unipole', hint: 'High-speed roadside, 3s glance' },
  { id: 'Airport Gantry', label: 'Airport Gantry', hint: 'Concourse overhead, medium dwell' },
  { id: 'Retail Facade', label: 'Retail Facade', hint: 'Street-level pedestrian & traffic' },
  { id: 'Digital DOOH', label: 'Digital DOOH', hint: 'High-luminance LED rotation' },
]

export const VIEWING_DISTANCES = [
  { id: '30m', label: '30m', hint: 'Close / Street' },
  { id: '100m', label: '100m', hint: 'Mid / Arterial' },
  { id: '200m', label: '200m', hint: 'Far / Highway' },
]

export const AOI_LABELS = [
  {
    id: 'Brand Logo',
    label: 'Brand Logo',
    color: '#F59E0B',
    bgClass: 'bg-amber-500/15 text-amber-300 border-amber-500/50',
    dotClass: 'bg-amber-400',
  },
  {
    id: 'Headline',
    label: 'Headline',
    color: '#38BDF8',
    bgClass: 'bg-sky-500/15 text-sky-300 border-sky-500/50',
    dotClass: 'bg-sky-400',
  },
  {
    id: 'Product/CTA',
    label: 'Product/CTA',
    color: '#10B981',
    bgClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/50',
    dotClass: 'bg-emerald-400',
  },
]

export const getAoiColor = (label) => {
  const found = AOI_LABELS.find((item) => item.id === label)
  return found ? found.color : '#F59E0B'
}
