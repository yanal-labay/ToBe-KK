import './PieChart.css'

// Fixed categorical hue order (never cycled/reassigned by rank) — spaced
// around the wheel so adjacent slices stay distinguishable at a glance.
const CATEGORY_COLORS = [
  '#4f8fd1',
  '#e8a33d',
  '#5fb87d',
  '#c1548f',
  '#8a6fd1',
  '#d1614f',
  '#4fb8b0',
  '#a3a3a3',
]

/**
 * A small pie chart with a legend, built from `conic-gradient` rather than
 * hand-rolled SVG arc math. Identity is never color-only: every legend row
 * also carries the label text and the raw count, and a table view of the
 * same data already exists alongside this chart in `RegistrantsPanel`.
 *
 * @param {{data: Array<{label: string, count: number}>}} props
 */
function PieChart({ data }) {
  const total = data.reduce((sum, d) => sum + d.count, 0)
  if (total === 0) return <p>אין נתונים להצגה.</p>

  let cursor = 0
  const stops = data.map((d, i) => {
    const start = (cursor / total) * 360
    cursor += d.count
    const end = (cursor / total) * 360
    const color = CATEGORY_COLORS[i % CATEGORY_COLORS.length]
    return `${color} ${start}deg ${end}deg`
  })

  return (
    <div className="pie-chart">
      <div
        className="pie-chart-circle"
        role="img"
        aria-label="תרשים עוגה של ההתפלגות"
        style={{ background: `conic-gradient(${stops.join(', ')})` }}
      />
      <div className="pie-chart-legend">
        {data.map((d, i) => (
          <div className="pie-chart-legend-row" key={`${i}-${d.label}`}>
            <span
              className="pie-chart-swatch"
              style={{ background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}
            />
            <span className="pie-chart-legend-label">{d.label}</span>
            <span className="pie-chart-legend-count">
              {d.count} ({Math.round((d.count / total) * 100)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default PieChart
