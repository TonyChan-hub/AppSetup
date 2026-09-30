export declare class SqliteCollector {
    private readonly registeredNames;
    registerDatabase(id: string, nameOrPath: string): void;
    listDatabases(): Promise<Array<Record<string, unknown>>>;
    listTables(databaseId: string): Promise<string[]>;
    schema(databaseId: string, table: string): Promise<Array<Record<string, unknown>>>;
    query(databaseId: string, table: string, limit?: number, offset?: number): Promise<Record<string, unknown>>;
    private openById;
}
