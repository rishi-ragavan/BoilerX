/*
 * c3Call — the single C3 API bridge (same contract as the c3-frontend reference `c3Action.ts`).
 *
 * POSTs the `{ thisArg, args, kwargs }` envelope (header `x-request-envelope: true`) to
 * `<appBase>/api/8/<TypeName>/<actionName>`. Implemented with `fetch` so the package needs no extra dependency.
 * BoilerConnect rule: the UI only calls ForumApi, AiPipeline, and DmApi — never entity types directly.
 */

export function getCookieValue(cookieName: string): string | undefined {
  const cookie = document?.cookie
    ?.split(';')
    ?.map((c) => c.trim())
    .find((c) => c.startsWith(cookieName + '='));
  return cookie ? cookie.split('=')[1] : undefined;
}

export function getAppBaseUrl(): string {
  const c3AppUrlPrefix = getCookieValue('c3AppUrlPrefix');
  const c3env = getCookieValue('c3env');
  const c3app = getCookieValue('c3app');

  let baseUrl = window.location.origin;
  if (c3AppUrlPrefix !== undefined) {
    baseUrl = `${baseUrl}/${c3AppUrlPrefix}`;
  } else if (c3env && c3app) {
    baseUrl = `${baseUrl}/${c3env}/${c3app}`;
  }

  return baseUrl.replace(/\/$/, '');
}

export async function c3Call<T = unknown>(
  typeName: string,
  actionName: string,
  thisArg?: unknown,
  args?: unknown[],
  kwargs?: Record<string, unknown>
): Promise<T> {
  const url = `${getAppBaseUrl()}/api/8/${typeName}/${actionName}`;
  const envelope: Record<string, unknown> = {
    thisArg: thisArg ?? typeName,
    args: args ?? [],
  };
  if (kwargs && Object.keys(kwargs).length > 0) {
    envelope.kwargs = kwargs;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-request-envelope': 'true' },
    body: JSON.stringify(envelope),
  });

  if (response.status === 204) return null as T;

  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const serverMessage =
      data && typeof data === 'object' && 'message' in data ? String((data as { message: unknown }).message) : '';
    throw new Error(cleanServerMessage(serverMessage) || `${typeName}.${actionName} failed (${response.status})`);
  }
  return data as T;
}

/** Strips the Java/JS stack noise so `err.message` is the human sentence thrown on the server. */
function cleanServerMessage(msg: string): string {
  const m = msg.match(/Error: ([^\n(]+?)(?: \(\/|\n|$)/);
  return (m ? m[1] : msg).trim();
}

export default c3Call;
