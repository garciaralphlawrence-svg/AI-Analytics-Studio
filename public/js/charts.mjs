// Renders a chart spec ({type, title, subtitle, query}) into a card element,
// computing the numbers locally with the same engine the AI used.
import { runQuery } from './query.mjs';

const instances = new Set();
const PALETTE = ['#6d5dfc', '#22d3ee', '#f472b6', '#fbbf24', '#34d399', '#a78bfa', '#fb7185', '#38bdf8', '#a3e635', '#f97316'];

const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

export function formatValue(v, col, compact = true) {
  if (v === null || v === undefined || Number.isNaN(v)) return '—';
  const money = col && col.money;
  const abs = Math.abs(v);
  let s;
  if (compact && abs >= 1e9) s = (v / 1e9).toFixed(2).replace(/\.?0+$/, '') + 'B';
  else if (compact && abs >= 1e6) s = (v / 1e6).toFixed(2).replace(/\.?0+$/, '') + 'M';
  else if (compact && abs >= 1e4) s = (v / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
  else s = v.toLocaleString(undefined, { maximumFractionDigits: abs < 10 ? 2 : abs < 1000 ? 1 : 0 });
  return (money ? '₱' : '') + s;
}

export function prettyLabel(label) {
  // 2025-03 → Mar 2025; 2025-Q2 stays; 2025-03-14 → Mar 14
  const m = String(label).match(/^(\d{4})-(\d{2})$/);
  if (m) return new Date(+m[1], +m[2] - 1, 1).toLocaleString(undefined, { month: 'short', year: 'numeric' });
  const d = String(label).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (d) return new Date(+d[1], +d[2] - 1, +d[3]).toLocaleString(undefined, { month: 'short', day: 'numeric' });
  return String(label);
}

function measureLabel(q) {
  if (!q.measure) return 'Count';
  const agg = { sum: 'Total', avg: 'Average', min: 'Min', max: 'Max', count: 'Count of', distinct: 'Distinct' }[q.agg] || '';
  return `${agg} ${q.measure.replace(/_/g, ' ')}`;
}

export function disposeCharts(scope) {
  for (const inst of [...instances]) {
    if (!scope || scope.contains(inst.getDom())) { resizer.unobserve(inst.getDom()); inst.dispose(); instances.delete(inst); }
  }
}

// Each chart watches its own box, so it re-fits when the layout changes
// (presentation mode, panel collapse, window resize, print).
const resizer = new ResizeObserver((entries) => {
  for (const e of entries) window.echarts.getInstanceByDom(e.target)?.resize();
});

/** Renders spec into `card` (a .card element). dataset = {columns, rows}. Returns the query result. */
export function renderChart(card, spec, dataset) {
  const colByName = Object.fromEntries(dataset.columns.map((c) => [c.name, c]));
  const res = runQuery(dataset.rows, dataset.columns, spec.query || {});
  const q = res.spec;
  const measureCol = q.measure ? colByName[q.measure] : null;
  const fmtCol = q.agg === 'count' || q.agg === 'distinct' ? null : measureCol;
  card.dataset.type = spec.type;
  card.innerHTML = `<div class="card-head"><div><h3></h3><p class="sub"></p></div><div class="card-tools">
      <button class="tool csv" title="Download data as CSV" aria-label="Download chart data">⤓</button></div></div>
    <div class="card-body"></div>`;
  card.querySelector('h3').textContent = spec.title || measureLabel(q);
  card.querySelector('.sub').textContent = spec.subtitle || '';
  card.querySelector('.csv').addEventListener('click', () => downloadCSV(spec.title || 'chart', q.groupBy || 'label', measureLabel(q), res));
  const bodyEl = card.querySelector('.card-body');

  if (spec.type === 'kpi') {
    bodyEl.innerHTML = '<div class="kpi-value">0</div><div class="kpi-foot"></div>';
    countUp(bodyEl.querySelector('.kpi-value'), res.total ?? 0, (v) => formatValue(v, fmtCol));
    bodyEl.querySelector('.kpi-foot').textContent = `${measureLabel(q)} · ${res.rowsMatched.toLocaleString()} rows`;
    return res;
  }

  if (spec.type === 'table') {
    const max = Math.max(...res.values.map((v) => Math.abs(v || 0)), 1);
    bodyEl.innerHTML = `<div class="rank-table">${res.labels.slice(0, 15).map((l, i) => `
      <div class="rank-row"><span class="rank-i">${i + 1}</span><span class="rank-l"></span>
      <span class="rank-bar"><i style="width:${Math.round((Math.abs(res.values[i] || 0) / max) * 100)}%"></i></span>
      <span class="rank-v">${formatValue(res.values[i], fmtCol)}</span></div>`).join('')}</div>`;
    bodyEl.querySelectorAll('.rank-l').forEach((el, i) => { el.textContent = prettyLabel(res.labels[i]); });
    return res;
  }

  const el = document.createElement('div');
  el.className = 'echart';
  bodyEl.appendChild(el);
  const chart = window.echarts.init(el, null, { renderer: 'canvas' });
  instances.add(chart);
  resizer.observe(el);

  const text = css('--text-2') || '#9aa0c3';
  const grid = css('--grid') || 'rgba(255,255,255,.07)';
  const labels = res.labels.map(prettyLabel);
  const tooltip = {
    trigger: spec.type === 'pie' || spec.type === 'donut' ? 'item' : 'axis',
    backgroundColor: css('--tooltip-bg') || 'rgba(17,19,40,.95)', borderColor: 'transparent',
    textStyle: { color: css('--text-1') || '#fff', fontSize: 12 },
    valueFormatter: (v) => formatValue(v, fmtCol, false),
  };
  const base = {
    color: PALETTE, animationDuration: 900, animationEasing: 'cubicOut', tooltip,
    textStyle: { fontFamily: 'Inter, system-ui, sans-serif' },
  };
  let option;
  if (spec.type === 'pie' || spec.type === 'donut') {
    option = { ...base,
      legend: { bottom: 0, type: 'scroll', textStyle: { color: text, fontSize: 11 }, icon: 'circle', itemWidth: 8 },
      series: [{ type: 'pie', radius: spec.type === 'donut' ? ['48%', '72%'] : ['0%', '72%'], center: ['50%', '45%'],
        itemStyle: { borderRadius: 6, borderColor: css('--card') || '#14162b', borderWidth: 2 },
        label: { color: text, formatter: '{d}%', fontSize: 11 }, data: labels.map((name, i) => ({ name, value: res.values[i] })) }],
    };
  } else {
    const horizontal = spec.type === 'hbar';
    const isLine = spec.type === 'line' || spec.type === 'area';
    const catAxis = { type: 'category', data: labels, axisLine: { lineStyle: { color: grid } }, axisTick: { show: false },
      axisLabel: { color: text, fontSize: 11, ...(horizontal ? { width: 110, overflow: 'truncate' }
        : !isLine ? { interval: 0, rotate: labels.length > 6 ? 28 : 0, width: 90, overflow: 'truncate' } : { hideOverlap: true }) } };
    // Averages over time read better zoomed to their range; totals and bars start at zero.
    const valAxis = { type: 'value', scale: isLine && q.agg === 'avg', splitLine: { lineStyle: { color: grid } }, axisLabel: { color: text, fontSize: 11, formatter: (v) => formatValue(v, fmtCol) } };
    option = { ...base,
      grid: { left: 8, right: 16, top: 12, bottom: 8, containLabel: true },
      xAxis: horizontal ? valAxis : catAxis,
      yAxis: horizontal ? { ...catAxis, inverse: true } : valAxis,
      series: [{
        type: isLine ? 'line' : 'bar', data: res.values, name: measureLabel(q),
        smooth: isLine ? 0.35 : undefined, showSymbol: isLine && labels.length < 20, symbolSize: 6,
        lineStyle: isLine ? { width: 3, shadowBlur: 12, shadowColor: 'rgba(109,93,252,.45)' } : undefined,
        areaStyle: spec.type === 'area' ? { color: new window.echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(109,93,252,.45)' }, { offset: 1, color: 'rgba(109,93,252,0)' }]) } : undefined,
        barMaxWidth: 34,
        itemStyle: isLine ? undefined : { borderRadius: horizontal ? [0, 6, 6, 0] : [6, 6, 0, 0],
          color: new window.echarts.graphic.LinearGradient(horizontal ? 1 : 0, horizontal ? 0 : 0, 0, horizontal ? 0 : 1, [{ offset: 0, color: '#8b7bff' }, { offset: 1, color: '#22d3ee' }]) },
        emphasis: { focus: 'series' },
      }],
    };
  }
  chart.setOption(option);
  return res;
}

function countUp(el, target, fmt) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { el.textContent = fmt(target); return; }
  const start = performance.now();
  const dur = 1100;
  (function frame(now) {
    // rAF timestamps can be slightly earlier than `start`; clamp so values never go negative.
    const t = Math.min(1, Math.max(0, (now - start) / dur));
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = fmt(target * eased);
    if (t < 1) requestAnimationFrame(frame); else el.textContent = fmt(target);
  })(start);
}

function downloadCSV(title, labelHead, valueHead, res) {
  const quote = (s) => `"${String(s).replace(/"/g, '""')}"`;
  const lines = [[labelHead, valueHead].map(quote).join(','), ...res.labels.map((l, i) => `${quote(l)},${res.values[i] ?? ''}`)];
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }));
  a.download = `${title.replace(/[^\w\- ]+/g, '').trim() || 'chart'}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
