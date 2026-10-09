export function putFile(
  url: string,
  body: Blob,
  headers: Record<string, string>,
  onProgress?: (percent: number | null) => void,
  signal?: AbortSignal,
): Promise<{ ok: boolean; status: number; json: () => Promise<Record<string, unknown>> }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.withCredentials = true;
    for (const [key, value] of Object.entries(headers)) xhr.setRequestHeader(key, value);
    xhr.upload.onprogress = (event) => {
      if (!onProgress) return;
      if (event.lengthComputable && event.total > 0) {
        onProgress((event.loaded / event.total) * 100);
      } else {
        onProgress(null);
      }
    };
    xhr.onload = () => {
      const text = xhr.responseText;
      resolve({
        ok: xhr.status >= 200 && xhr.status < 300,
        status: xhr.status,
        json: async () => (text ? (JSON.parse(text) as Record<string, unknown>) : {}),
      });
    };
    xhr.onerror = () => reject(new Error("Could not store the file"));
    xhr.onabort = () => reject(new DOMException("Upload cancelled", "AbortError"));
    if (signal) {
      if (signal.aborted) {
        xhr.abort();
        return;
      }
      signal.addEventListener("abort", () => xhr.abort(), { once: true });
    }
    onProgress?.(0);
    xhr.send(body);
  });
}
