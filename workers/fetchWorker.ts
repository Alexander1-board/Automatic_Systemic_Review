self.onmessage = async (e) => {
  const { id, url } = e.data as { id: number; url: string };
  const start = performance.now();
  try {
    const res = await fetch(url);
    const data = await res.json();
    const ms = Math.round(performance.now() - start);
    self.postMessage({ id, data, log: { endpoint: url, ms, status: res.status } });
  } catch {
    const ms = Math.round(performance.now() - start);
    self.postMessage({ id, data: null, log: { endpoint: url, ms, status: 0 } });
  }
};
