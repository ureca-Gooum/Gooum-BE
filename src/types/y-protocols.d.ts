declare module "y-protocols/sync" {
    import { Doc } from "yjs";
    import { Encoder, Decoder } from "lib0/encoding";

    export function writeSyncStep1(encoder: any, doc: Doc): void;
    export function writeSyncStep2(encoder: any, doc: Doc): void;
    export function writeUpdate(encoder: any, update: Uint8Array): void;
    export function readSyncMessage(
        decoder: any,
        encoder: any,
        doc: Doc,
        origin: any,
    ): void;
}

declare module "y-protocols/awareness" {
    import { Doc } from "yjs";

    export class Awareness {
        constructor(doc: Doc);
        setLocalState(state: any): void;
        getStates(): Map<number, any>;
        on(event: string, callback: any): void;
        destroy(): void;
    }

    export function encodeAwarenessUpdate(
        awareness: Awareness,
        clients: number[],
    ): Uint8Array;
    export function applyAwarenessUpdate(
        awareness: Awareness,
        update: Uint8Array,
        origin: any,
    ): void;
    export function removeAwarenessStates(
        awareness: Awareness,
        clients: number[],
        origin: any,
    ): void;
}
