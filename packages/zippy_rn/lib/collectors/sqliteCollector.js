"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqliteCollector = void 0;
const protocol_1 = require("../protocol");
class SqliteCollector {
    constructor() {
        this.registered = new Map();
    }
    registerDatabase(id, nameOrPath, openDb) {
        const trimmedId = typeof id === 'string' ? id.trim() : '';
        const trimmedName = typeof nameOrPath === 'string' ? nameOrPath.trim() : '';
        if (!trimmedId || !trimmedName) {
            if (typeof __DEV__ !== 'undefined' && __DEV__) {
                // eslint-disable-next-line no-console
                console.warn('[ZippyProbe] registerSqliteDatabase requires non-empty id and name', { id, nameOrPath });
            }
            return;
        }
        this.registered.set(trimmedId, { name: trimmedName, openDb });
    }
    clear() {
        this.registered.clear();
    }
    async listDatabases() {
        // Drop HMR / bad-register ghosts (e.g. Map key undefined).
        for (const id of [...this.registered.keys()]) {
            const entry = this.registered.get(id);
            if (!id || !entry?.name) {
                this.registered.delete(id);
            }
        }
        const results = [];
        for (const [id, entry] of this.registered.entries()) {
            results.push({
                id,
                path: entry.name,
                sizeBytes: 0,
                source: 'registered',
            });
        }
        return results;
    }
    async listTables(databaseId) {
        const db = this.openById(databaseId);
        const result = db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name");
        return rowsFromResult(result).map((row) => String(row.name));
    }
    async schema(databaseId, table) {
        const db = this.openById(databaseId);
        const safeTable = sanitizeIdent(table);
        const result = db.execute(`PRAGMA table_info(${safeTable})`);
        return rowsFromResult(result).map((row) => ({
            cid: row.cid,
            name: row.name,
            type: row.type,
            notnull: row.notnull,
            dflt_value: row.dflt_value,
            pk: row.pk,
        }));
    }
    async query(databaseId, table, limit = protocol_1.DEFAULT_SQLITE_ROW_LIMIT, offset = 0) {
        const db = this.openById(databaseId);
        const safeTable = sanitizeIdent(table);
        const safeLimit = Math.min(Math.max(1, limit), protocol_1.DEFAULT_SQLITE_ROW_LIMIT);
        const safeOffset = Math.max(0, offset);
        const result = db.execute(`SELECT * FROM ${safeTable} LIMIT ? OFFSET ?`, [safeLimit, safeOffset]);
        const rows = rowsFromResult(result);
        return {
            rows,
            limit: safeLimit,
            offset: safeOffset,
            count: rows.length,
        };
    }
    resolve(databaseId) {
        const key = typeof databaseId === 'string' ? databaseId.trim() : '';
        if (!key) {
            return undefined;
        }
        const byId = this.registered.get(key);
        if (byId) {
            return byId;
        }
        // Desktop may pass path/name; accept either.
        for (const entry of this.registered.values()) {
            if (entry.name === key) {
                return entry;
            }
        }
        return undefined;
    }
    openById(databaseId) {
        const entry = this.resolve(databaseId);
        if (!entry) {
            throw new Error(`Database not found: ${databaseId}`);
        }
        if (entry.openDb) {
            return entry.openDb();
        }
        const open = loadQuickSqliteOpen();
        return open({ name: entry.name });
    }
}
exports.SqliteCollector = SqliteCollector;
function sanitizeIdent(value) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
        throw new Error(`Invalid identifier: ${value}`);
    }
    return value;
}
function rowsFromResult(result) {
    const rows = result.rows;
    if (!rows) {
        return [];
    }
    if (Array.isArray(rows._array)) {
        return rows._array;
    }
    const length = rows.length ?? 0;
    const out = [];
    for (let i = 0; i < length; i += 1) {
        out.push(rows.item?.(i) ?? {});
    }
    return out;
}
function loadQuickSqliteOpen() {
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const mod = require('react-native-quick-sqlite');
        return mod.open;
    }
    catch {
        throw new Error('react-native-quick-sqlite is required for Zippy SQLite inspection. ' +
            'Pass openDb when registering: ZippyProbe.registerSqliteDatabase(id, name, () => open({ name }))');
    }
}
