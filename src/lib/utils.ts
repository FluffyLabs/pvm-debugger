import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

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
