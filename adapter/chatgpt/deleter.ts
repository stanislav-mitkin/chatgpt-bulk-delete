const CHUNK_SIZE = 5;
const CHUNK_DELAY_MS = 150;

interface DeleteResult {
  succeeded: string[];
  failed: string[];
}

async function getAuthToken(): Promise<string | null> {
  try {
    const res = await fetch('https://chatgpt.com/api/auth/session', {
      credentials: 'include',
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.accessToken ?? null;
  } catch {
    return null;
  }
}

async function deleteOne(id: string, token: string): Promise<boolean> {
  try {
    const res = await fetch(`https://chatgpt.com/backend-api/conversation/${id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      // ChatGPT soft-deletes via PATCH {is_visible: false}
      body: JSON.stringify({ is_visible: false }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function deleteConversations(
  ids: string[],
  onProgress?: (done: number, total: number) => void,
): Promise<DeleteResult> {
  const token = await getAuthToken();
  if (!token) return { succeeded: [], failed: ids };

  const succeeded: string[] = [];
  const failed: string[] = [];
  const chunks = chunk(ids, CHUNK_SIZE);
  let done = 0;

  for (const batch of chunks) {
    const results = await Promise.all(batch.map((id) => deleteOne(id, token)));
    batch.forEach((id, i) => {
      if (results[i]) succeeded.push(id);
      else failed.push(id);
    });
    done += batch.length;
    onProgress?.(done, ids.length);
    if (done < ids.length) await sleep(CHUNK_DELAY_MS);
  }

  return { succeeded, failed };
}
