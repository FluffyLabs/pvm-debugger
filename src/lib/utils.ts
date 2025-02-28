import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { MemorySegment, SpiMemory } from "@typeberry/pvm-debugger-adapter";
import { MemoryChunkItem, PageMapItem } from "@/types/pvm.ts";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const hexToRgb = (hex: string) => {
  const bigint = parseInt(hex.slice(1), 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `${r}, ${g}, ${b}`;
};

export const invertHexColor = (hex: string) => {
  hex = hex.replace(/^#/, "");

  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((char) => char + char)
      .join("");
  }

  const invertedColor = (0xffffff ^ parseInt(hex, 16)).toString(16).padStart(6, "0");

  return `#${invertedColor}`;
};

export interface SerializedFile {
  name: string;
  size: number;
  type: string;
  content: string;
}

export const serializeFile = async (file: File) => {
  const encodeFileToBase64 = (file: File) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file); // Encodes the file content as Base64
    });
  };

  const base64 = await encodeFileToBase64(file);
  return {
    name: file.name,
    size: file.size,
    type: file.type,
    content: base64,
  };
};

export const deserializeFile = (fileData: SerializedFile) => {
  const byteString = atob(fileData.content.split(",")[1]);
  const mimeType = fileData.type;
  const arrayBuffer = new ArrayBuffer(byteString.length);
  const uint8Array = new Uint8Array(arrayBuffer);

  for (let i = 0; i < byteString.length; i++) {
    uint8Array[i] = byteString.charCodeAt(i);
  }

  return new File([uint8Array], fileData.name, { type: mimeType });
};

const PAGE_SHIFT = 12; // log_2(4096)
const PAGE_SIZE = 1 << PAGE_SHIFT;

function pageAlignUp(v: number) {
  return (((v + PAGE_SIZE - 1) >> PAGE_SHIFT) << PAGE_SHIFT) >>> 0;
}

function asChunks(mem: MemorySegment[]): MemoryChunkItem[] {
  const items = [];
  for (const segment of mem) {
    if (segment.data === null) {
      continue;
    }
    let data = segment.data;
    let address = segment.start;
    while (data.length > 0) {
      const pageOffset = address % PAGE_SIZE;
      const lenForPage = PAGE_SIZE - pageOffset;
      const contents = Array.from<number>(data.subarray(0, Math.min(data.length, lenForPage)));
      items.push({
        address,
        contents,
      });

      // move data & address
      data = data.subarray(contents.length);
      address += contents.length;
    }
  }
  return items;
}

function asPageMap(mem: MemorySegment[], isWriteable: boolean): PageMapItem[] {
  const items = [];
  for (const segment of mem) {
    const pageOffset = segment.start % PAGE_SIZE;
    const pageStart = segment.start - pageOffset;
    const pageEnd = pageAlignUp(segment.end);
    for (let i = pageStart; i < pageEnd; i += PAGE_SIZE) {
      items.push({
        address: i,
        length: Math.min(PAGE_SIZE, pageEnd - i),
        "is-writable": isWriteable,
      });
    }
  }
  return items;
}

export function getAsPageMap(mem: SpiMemory): PageMapItem[] {
  return asPageMap(mem.readable, false).concat(asPageMap(mem.writeable, true));
}

export function getAsChunks(mem: SpiMemory): MemoryChunkItem[] {
  return asChunks(mem.readable).concat(asChunks(mem.writeable));
}
