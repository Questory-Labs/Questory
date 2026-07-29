const MAX_RETRIES = 3;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function providerFetch(
  url: string | URL,
  init?: RequestInit,
  opts?: { retries?: number },
): Promise<Response> {
  const retries = opts?.retries ?? MAX_RETRIES;
  let lastRes: Response | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(url, init);
    lastRes = res;
    if (res.ok || (res.status < 500 && res.status !== 429)) {
      return res;
    }
    if (attempt < retries) {
      await sleep(500 * 2 ** attempt);
    }
  }

  return lastRes!;
}
