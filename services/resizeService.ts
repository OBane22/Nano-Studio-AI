export const resizeImage = (
  base64Data: string,
  mimeType: string,
  options: { width: number; height: number }
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = `data:${mimeType};base64,${base64Data}`;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = options.width;
      canvas.height = options.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return reject(new Error('Could not get canvas context'));
      }
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, options.width, options.height);
      const resizedDataUrl = canvas.toDataURL(mimeType);
      const resizedBase64 = resizedDataUrl.split(',')[1];
      resolve(resizedBase64);
    };
    img.onerror = (error) => {
      reject(new Error(`Failed to load image for resizing: ${error}`));
    };
  });
};

export const getImageDimensions = (
    base64Data: string,
    mimeType: string,
): Promise<{width: number; height: number}> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = `data:${mimeType};base64,${base64Data}`;
        img.onload = () => {
            resolve({ width: img.width, height: img.height });
        };
        img.onerror = (error) => {
            reject(new Error(`Failed to get image dimensions: ${error}`));
        }
    });
}