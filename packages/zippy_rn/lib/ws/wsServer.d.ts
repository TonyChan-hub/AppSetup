export type WsConnection = {
    sendText: (text: string) => void;
    close: () => void;
};
export type WsServerOptions = {
    port: number;
    path: string;
    onConnection: (conn: WsConnection) => void;
    onMessage: (conn: WsConnection, text: string) => void;
    onClose: (conn: WsConnection) => void;
};
/**
 * Minimal RFC6455 WebSocket server for Zippy probe (text frames only).
 */
export declare class WsServer {
    private readonly options;
    private server;
    private readonly connections;
    constructor(options: WsServerOptions);
    start(): Promise<number>;
    stop(): Promise<void>;
    private handleSocket;
    private acceptHandshake;
}
