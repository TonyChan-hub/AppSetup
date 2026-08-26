import { getMmkvStorage } from '@/services/mmkvStorage';

const KEY = 'device-id';
const storage = getMmkvStorage('template-device');

export function getOrCreateDeviceId(): string {
  const existing = storage.getString(KEY);
  if (existing) {
    return existing;
  }
  const next = `device-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  storage.set(KEY, next);
  return next;
}
