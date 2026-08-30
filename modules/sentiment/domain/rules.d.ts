import type { CreateSentimentSnapshotCommand, SentimentInput, SentimentLabel, SentimentResult, SentimentSnapshotPoint } from "./contracts";
export declare const validateSentimentInput: (input: SentimentInput) => SentimentInput;
export declare const validateSentimentResult: (result: SentimentResult, input?: SentimentInput) => SentimentResult;
export declare const validateSnapshotCommand: (command: CreateSentimentSnapshotCommand) => CreateSentimentSnapshotCommand;
export declare const validateSnapshotPoint: (point: SentimentSnapshotPoint) => SentimentSnapshotPoint;
export declare const sentimentSnapshotSerialization: (command: CreateSentimentSnapshotCommand, points: SentimentSnapshotPoint[]) => string;
export declare const sentimentLabelFor: (score: number) => SentimentLabel;
