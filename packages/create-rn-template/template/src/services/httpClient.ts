import type { ApiResult } from '@/types/template';
import { ZippyProbe } from '@bear1210/zippy-rn';

const fetchWithZippy = ZippyProbe.attachFetch(fetch);

export async function getJson<T>(url: string): Promise<ApiResult<T>> {
  try {
    const response = await fetchWithZippy(url);
    if (!response.ok) {
      return { ok: false, error: `Request failed: ${response.status}` };
    }
    const data = (await response.json()) as T;
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: String(error) };
  }
}
