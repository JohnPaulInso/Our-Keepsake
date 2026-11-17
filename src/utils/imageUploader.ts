// (2026-07-13) Implement 1800px 0.92 high-res image uploader per SKILL.md
export async function compressImageHighRes(
  fileOrDataUrl: File | string,
  maxDimension = 1800,
  quality = 0.92
): Promise<string> {
  const srcUrl =
    typeof fileOrDataUrl === 'string'
      ? fileOrDataUrl
      : await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = reject;
          reader.readAsDataURL(fileOrDataUrl);
        });

  return new Promise<string>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        if (width >= height) {
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
      if (!ctx) {
        resolve(srcUrl);
        return;
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(srcUrl);
    img.src = srcUrl;
  });
}

export async function uploadOptimizedImage(dataUrl: string): Promise<string> {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
  const imgbbKey = import.meta.env.VITE_IMGBB_API_KEY;

  if (cloudName && uploadPreset) {
    try {
      const formData = new FormData();
      formData.append('file', dataUrl);
      formData.append('upload_preset', uploadPreset);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const json = await res.json();
        if (json.secure_url) return json.secure_url;
      }
    } catch {
      // Fallback to next provider
    }
  }

  if (imgbbKey) {
    try {
      const base64Payload = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
      const formData = new FormData();
      formData.append('image', base64Payload);
      const res = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbKey}`, {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const json = await res.json();
        if (json?.data?.display_url) return json.data.display_url;
      }
    } catch {
      // Fallback to local/Firestore split-doc
    }
  }

  return dataUrl;
}
