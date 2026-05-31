const MAX_SIDE = 1280;
const QUALITY = 0.8;

async function compressImage(filePath) {
  const info = await new Promise((resolve, reject) => {
    wx.getImageInfo({ src: filePath, success: resolve, fail: reject });
  });

  const { width, height } = info;
  const longSide = Math.max(width, height);
  const ratio = longSide > MAX_SIDE ? MAX_SIDE / longSide : 1;
  const targetW = Math.round(width * ratio);
  const targetH = Math.round(height * ratio);

  // 尺寸已经足够小，只压质量
  if (ratio === 1) {
    return new Promise((resolve, reject) => {
      wx.compressImage({
        src: filePath,
        quality: Math.round(QUALITY * 100),
        success: res => resolve(res.tempFilePath),
        fail: reject,
      });
    });
  }

  // 先缩尺寸再压质量
  const canvas = wx.createOffscreenCanvas({ type: '2d', width: targetW, height: targetH });
  const ctx = canvas.getContext('2d');
  const img = canvas.createImage();

  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = filePath;
  });

  ctx.drawImage(img, 0, 0, targetW, targetH);

  return new Promise((resolve, reject) => {
    wx.canvasToTempFilePath({
      canvas,
      fileType: 'jpg',
      quality: QUALITY,
      success: res => resolve(res.tempFilePath),
      fail: reject,
    });
  });
}

async function compressImages(filePaths) {
  return Promise.all(filePaths.map(compressImage));
}

module.exports = { compressImage, compressImages };
