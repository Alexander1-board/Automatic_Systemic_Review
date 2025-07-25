import { ApiLog } from '../components/DiagnosticsPanel';

export const apiLogs: ApiLog[] = [];

export async function loggedFetch(url: string, init?: RequestInit) {
  const start = performance.now();
  try {
    const res = await fetch(url, init);
    const ms = Math.round(performance.now() - start);
    apiLogs.push({ endpoint: url, ms, status: res.status });
    return res;
  } catch (e) {
    const ms = Math.round(performance.now() - start);
    apiLogs.push({ endpoint: url, ms, status: 0 });
    throw e;
  }
}
