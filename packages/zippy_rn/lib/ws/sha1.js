"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sha1Base64 = sha1Base64;
/**
 * Minimal SHA-1 for WebSocket Sec-WebSocket-Accept (RFC 6455).
 * Pure JS — no crypto native module required.
 */
function sha1Base64(input) {
    const bytes = utf8Encode(input);
    const hash = sha1(bytes);
    return base64Encode(hash);
}
function utf8Encode(str) {
    const out = [];
    for (let i = 0; i < str.length; i += 1) {
        let code = str.charCodeAt(i);
        if (code < 0x80) {
            out.push(code);
        }
        else if (code < 0x800) {
            out.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
        }
        else if (code >= 0xd800 && code <= 0xdbff) {
            i += 1;
            const next = str.charCodeAt(i);
            code = 0x10000 + ((code & 0x3ff) << 10) + (next & 0x3ff);
            out.push(0xf0 | (code >> 18), 0x80 | ((code >> 12) & 0x3f), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
        }
        else {
            out.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
        }
    }
    return out;
}
function base64Encode(bytes) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let out = '';
    for (let i = 0; i < bytes.length; i += 3) {
        const a = bytes[i];
        const b = bytes[i + 1];
        const c = bytes[i + 2];
        out += chars[a >> 2];
        out += chars[((a & 3) << 4) | ((b ?? 0) >> 4)];
        out += b === undefined ? '=' : chars[((b & 15) << 2) | ((c ?? 0) >> 6)];
        out += c === undefined ? '=' : chars[c & 63];
    }
    return out;
}
function sha1(message) {
    const ml = message.length;
    const words = [];
    for (let i = 0; i < ml; i += 1) {
        words[i >> 2] = (words[i >> 2] ?? 0) | (message[i] << (24 - (i % 4) * 8));
    }
    words[ml >> 2] = (words[ml >> 2] ?? 0) | (0x80 << (24 - (ml % 4) * 8));
    const bitLenHi = Math.floor((ml * 8) / 0x100000000);
    const bitLenLo = (ml * 8) >>> 0;
    const newLen = (((ml + 8) >> 6) + 1) << 4;
    words[newLen - 2] = bitLenHi;
    words[newLen - 1] = bitLenLo;
    let h0 = 0x67452301;
    let h1 = 0xefcdab89;
    let h2 = 0x98badcfe;
    let h3 = 0x10325476;
    let h4 = 0xc3d2e1f0;
    const w = new Array(80);
    for (let i = 0; i < words.length; i += 16) {
        for (let t = 0; t < 16; t += 1) {
            w[t] = words[i + t] ?? 0;
        }
        for (let t = 16; t < 80; t += 1) {
            const x = (w[t - 3] ^ w[t - 8] ^ w[t - 14] ^ w[t - 16]) >>> 0;
            w[t] = ((x << 1) | (x >>> 31)) >>> 0;
        }
        let a = h0;
        let b = h1;
        let c = h2;
        let d = h3;
        let e = h4;
        for (let t = 0; t < 80; t += 1) {
            let f;
            let k;
            if (t < 20) {
                f = (b & c) | (~b & d);
                k = 0x5a827999;
            }
            else if (t < 40) {
                f = b ^ c ^ d;
                k = 0x6ed9eba1;
            }
            else if (t < 60) {
                f = (b & c) | (b & d) | (c & d);
                k = 0x8f1bbcdc;
            }
            else {
                f = b ^ c ^ d;
                k = 0xca62c1d6;
            }
            const temp = (((a << 5) | (a >>> 27)) + f + e + k + (w[t] ?? 0)) >>> 0;
            e = d;
            d = c;
            c = ((b << 30) | (b >>> 2)) >>> 0;
            b = a;
            a = temp;
        }
        h0 = (h0 + a) >>> 0;
        h1 = (h1 + b) >>> 0;
        h2 = (h2 + c) >>> 0;
        h3 = (h3 + d) >>> 0;
        h4 = (h4 + e) >>> 0;
    }
    const digest = [];
    for (const h of [h0, h1, h2, h3, h4]) {
        digest.push((h >>> 24) & 0xff, (h >>> 16) & 0xff, (h >>> 8) & 0xff, h & 0xff);
    }
    return digest;
}
