import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { storage } from "../firebase";

function resizeImage(source: Blob, maxDimension: number, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const sourceUrl = URL.createObjectURL(source);
    const image = new Image();
    const cleanup = () => URL.revokeObjectURL(sourceUrl);

    image.onload = () => {
      const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext("2d");
      if (!context) {
        cleanup();
        reject(new Error("Não foi possível preparar a imagem."));
        return;
      }

      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        cleanup();
        if (blob) resolve(blob);
        else reject(new Error("Não foi possível comprimir a imagem."));
      }, "image/jpeg", quality);
    };

    image.onerror = () => {
      cleanup();
      reject(new Error("O arquivo selecionado não é uma imagem válida."));
    };
    image.src = sourceUrl;
  });
}

async function uploadBlob(
  blob: Blob,
  path: string,
  onProgress?: (progress: number) => void,
): Promise<string> {
  const task = uploadBytesResumable(ref(storage, path), blob, {
    contentType: blob.type || "image/jpeg",
  });

  return new Promise((resolve, reject) => {
    task.on(
      "state_changed",
      (snapshot) => {
        if (snapshot.totalBytes > 0) {
          onProgress?.(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100));
        }
      },
      reject,
      () => getDownloadURL(task.snapshot.ref).then(resolve, reject),
    );
  });
}

export function createProductImagePath(fileName: string): string {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
  const randomSuffix = Math.random().toString(36).slice(2, 10);
  return `products/${Date.now()}_${randomSuffix}_${safeName.replace(/\.[^.]+$/, "") || "image"}.jpg`;
}

export async function uploadImageFileToStorage(
  file: File | Blob,
  path: string,
  options: { maxDimension?: number; quality?: number; onProgress?: (progress: number) => void } = {},
): Promise<string> {
  const resized = await resizeImage(file, options.maxDimension ?? 800, options.quality ?? 0.72);
  return uploadBlob(resized, path, options.onProgress);
}

export async function uploadImageDataUrlToStorage(
  dataUrl: string,
  path: string,
): Promise<string> {
  const response = await fetch(dataUrl);
  if (!response.ok) throw new Error("Não foi possível ler a imagem antiga.");
  const imageBlob = await response.blob();
  const resized = await resizeImage(imageBlob, 800, 0.72);
  return uploadBlob(resized, path);
}
