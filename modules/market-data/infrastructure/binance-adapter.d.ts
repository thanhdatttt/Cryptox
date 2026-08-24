import type { MarketDataProviderAdapter } from "../application/ports";
type FetchResponse = {
    ok: boolean;
    status: number;
    json(): Promise<unknown>;
};
type FetchLike = (input: string) => Promise<FetchResponse>;
type SocketMessage = {
    data: string;
};
interface WebSocketLike {
    onmessage: ((event: SocketMessage) => void) | null;
    onclose: (() => void) | null;
    onerror: (() => void) | null;
    close(): void;
}
type WebSocketFactory = (url: string) => WebSocketLike;
export interface BinanceAdapterOptions {
    fetchFn?: FetchLike;
    webSocketFactory?: WebSocketFactory;
    restBaseUrl?: string;
    streamBaseUrl?: string;
    now?: () => number;
}
export declare function createBinanceMarketDataAdapter(options?: BinanceAdapterOptions): MarketDataProviderAdapter;
export {};
