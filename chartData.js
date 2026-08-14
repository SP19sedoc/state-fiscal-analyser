// Port of sorted-summit-plain/chart_data.py — precomputes render-ready trend-chart
// data. Pure math/string logic, no I/O, same 3-dimension scope and same "never
// fabricate a data point" guarantee as the Python original.

const TREND_DIMS = ["fiscal_position", "debt_sustainability", "devolution_and_grants"];

const TREND_SVG_WIDTH = 260;
const TREND_SVG_HEIGHT = 64;
const TREND_PAD = 8;

// Matches Python's f"{v:g}" (strips trailing .0 for whole numbers) closely enough
// for the percentage-range values this app deals with.
function fmtPct(v) {
  if (Number.isInteger(v)) return String(v);
  return parseFloat(v.toPrecision(6)).toString();
}

function round1(v) {
  return Math.round(v * 10) / 10;
}

/** Returns a trend-line chart object, or null if fewer than 2 real data points exist. */
function buildTrend(dim) {
  const raw = (dim && dim.trend) || [];
  const pts = raw
    .filter((t) => t && typeof t === 'object' && t.value !== null && t.value !== undefined)
    .map((t) => [t.year, t.value]);
  if (pts.length < 2) return null;

  let benchmarkPct = dim.benchmark_pct;
  benchmarkPct = (benchmarkPct !== null && benchmarkPct !== undefined) ? Number(benchmarkPct) : null;

  const values = pts.map(([, v]) => Number(v));
  const allVals = benchmarkPct !== null ? [...values, benchmarkPct] : values;
  let vmin = Math.min(...allVals);
  let vmax = Math.max(...allVals);
  if (vmin === vmax) {
    vmin -= 1;
    vmax += 1;
  }
  let span = vmax - vmin;
  vmin -= span * 0.15;
  vmax += span * 0.15;
  span = vmax - vmin;

  const n = pts.length;
  const w = TREND_SVG_WIDTH, h = TREND_SVG_HEIGHT, pad = TREND_PAD;

  const xFor = (i) => (n === 1 ? pad : pad + (i * (w - 2 * pad)) / (n - 1));
  const yFor = (v) => h - pad - ((v - vmin) / span) * (h - 2 * pad);

  const coords = pts.map(([, v], i) => [round1(xFor(i)), round1(yFor(Number(v)))]);
  const pointsStr = coords.map(([x, y]) => `${x},${y}`).join(' ');
  const dots = coords.map(([x, y]) => ({ x, y }));
  const benchmarkY = benchmarkPct !== null ? round1(yFor(benchmarkPct)) : null;

  const [firstYear, firstVal] = pts[0];
  const [lastYear, lastVal] = pts[pts.length - 1];
  let direction;
  if (Number(lastVal) > Number(firstVal)) direction = '▲';
  else if (Number(lastVal) < Number(firstVal)) direction = '▼';
  else direction = '—';

  return {
    kind: 'trend',
    width: w,
    height: h,
    pointsStr,
    dots,
    benchmarkY,
    benchmarkLabel: benchmarkPct !== null ? `Benchmark: ${fmtPct(benchmarkPct)}%` : null,
    firstLabel: firstYear,
    lastLabel: lastYear,
    valueLabel: `${fmtPct(Number(lastVal))}% ${direction}`,
  };
}

/** Returns {dim_key: chartObj | null} for the 3 trend-capable dimensions. */
function buildChartData(analysis) {
  const out = {};
  for (const dimKey of TREND_DIMS) {
    out[dimKey] = buildTrend(analysis[dimKey] || {});
  }
  return out;
}
