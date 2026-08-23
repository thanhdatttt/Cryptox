export type Pair = string;
export type Timeframe = "1m" | "5m" | "15m" | "1h" | "4h" | "1d";
export type ProviderId = string;
export interface Candle {
    pair: Pair;
    timeframe: Timeframe;
    timestamp: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    isClosed: boolean;
}
export interface MarketTick {
    pair: Pair;
    price: number;
    timestamp: string;
}
export interface MarketDataConnectionStatus {
    provider: ProviderId;
    status: "CONNECTED" | "RECONNECTING" | "DISCONNECTED";
    lastEventAt: string;
}
export interface DatasetSnapshotRef {
    id: string;
    pair: Pair;
    timeframe: Timeframe;
    range: {
        from: string;
        to: string;
    };
    candleCount: number;
    sha256: string;
    createdAt: string;
}
