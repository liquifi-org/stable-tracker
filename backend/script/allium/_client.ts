/**
 * Allium Explorer API client (config, types and async-run helpers).
 *
 * Required env vars:
 *   ALLIUM_API_KEY
 *   DB_URL
 *   ALLIUM_WALLETS_QUERY_ID (optional)
 */

export const BASE_URL = 'https://api.allium.so/api/v1';
export const API_KEY = process.env.ALLIUM_API_KEY;
export const DB_URL = process.env.DB_URL ?? 'mongodb://localhost:27017/sc-tracker';

export const WALLETS_QUERY_ID =
    process.env.ALLIUM_WALLETS_QUERY_ID ?? 'o0VH4UGyeKr55L34qxPG';

export const CORRIDORS_QUERY_ID =
    process.env.ALLIUM_CORRIDORS_QUERY_ID ?? 'MxaKAhHTsM0QohPMPqne';

export const RUN_LIMIT = 10000;
export const POLL_INTERVAL_MS = 5000;
export const MAX_POLLS = 120;

export function assertApiKey(): void {
    if (!API_KEY) {
        console.error('ALLIUM_API_KEY environment variable is required.');
        process.exit(1);
    }
}

export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

interface RunAsyncResponse {
    run_id: string;
}

export type RunStatus =
    | 'created'
    | 'queued'
    | 'running'
    | 'success'
    | 'failed'
    | 'canceled'
    | string;

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
    return { 'X-API-KEY': API_KEY as string, ...extra };
}

export async function runQueryAsync(
    queryId: string,
    parameters: Record<string, unknown> = {},
    limit: number = RUN_LIMIT,
): Promise<string> {
    const url = `${BASE_URL}/explorer/queries/${queryId}/run-async`;
    const response = await fetch(url, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ parameters, run_config: { limit } }),
    });

    if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`run-async failed: HTTP ${response.status} ${text}`);
    }

    const data = (await response.json()) as RunAsyncResponse;
    if (!data.run_id) {
        throw new Error(`run-async returned no run_id: ${JSON.stringify(data)}`);
    }
    return data.run_id;
}

export async function getRunStatus(runId: string): Promise<RunStatus> {
    const url = `${BASE_URL}/explorer/query-runs/${runId}/status`;
    const response = await fetch(url, { headers: authHeaders() });

    if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`status failed: HTTP ${response.status} ${text}`);
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
        const body = (await response.json()) as unknown;
        if (typeof body === 'string') return body as RunStatus;
        if (body && typeof body === 'object' && 'status' in body) {
            return String((body as { status: unknown }).status) as RunStatus;
        }
        return String(body) as RunStatus;
    }
    return (await response.text()).trim().replace(/^"|"$/g, '') as RunStatus;
}

export type ResultRow = Record<string, unknown>;

interface ResultsResponse {
    data?: ResultRow[];
    meta?: unknown;
}

export async function getRunResults(runId: string): Promise<ResultRow[]> {
    const url = `${BASE_URL}/explorer/query-runs/${runId}/results`;
    const response = await fetch(url, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ config: { limit: RUN_LIMIT } }),
    });

    if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`results failed: HTTP ${response.status} ${text}`);
    }

    const body = (await response.json()) as ResultsResponse | ResultRow[];
    if (Array.isArray(body)) return body;
    return body.data ?? [];
}

export async function runAndWait(
    queryId: string,
    parameters: Record<string, unknown> = {},
    limit: number = RUN_LIMIT,
): Promise<ResultRow[]> {
    console.log(`Triggering Allium query ${queryId}...`);
    const runId = await runQueryAsync(queryId, parameters, limit);
    console.log(`run_id: ${runId}`);

    for (let attempt = 1; attempt <= MAX_POLLS; attempt++) {
        const status = await getRunStatus(runId);
        const lower = status.toLowerCase();

        if (lower === 'success') {
            console.log('Query run completed.');
            return getRunResults(runId);
        }
        if (lower === 'failed' || lower === 'canceled') {
            throw new Error(`Query run ${runId} ended with status "${status}".`);
        }

        console.log(`status "${status}" (poll ${attempt}/${MAX_POLLS})`);
        await sleep(POLL_INTERVAL_MS);
    }

    throw new Error(`Query run ${runId} did not complete after ${MAX_POLLS} polls.`);
}

