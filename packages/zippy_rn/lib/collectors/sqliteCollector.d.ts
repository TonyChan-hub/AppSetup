export type QuickSqliteDb = {
    execute: (sql: string, params?: unknown[]) => {
        rows?: {
            _array?: Array<Record<string, unknown>>;
            length?: number;
            item?: (index: number) => Record<string, unknown>;
        };
        rowsAffected?: number;
    };
};
/** App-provided opener — prefer this so Metro resolves quick-sqlite from the app. */
export type SqliteDbFactory = () => QuickSqliteDb;
export declare class SqliteCollector {
    private readonly registered;
    registerDatabase(id: string, nameOrPath: string, openDb?: SqliteDbFactory): void;
    clear(): void;
    listDatabases(): Promise<Array<Record<string, unknown>>>;
    listTables(databaseId: string): Promise<string[]>;
    schema(databaseId: string, table: string): Promise<Array<Record<string, unknown>>>;
    query(databaseId: string, table: string, limit?: number, offset?: number): Promise<Record<string, unknown>>;
    private resolve;
    private openById;
}
