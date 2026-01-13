import { decode, encode } from "uint8-to-base64";

export function uint8ArrayToBase64(uint8Array: Uint8Array): string {
  //To remove once native https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array/toBase64 is available in typescript
  return encode(uint8Array);
}

export function base64ToUint8Array(base64: string): Uint8Array {
  return decode(base64);
}
