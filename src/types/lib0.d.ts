declare module "lib0/encoding" {
    export function createEncoder(): any;
    export function writeVarUint(encoder: any, num: number): void;
    export function writeVarUint8Array(encoder: any, buf: Uint8Array): void;
    export function toUint8Array(encoder: any): Uint8Array;
    export function length(encoder: any): number;
}

declare module "lib0/decoding" {
    export function createDecoder(buf: Uint8Array): any;
    export function readVarUint(decoder: any): number;
    export function readVarUint8Array(decoder: any): Uint8Array;
}
