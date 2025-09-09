import { TextPosition } from '../types';

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
};

export const applyBrightnessContrast = (
  base64Data: string,
  mimeType: string,
  options: { brightness: number; contrast: number }
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = `data:${mimeType};base64,${base64Data}`;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return reject(new Error('Could not get canvas context'));
      }
      
      const brightnessValue = 100 + options.brightness;
      const contrastValue = 100 + options.contrast;
      
      ctx.filter = `brightness(${brightnessValue}%) contrast(${contrastValue}%)`;
      
      ctx.drawImage(img, 0, 0);

      const newDataUrl = canvas.toDataURL(mimeType);
      const newBase64 = newDataUrl.split(',')[1];
      resolve(newBase64);
    };
    img.onerror = (error) => {
      reject(new Error(`Failed to load image for applying filter: ${error}`));
    };
  });
};


export const drawTextOnImage = (
  base64Data: string,
  mimeType: string,
  options: {
    text: string;
    fontSize: number;
    color: string;
    position: TextPosition;
    fontFamily?: string;
    strokeColor?: string;
    strokeWidth?: number;
    shadowColor?: string;
    shadowBlur?: number;
  }
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = `data:${mimeType};base64,${base64Data}`;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return reject(new Error('Could not get canvas context'));
      }

      // Draw original image
      ctx.drawImage(img, 0, 0);

      // Set text styles
      ctx.fillStyle = options.color;
      ctx.font = `${options.fontSize}px ${options.fontFamily || 'sans-serif'}`;
      
      // Set shadow styles
      if (options.shadowBlur && options.shadowBlur > 0 && options.shadowColor) {
        ctx.shadowColor = options.shadowColor;
        ctx.shadowBlur = options.shadowBlur;
        ctx.shadowOffsetX = 2; // Optional: add a small offset
        ctx.shadowOffsetY = 2; // Optional: add a small offset
      }

      // Set stroke styles
      if (options.strokeWidth && options.strokeWidth > 0 && options.strokeColor) {
        ctx.strokeStyle = options.strokeColor;
        ctx.lineWidth = options.strokeWidth;
      }
      
      const lines = options.text.split('\n');
      const lineHeight = options.fontSize * 1.2;
      const margin = options.fontSize * 0.5;

      const [verticalPos, horizontalPos] = options.position.split('-');
      
      // Set horizontal alignment
      let x = 0;
      if (horizontalPos === 'left') {
          ctx.textAlign = 'left';
          x = margin;
      } else if (horizontalPos === 'right') {
          ctx.textAlign = 'right';
          x = canvas.width - margin;
      } else { // center
          ctx.textAlign = 'center';
          x = canvas.width / 2;
      }

      const drawLines = (drawFunc: (line: string, x: number, y: number) => void) => {
           // Draw each line of text based on vertical alignment
          if (verticalPos === 'bottom') {
            ctx.textBaseline = 'bottom';
            const bottomY = canvas.height - margin;
            lines.slice().reverse().forEach((line, index) => { // Use slice to avoid mutating original
                const y = bottomY - (index * lineHeight);
                drawFunc(line, x, y);
            });
          } else {
            // top and middle
            let startY = 0;
            ctx.textBaseline = 'top';
            if (verticalPos === 'top') {
                startY = margin;
            } else { // middle
                const totalTextHeight = lines.length * lineHeight - (lineHeight - options.fontSize);
                startY = (canvas.height - totalTextHeight) / 2;
            }
            lines.forEach((line, index) => {
                drawFunc(line, x, startY + (index * lineHeight));
            });
          }
      };
      
      // Draw stroke first if specified
      if (options.strokeWidth && options.strokeWidth > 0 && options.strokeColor) {
          drawLines((line, x, y) => ctx.strokeText(line, x, y));
      }

      // Clear shadow for fill if stroke is present, to avoid double shadow
      if (options.strokeWidth && options.strokeWidth > 0) {
          ctx.shadowColor = 'transparent';
      }

      // Draw the fill text
      drawLines((line, x, y) => ctx.fillText(line, x, y));

      const newDataUrl = canvas.toDataURL(mimeType);
      const newBase64 = newDataUrl.split(',')[1];
      resolve(newBase64);
    };
    img.onerror = (error) => {
      reject(new Error(`Failed to load image for drawing text: ${error}`));
    };
  });
};

export const convertImageFormat = (
  base64Data: string,
  mimeType: string,
  targetMimeType: 'image/jpeg' | 'image/png' | 'image/webp',
  options?: { quality?: number } // quality is 0-1
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = `data:${mimeType};base64,${base64Data}`;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return reject(new Error('Could not get canvas context'));
      }
      
      // If converting from a format that supports transparency (like PNG) to one that doesn't (like JPEG),
      // we should draw a background color first. Defaulting to white.
      if (targetMimeType === 'image/jpeg' && mimeType === 'image/png') {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.drawImage(img, 0, 0);

      const quality = options?.quality;
      const dataUrl = canvas.toDataURL(targetMimeType, quality);
      const newBase64 = dataUrl.split(',')[1];
      resolve(newBase64);
    };
    img.onerror = (error) => {
      reject(new Error(`Failed to load image for format conversion: ${error}`));
    };
  });
};