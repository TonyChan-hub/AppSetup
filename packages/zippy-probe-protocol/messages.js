import { MessageKind } from './constants.js';

/**
 * @param {string} id
 * @param {string} method
 * @param {Record<string, unknown>} [params]
 */
export function createRequest(id, method, params = {}) {
  return {
    v: 1,
    kind: MessageKind.REQUEST,
    id,
    method,
    params,
  };
}

/**
 * @param {string} id
 * @param {unknown} [result]
 * @param {{ code: string, message: string } | null} [error]
 */
export function createResponse(id, result = null, error = null) {
  return {
    v: 1,
    kind: MessageKind.RESPONSE,
    id,
    result: error ? null : result,
    error,
  };
}

/**
 * @param {string} type
 * @param {unknown} [payload]
 */
export function createEvent(type, payload = null) {
  return {
    v: 1,
    kind: MessageKind.EVENT,
    type,
    payload,
    ts: Date.now(),
  };
}

/**
 * @param {unknown} raw
 * @returns {boolean}
 */
export function isProbeMessage(raw) {
  return (
    typeof raw === 'object' &&
    raw !== null &&
    'kind' in raw &&
    'v' in raw
  );
}

/**
 * @param {unknown} raw
 * @returns {raw is { kind: string, method?: string, type?: string }}
 */
export function parseProbeMessage(raw) {
  if (!isProbeMessage(raw)) {
    throw new Error('Invalid probe message');
  }
  return raw;
}
