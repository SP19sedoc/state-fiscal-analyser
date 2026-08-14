// Shared constants — port of sorted-summit-plain/config.py

const DEFAULT_MODEL = 'claude-sonnet-4-6';
const MAX_EXTRACT_CHARS = 120_000;   // cap on the uploaded budget document's extracted text
const MAX_FILE_MB = 50;

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Delhi", "Jammu and Kashmir", "Ladakh", "Puducherry",
];

const DIMENSIONS = [
  "revenue_profile",
  "expenditure_quality",
  "committed_expenditure",
  "fiscal_position",
  "debt_sustainability",
  "off_budget_borrowings",
  "subsidy_burden",
  "devolution_and_grants",
  "budget_credibility",
];

const DIMENSION_LABELS = {
  revenue_profile:        "Revenue Profile",
  expenditure_quality:    "Expenditure Quality",
  committed_expenditure:  "Committed Expenditure",
  fiscal_position:        "Fiscal Position",
  debt_sustainability:    "Debt Sustainability",
  off_budget_borrowings:  "Off-Budget Borrowings",
  subsidy_burden:         "Subsidy Burden",
  devolution_and_grants:  "Devolution & Grants",
  budget_credibility:     "Budget Credibility",
};

// (severity, headline field, chart-eligible) — port of report_redesign_v07.html's `dims` table
const DIM_META = [
  { key: "revenue_profile",       label: "Revenue Profile",       headline: "own_tax_revenue_share",   severity: "neutral", chart: null },
  { key: "expenditure_quality",   label: "Expenditure Quality",   headline: "capex_share",             severity: "neutral", chart: null },
  { key: "committed_expenditure", label: "Committed Expenditure", headline: "total_committed_share",   severity: "warning", chart: null },
  { key: "fiscal_position",       label: "Fiscal Position",       headline: "fiscal_deficit_gsdp",     severity: "neutral", chart: "fiscal_position" },
  { key: "debt_sustainability",   label: "Debt Sustainability",   headline: "debt_gsdp_ratio",         severity: "warning", chart: "debt_sustainability" },
  { key: "off_budget_borrowings", label: "Off-Budget Borrowings", headline: "adjusted_fiscal_deficit", severity: "concern", chart: null },
  { key: "subsidy_burden",        label: "Subsidy Burden",        headline: "total_subsidy_share",     severity: "warning", chart: null },
  { key: "devolution_and_grants", label: "Devolution & Grants",   headline: "fc_devolution_share",     severity: "neutral", chart: "devolution_and_grants" },
  { key: "budget_credibility",    label: "Budget Credibility",    headline: "overall_credibility",     severity: "neutral", chart: null },
];

// Port of upload_redesign_v06.html's PROVIDERS object
const PROVIDERS = {
  anthropic: {
    note: 'Calls go directly from your browser to Anthropic. Get a key at <a href="https://console.anthropic.com" target="_blank">console.anthropic.com</a>. You pay Anthropic for usage.',
    placeholder: 'sk-ant-…',
    keyPrefix: 'sk-ant-',
    models: [
      { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6 — recommended' },
      { id: 'claude-opus-4-8',   label: 'Claude Opus 4.8 — deepest reasoning' },
      { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 — cheapest' },
    ],
  },
  openrouter: {
    note: 'Calls go directly from your browser to OpenRouter, which proxies many providers including DeepSeek, Gemini, GPT, and Claude. One key, many models. Get a key at <a href="https://openrouter.ai/keys" target="_blank">openrouter.ai/keys</a>.',
    placeholder: 'sk-or-…',
    keyPrefix: 'sk-or-',
    models: [
      { id: 'deepseek/deepseek-chat-v3-0324', label: 'DeepSeek V3 — recommended, very cheap' },
      { id: 'deepseek/deepseek-r1',           label: 'DeepSeek R1 — reasoning, cheap' },
      { id: 'google/gemini-2.5-pro',          label: 'Gemini 2.5 Pro' },
      { id: 'openai/gpt-4o',                  label: 'GPT-4o' },
      { id: 'anthropic/claude-sonnet-4-5',    label: 'Claude Sonnet 4.5 (via OpenRouter)' },
      { id: 'meta-llama/llama-3.3-70b-instruct', label: 'Llama 3.3 70B (open weight)' },
    ],
  },
};
