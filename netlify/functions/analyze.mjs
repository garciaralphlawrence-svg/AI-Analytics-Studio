// POST /api/analyze — the AI analyst behind AI Analytics Studio.
//
// The browser sends the whole (parsed) dataset. Claude never sees the raw rows
// in bulk: it gets the column profile + a few sample rows, and answers by
// calling run_query, which computes exact aggregates over every row here on
// the server. It finishes by calling submit_dashboard / submit_answer, whose
// chart specs the browser re-runs with the identical query engine to draw.
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import Anthropic from '@anthropic-ai/sdk';
import { runQuery, AGGS, GRAINS, OPS } from '../lib/query.mjs';
import { gate, json, corsHeaders, MODEL } from '../lib/shared.mjs';

const client = new Anthropic();

const MAX_ROWS = 20000;
const MAX_COLUMNS = 60;
const MAX_TOOL_ROUNDS = 8;
const WRAP_UP_STEP = 2;  // from the 3rd step on, ask the model to deliver

const nullable = (schema) => ({ anyOf: [schema, { type: 'null' }] });

const QUERY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['measure', 'agg', 'groupBy', 'timeGrain', 'filters', 'sort', 'limit'],
  properties: {
    measure: nullable({ type: 'string', description: 'Numeric column to aggregate; null to count rows' }),
    agg: { type: 'string', enum: AGGS },
    groupBy: nullable({ type: 'string', description: 'Column to group by; null for a single total' }),
    timeGrain: { type: 'string', enum: GRAINS, description: 'Bucket size when groupBy is a date column, else "none"' },
    filters: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['column', 'op', 'value'],
        properties: {
          column: { type: 'string' },
          op: { type: 'string', enum: OPS },
          value: { type: 'string', description: 'Compared as a number for numeric columns; dates as YYYY-MM-DD; "in" takes values separated by |' },
        },
      },
    },
    sort: { type: 'string', enum: ['desc', 'asc', 'label'] },
    limit: { type: 'integer', description: 'Max groups to return, 0 for all' },
  },
};

const CHART_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['type', 'title', 'subtitle', 'query'],
  properties: {
    type: { type: 'string', enum: ['kpi', 'bar', 'hbar', 'line', 'area', 'pie', 'donut', 'table'] },
    title: { type: 'string' },
    subtitle: { type: 'string', description: 'One short line on why this chart matters' },
    query: QUERY_SCHEMA,
  },
};

const RUN_QUERY = {
  name: 'run_query',
  description:
    'Compute an exact aggregate over ALL rows of the dataset. Use it for every number you state. ' +
    'Returns labels/values per group (or a single total), plus how many rows matched the filters.',
  strict: true,
  input_schema: QUERY_SCHEMA,
};

const SUBMIT_DASHBOARD = {
  name: 'submit_dashboard',
  description: 'Deliver the finished dashboard. Call exactly once, after you have checked your numbers with run_query.',
  strict: true,
  input_schema: {
    type: 'object',
    additionalProperties: false,
    required: ['title', 'summary', 'kpis', 'charts', 'insights', 'questions'],
    properties: {
      title: { type: 'string', description: 'Dashboard title, max ~6 words' },
      summary: { type: 'string', description: '2 sentences: what this data is and the headline finding' },
      kpis: { type: 'array', description: '3–4 headline numbers', items: CHART_SCHEMA },
      charts: { type: 'array', description: '4–6 charts that tell the story, most important first', items: CHART_SCHEMA },
      insights: {
        type: 'array',
        description: '4–5 specific, numeric, decision-useful findings',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['headline', 'detail', 'tone'],
          properties: {
            headline: { type: 'string' },
            detail: { type: 'string' },
            tone: { type: 'string', enum: ['positive', 'negative', 'neutral'] },
          },
        },
      },
      questions: { type: 'array', description: '3 follow-up questions a manager would ask next', items: { type: 'string' } },
    },
  },
};

const SUBMIT_ANSWER = {
  name: 'submit_answer',
  description: 'Deliver the answer to the user\'s question. Call exactly once, after checking numbers with run_query.',
  strict: true,
  input_schema: {
    type: 'object',
    additionalProperties: false,
    required: ['answer', 'chart', 'followups'],
    properties: {
      answer: { type: 'string', description: 'Direct answer in 1–3 sentences of markdown, with the exact numbers' },
      chart: nullable(CHART_SCHEMA),
      followups: { type: 'array', items: { type: 'string' }, description: '2 natural follow-up questions' },
    },
  },
};

const SYSTEM = `You are the senior data analyst inside "AI Analytics Studio".
You are given a dataset's column profile and a few sample rows. The full data is only reachable through the run_query tool.

Rules:
- Every number you state must come from a run_query result in this conversation. Never estimate from the sample rows.
- Prefer several focused queries (in parallel when independent) over guessing.
- Charts: use line/area for trends over a date column (timeGrain month unless the range is short), bar/hbar for
  comparing categories (hbar when labels are long; limit 8–12), pie/donut only for shares with ≤6 groups,
  kpi for single totals (groupBy null), table for rankings with many rows.
- Column names in queries must match the profile exactly.
- Write for a busy manager: concrete, numeric, no filler. Format money with the currency evident in the data if any.
- Finish by calling the submit tool exactly once.`;

function validateDataset(d) {
  if (!d || !Array.isArray(d.columns) || !Array.isArray(d.rows)) return 'dataset.columns and dataset.rows are required';
  if (!d.columns.length || d.columns.length > MAX_COLUMNS) return `1–${MAX_COLUMNS} columns supported`;
  if (!d.rows.length) return 'dataset has no rows';
  if (d.rows.length > MAX_ROWS) return `datasets up to ${MAX_ROWS.toLocaleString()} rows are supported`;
  for (const c of d.columns) {
    if (typeof c.name !== 'string' || !['number', 'date', 'category', 'text'].includes(c.type)) return 'bad column';
  }
  return null;
}

function describeDataset(d) {
  const profile = d.columns.map((c) => {
    const { name, type, ...stats } = c;
    return `- ${name} (${type}) ${JSON.stringify(stats)}`;
  }).join('\n');
  const sample = d.rows.slice(0, 8).map((r) => JSON.stringify(r)).join('\n');
  return `Dataset: "${String(d.name || 'Untitled').slice(0, 120)}" — ${d.rows.length.toLocaleString()} rows.\n\nColumns:\n${profile}\n\nSample rows:\n${sample}`;
}

// ---- step state ---------------------------------------------------------
// Netlify cuts a function off at ~30s, but a full analysis takes longer.
// So each request runs ONE model step; the browser sends the returned state
// back to continue. The state is HMAC-signed so a caller can't inject their
// own conversation and use this endpoint as a free general-purpose AI.
const STATE_KEY = createHash('sha256').update(`analyze-state:${process.env.STATE_SECRET || process.env.ANTHROPIC_API_KEY || ''}`).digest();
const sign = (str) => createHmac('sha256', STATE_KEY).update(str).digest('base64url');
function openState(state, sig, datasetHash) {
  if (typeof state !== 'string' || typeof sig !== 'string' || state.length > 400_000) return null;
  const expected = Buffer.from(sign(state));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  const st = JSON.parse(state);
  // Bind the state to this dataset so it can't be replayed against other data.
  return st.datasetHash === datasetHash ? st : null;
}

export default async (req, context) => {
  const early = gate(req, context, { limit: 60, windowMs: 10 * 60_000 });
  if (early) return early;

  let body;
  try { body = await req.json(); } catch { return json(req, 400, { error: 'Invalid JSON' }); }
  const mode = body.mode === 'ask' ? 'ask' : 'dashboard';
  const bad = validateDataset(body.dataset);
  if (bad) return json(req, 400, { error: bad });
  const question = typeof body.question === 'string' ? body.question.trim().slice(0, 500) : '';
  if (mode === 'ask' && !question) return json(req, 400, { error: 'question is required' });

  const { columns, rows } = body.dataset;
  const datasetHash = createHash('sha256').update(JSON.stringify(columns)).update(String(rows.length)).digest('hex');
  const submitTool = mode === 'ask' ? SUBMIT_ANSWER : SUBMIT_DASHBOARD;

  let st;
  if (body.state) {
    st = openState(body.state, body.sig, datasetHash);
    if (!st || st.mode !== mode) return json(req, 400, { error: 'Invalid analysis state — please start again.' });
  } else {
    const task = mode === 'ask'
      ? `Question: ${question}\n\nAnswer it with run_query, then call submit_answer (include a chart when it helps).`
      : 'Explore this dataset with run_query (run your queries together in one step where you can) and build the most insightful executive dashboard you can, then call submit_dashboard.';
    st = { mode, datasetHash, step: 0, queries: 0, messages: [{ role: 'user', content: `${describeDataset(body.dataset)}\n\n${task}` }] };
  }
  if (st.step >= MAX_TOOL_ROUNDS) return json(req, 400, { error: 'The analysis took too many steps. Please try again.' });

  // Streamed as newline-delimited JSON: ping/progress/query events, then exactly
  // one of: result | continue (with signed state) | error.
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj) => controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'));
      const heartbeat = setInterval(() => send({ type: 'ping' }), 5000);
      try {
        send({ type: 'progress', step: st.step, queries: st.queries });
        const response = await client.beta.messages.create({
          model: MODEL,
          max_tokens: 16000,
          betas: ['server-side-fallback-2026-07-01'],
          fallbacks: 'default',
          output_config: { effort: 'low' },
          system: SYSTEM,
          tools: [RUN_QUERY, submitTool],
          messages: st.messages,
        });

        if (response.stop_reason === 'refusal') return send({ type: 'error', error: 'The AI declined to analyze this request.' });
        if (response.stop_reason === 'max_tokens') return send({ type: 'error', error: 'The analysis ran too long. Try a smaller dataset or question.' });

        const toolUses = response.content.filter((b) => b.type === 'tool_use');
        const submit = toolUses.find((b) => b.name === submitTool.name);
        if (submit) return send({ type: 'result', mode, result: submit.input, queries: st.queries });

        st.messages.push({ role: 'assistant', content: response.content });
        if (!toolUses.length) {
          // Model answered in prose without the submit tool — nudge it.
          st.messages.push({ role: 'user', content: `Please deliver the result by calling ${submitTool.name}.` });
        } else {
          const results = toolUses.map((tu) => {
            if (tu.name !== 'run_query') {
              return { type: 'tool_result', tool_use_id: tu.id, is_error: true, content: `Call ${submitTool.name} only on its own, after your queries.` };
            }
            st.queries++;
            try {
              const r = runQuery(rows, columns, tu.input);
              send({ type: 'query', queries: st.queries, label: describeQuery(r.spec) });
              return { type: 'tool_result', tool_use_id: tu.id, content: JSON.stringify({ labels: r.labels, values: r.values, total: r.total, rowsMatched: r.rowsMatched }) };
            } catch (e) {
              return { type: 'tool_result', tool_use_id: tu.id, is_error: true, content: String(e.message || e) };
            }
          });
          // After a few rounds of exploring, ask for the finished result.
          const wrapUp = st.step >= WRAP_UP_STEP;
          st.messages.push({ role: 'user', content: wrapUp
            ? [...results, { type: 'text', text: `You have enough. Call ${submitTool.name} now.` }]
            : results });
        }
        st.step++;
        const state = JSON.stringify(st);
        send({ type: 'continue', state, sig: sign(state), queries: st.queries });
      } catch (err) {
        console.error('analyze error', err?.status, err?.message);
        send({ type: 'error', error: err?.status === 429 ? 'The AI is busy. Try again in a moment.' : 'The AI service is unavailable right now.' });
      } finally {
        clearInterval(heartbeat);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { ...corsHeaders(req), 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  });
};

function describeQuery(q) {
  const what = q.measure ? `${q.agg} of ${q.measure}` : 'row count';
  const by = q.groupBy ? ` by ${q.groupBy}${q.timeGrain && q.timeGrain !== 'none' ? ` (${q.timeGrain})` : ''}` : '';
  const where = q.filters?.length ? ` where ${q.filters.map((f) => `${f.column} ${f.op} ${f.value}`).join(', ')}` : '';
  return `${what}${by}${where}`.replace(/_/g, ' ');
}

export const config = { path: '/api/analyze' };
