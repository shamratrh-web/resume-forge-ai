import dotenv from 'dotenv';
import os from 'os';
import { getRuntimeTokens } from './tokens';
dotenv.config();

function parseBoolean(value: string | undefined, fallback: boolean) {
  if (value === undefined) return fallback;
  return value.toLowerCase() === 'true';
}

function parsePositiveInt(value: string | undefined, fallback: number, min: number = 1) {
  const parsed = Number.parseInt(value || '', 10);
  if (!Number.isFinite(parsed) || parsed < min) {
    return fallback;
  }
  return parsed;
}

const parsedTokens = getRuntimeTokens();
const defaultPowWorkerPoolSize = Math.max(2, Math.min(8, Math.floor(Math.max(1, os.cpus().length) / 2)));

export const config = {
  // Credentials
  DEEPSEEK_TOKEN: parsedTokens[0] || '',
  DEEPSEEK_TOKENS: parsedTokens,
  MONGODB_URI: process.env.MONGODB_URI || '',
  APP_SECRET: process.env.APP_SECRET || 'default-secret',

  // Config Toggles
  ENABLE_WEB_SEARCH: parseBoolean(process.env.ENABLE_WEB_SEARCH, true),
  MAX_RETRIES: parsePositiveInt(process.env.MAX_RETRIES, 3),

  // Worker Runtime Controls
  TOKEN_CONCURRENCY: parsePositiveInt(process.env.TOKEN_CONCURRENCY, 3),
  ADAPTIVE_TOKEN_CONCURRENCY: parseBoolean(process.env.ADAPTIVE_TOKEN_CONCURRENCY, true),
  TOKEN_BACKOFF_WINDOW_MS: parsePositiveInt(process.env.TOKEN_BACKOFF_WINDOW_MS, 180000, 0),
  TOKEN_RECOVERY_SUCCESS_STREAK: parsePositiveInt(process.env.TOKEN_RECOVERY_SUCCESS_STREAK, 6),
  SUCCESS_DELAY_MS: parsePositiveInt(process.env.SUCCESS_DELAY_MS, 500, 0),
  EMPTY_QUEUE_DELAY_MS: parsePositiveInt(process.env.EMPTY_QUEUE_DELAY_MS, 3000, 0),
  ERROR_DELAY_MS: parsePositiveInt(process.env.ERROR_DELAY_MS, 5000, 0),
  STARTUP_STAGGER_MS: parsePositiveInt(process.env.STARTUP_STAGGER_MS, 350, 0),
  MAX_PROMPTS_PER_SESSION: parsePositiveInt(process.env.MAX_PROMPTS_PER_SESSION, 1100),
  CHAT_EMPTY_RETRY_ATTEMPTS: parsePositiveInt(process.env.CHAT_EMPTY_RETRY_ATTEMPTS, 2),
  API_REQUEST_TIMEOUT_MS: parsePositiveInt(process.env.API_REQUEST_TIMEOUT_MS, 60000),
  UPLOAD_REQUEST_TIMEOUT_MS: parsePositiveInt(process.env.UPLOAD_REQUEST_TIMEOUT_MS, 150000, 5000),
  STREAM_REQUEST_TIMEOUT_MS: parsePositiveInt(process.env.STREAM_REQUEST_TIMEOUT_MS, 180000),
  POW_MAX_RETRIES: parsePositiveInt(process.env.POW_MAX_RETRIES, 5, 0),
  POW_RETRY_BASE_DELAY_MS: parsePositiveInt(process.env.POW_RETRY_BASE_DELAY_MS, 1200, 100),
  POW_RETRY_MAX_DELAY_MS: parsePositiveInt(process.env.POW_RETRY_MAX_DELAY_MS, 10000, 500),
  POW_PENDING_CHALLENGE_DELAY_MS: parsePositiveInt(process.env.POW_PENDING_CHALLENGE_DELAY_MS, 2000, 500),
  POW_PENDING_CHALLENGE_MAX_WAIT_MS: parsePositiveInt(
    process.env.POW_PENDING_CHALLENGE_MAX_WAIT_MS,
    30000,
    1000
  ),
  POW_WORKER_POOL_ENABLED: parseBoolean(process.env.POW_WORKER_POOL_ENABLED, true),
  POW_WORKER_POOL_SIZE: parsePositiveInt(process.env.POW_WORKER_POOL_SIZE, defaultPowWorkerPoolSize, 1),
  POW_WORKER_READY_TIMEOUT_MS: parsePositiveInt(process.env.POW_WORKER_READY_TIMEOUT_MS, 15000, 1000),
  POW_WORKER_RESTART_DELAY_MS: parsePositiveInt(process.env.POW_WORKER_RESTART_DELAY_MS, 1500, 100),
  SERIALIZE_POW_SOLVE: parseBoolean(process.env.SERIALIZE_POW_SOLVE, true),
  SERIALIZE_UPLOAD_PIPELINE: parseBoolean(process.env.SERIALIZE_UPLOAD_PIPELINE, false),
  FILE_METADATA_MISSING_GRACE_MS: parsePositiveInt(process.env.FILE_METADATA_MISSING_GRACE_MS, 300000, 0),
  DOCUMENT_UPLOAD_READY_TIMEOUT_MS: parsePositiveInt(
    process.env.DOCUMENT_UPLOAD_READY_TIMEOUT_MS,
    45000,
    1000
  ),
  DOCUMENT_UPLOAD_READY_POLL_INTERVAL_MS: parsePositiveInt(
    process.env.DOCUMENT_UPLOAD_READY_POLL_INTERVAL_MS,
    1000,
    200
  ),
  DOCUMENT_UPLOAD_MISSING_METADATA_GRACE_MS: parsePositiveInt(
    process.env.DOCUMENT_UPLOAD_MISSING_METADATA_GRACE_MS,
    15000,
    1000
  ),
  DOCUMENT_FILE_PIPELINE_CONCURRENCY: parsePositiveInt(
    process.env.DOCUMENT_FILE_PIPELINE_CONCURRENCY,
    4
  ),
  DOCUMENT_CHUNK_MAX_ATTEMPTS: parsePositiveInt(process.env.DOCUMENT_CHUNK_MAX_ATTEMPTS, 8),
  DOCUMENT_PROMPT_CROSS_TOKEN_RETRY_ATTEMPT: parsePositiveInt(
    process.env.DOCUMENT_PROMPT_CROSS_TOKEN_RETRY_ATTEMPT,
    10,
    2
  ),
  DOCUMENT_CHUNK_RETRY_BASE_DELAY_MS: parsePositiveInt(process.env.DOCUMENT_CHUNK_RETRY_BASE_DELAY_MS, 5000, 500),
  DOCUMENT_CHUNK_RETRY_MAX_DELAY_MS: parsePositiveInt(process.env.DOCUMENT_CHUNK_RETRY_MAX_DELAY_MS, 60000, 2000),
  DOCUMENT_PARTIAL_OUTPUT_ON_FAILURE: parseBoolean(process.env.DOCUMENT_PARTIAL_OUTPUT_ON_FAILURE, true),
  DASHBOARD_ENABLED: parseBoolean(process.env.DASHBOARD_ENABLED, true),
  DASHBOARD_REFRESH_MS: parsePositiveInt(process.env.DASHBOARD_REFRESH_MS, 2500, 500),
  DASHBOARD_MAX_WORKERS_VIEW: parsePositiveInt(process.env.DASHBOARD_MAX_WORKERS_VIEW, 40),
  DASHBOARD_WORKER_PAGE_SECONDS: parsePositiveInt(process.env.DASHBOARD_WORKER_PAGE_SECONDS, 6),
  DASHBOARD_USE_ALT_SCREEN: parseBoolean(process.env.DASHBOARD_USE_ALT_SCREEN, false),
  DASHBOARD_USE_COLOR: parseBoolean(process.env.DASHBOARD_USE_COLOR, true),
  QUIET_PROCESS_LOGS: parseBoolean(process.env.QUIET_PROCESS_LOGS, true),
  STORAGE_PAUSE_THRESHOLD_PERCENT: parsePositiveInt(process.env.STORAGE_PAUSE_THRESHOLD_PERCENT, 99),
  STORAGE_RESUME_THRESHOLD_PERCENT: parsePositiveInt(process.env.STORAGE_RESUME_THRESHOLD_PERCENT, 97),
  STORAGE_GUARD_REFRESH_MS: parsePositiveInt(process.env.STORAGE_GUARD_REFRESH_MS, 15000, 2000),
  TOKEN_ENV_RELOAD_ENABLED: parseBoolean(process.env.TOKEN_ENV_RELOAD_ENABLED, true),
  TOKEN_ENV_RELOAD_MS: parsePositiveInt(process.env.TOKEN_ENV_RELOAD_MS, 10000, 3000),

  // Routing/Cooldown Controls
  ROUTING_ENABLED: parseBoolean(process.env.ROUTING_ENABLED, true),
  EMPTY_RESPONSE_COOLDOWN_MINUTES: parsePositiveInt(process.env.EMPTY_RESPONSE_COOLDOWN_MINUTES, 10),
  EMPTY_RESPONSE_COOLDOWN_THRESHOLD: parsePositiveInt(process.env.EMPTY_RESPONSE_COOLDOWN_THRESHOLD, 2),
  RATE_LIMIT_COOLDOWN_MINUTES: parsePositiveInt(process.env.RATE_LIMIT_COOLDOWN_MINUTES, 2),
  STALLED_TASK_TIMEOUT_MINUTES: parsePositiveInt(process.env.STALLED_TASK_TIMEOUT_MINUTES, 30),

  // Prompting
  SYSTEM_PROMPT: `You are an advanced AI processor.
Your goal is to extract accurate information and think deeply about the problem.
You MUST ALWAYS use your web search capability to verify facts, find the latest data, and enrich your answer.
Even if you know the answer, verify it with search.
Provide citations for all factual claims.`,
  
  // Paths
  WASM_PATH: process.env.WASM_PATH || 'lib/ai/wasm/sha3_wasm_bg.wasm'
};

if (!config.DEEPSEEK_TOKEN) {
  console.warn('WARNING: DEEPSEEK_TOKEN/DEEPSEEK_TOKENS is missing in .env');
}
