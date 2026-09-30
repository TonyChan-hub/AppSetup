"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MmkvCollector = void 0;
class MmkvCollector {
    constructor() {
        this.registered = new Map();
    }
    registerStore(id, reader) {
        this.registered.set(id, { reader });
    }
    async listInstances() {
        const instances = [];
        for (const id of this.registered.keys()) {
            instances.push({
                id,
                path: `registered://${id}`,
                sizeBytes: 0,
                source: 'registered',
            });
        }
        if (instances.length === 0) {
            instances.push({
                id: 'default',
                path: '',
                sizeBytes: 0,
                note: 'No MMKV stores registered; call ZippyProbe.registerMmkvStore().',
            });
        }
        return instances;
    }
    async listKeys(instanceId) {
        const store = this.registered.get(instanceId);
        if (!store) {
            return [];
        }
        return Object.keys(store.reader()).sort();
    }
    async getValue(instanceId, key) {
        const store = this.registered.get(instanceId);
        if (!store) {
            return null;
        }
        const data = store.reader();
        if (!(key in data)) {
            return null;
        }
        const value = data[key];
        return {
            key,
            type: valueType(value),
            value: serializeValue(value),
        };
    }
}
exports.MmkvCollector = MmkvCollector;
function valueType(value) {
    if (value === null || value === undefined) {
        return 'null';
    }
    if (typeof value === 'string') {
        return 'string';
    }
    if (typeof value === 'boolean') {
        return 'bool';
    }
    if (typeof value === 'number') {
        return Number.isInteger(value) ? 'int' : 'double';
    }
    return typeof value;
}
function serializeValue(value) {
    if (value === null || value === undefined) {
        return '';
    }
    if (typeof value === 'object') {
        try {
            return JSON.stringify(value);
        }
        catch {
            return String(value);
        }
    }
    return String(value);
}
