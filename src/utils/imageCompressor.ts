/**
 * Image compressor & clipboard utilities for Lead Mockup Screenshots.
 * Compresses images client-side into lightweight base64 JPEG strings (max 1280px)
 * so they save cleanly to localStorage and can be copied directly to the OS clipboard.
 */

export async function compressImageFile(
  file: File | Blob,
  maxDimension = 1280,
  quality = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = (e) => {
      const src = e.target?.result as string;
      if (!src) return reject(new Error('Empty image data'));

      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image in canvas'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(src);

        // Fill white background for transparent PNGs converted to JPEG
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Converts a base64 data URI to an image/png Blob for standard clipboard copying.
 */
export async function base64ToPngBlob(base64Data: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas context not available'));
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Failed to create PNG blob'));
        },
        'image/png'
      );
    };
    img.onerror = () => reject(new Error('Failed to render image for clipboard'));
    img.src = base64Data;
  });
}

/**
 * Copies a base64 screenshot directly to the system clipboard as a PNG image.
 * This allows the user to paste it instantly into Instagram DMs, WhatsApp, or messages.
 */
export async function copyBase64ImageToClipboard(base64Data: string): Promise<boolean> {
  if (!navigator.clipboard || !window.ClipboardItem) {
    return false;
  }
  try {
    const blob = await base64ToPngBlob(base64Data);
    const item = new ClipboardItem({ 'image/png': blob });
    await navigator.clipboard.write([item]);
    return true;
  } catch (err) {
    console.warn('Direct image clipboard copy failed:', err);
    return false;
  }
}

/**
 * Attempts to read an image directly from the system clipboard.
 */
export async function readImageFromClipboard(): Promise<{ dataUrl: string; name: string } | null> {
  if (!navigator.clipboard || !navigator.clipboard.read) {
    return null;
  }
  try {
    const items = await navigator.clipboard.read();
    for (const item of items) {
      const imageType = item.types.find((t) => t.startsWith('image/'));
      if (imageType) {
        const blob = await item.getType(imageType);
        const dataUrl = await compressImageFile(blob);
        return {
          dataUrl,
          name: `clipboard_${Date.now()}.${imageType.split('/')[1] || 'png'}`,
        };
      }
    }
    return null;
  } catch (err) {
    console.warn('Clipboard read image failed or permission denied:', err);
    return null;
  }
}
