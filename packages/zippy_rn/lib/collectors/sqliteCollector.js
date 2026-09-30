"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqliteCollector = void 0;
const protocol_1 = require("../protocol");
class SqliteCollector {
    constructor() {
        this.registeredNames = new Map();
    }
    registerDatabase(id, nameOrPath) {
        this.registeredNames.set(id, nameOrPath);
    }
    async listDatabases() {
        const results = [];
        for (const [id, name] of this.registeredNames.entries()) {
            results.push({
                id,
                path: name,
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
    openById(databaseId) {
        const name = this.registeredNames.get(databaseId);
        if (!name) {
            throw new Error(`Database not found: ${databaseId}`);
        }
        const open = loadQuickSqliteOpen();
        return open({ name });
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
        throw new Error('react-native-quick-sqlite is required for Zippy SQLite inspection');
    }
}
