// This script is meant to run in a browser console to generate icons
// It's here for reference, but you can also use any image tools to create your own icons

function createCanvasIcon(size, backgroundColor = '#3b82f6', text = 'VT') {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  
  // Background
  ctx.fillStyle = backgroundColor;
  ctx.beginPath();
  ctx.arc(size/2, size/2, size/2, 0, Math.PI * 2);
  ctx.fill();
  
  // Text
  const fontSize = Math.floor(size * 0.5);
  ctx.font = `bold ${fontSize}px Arial, sans-serif`;
  ctx.fillStyle = 'white';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, size/2, size/2);
  
  return canvas.toDataURL('image/png');
}

// Example usage (run in browser console):
/*
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
for (const size of sizes) {
  const dataUrl = createCanvasIcon(size);
  console.log(`Icon ${size}x${size}:`);
  console.log(dataUrl);
  
  // Create a download link
  const link = document.createElement('a');
  link.download = `icon-${size}x${size}.png`;
  link.href = dataUrl;
  link.click();
}

// Create a maskable icon (with padding for safe area)
const maskableSize = 512;
const paddingPercentage = 0.2;
const canvas = document.createElement('canvas');
canvas.width = maskableSize;
canvas.height = maskableSize;
const ctx = canvas.getContext('2d');

// Background
ctx.fillStyle = '#3b82f6';
ctx.fillRect(0, 0, maskableSize, maskableSize);

// Icon with padding
const padding = maskableSize * paddingPercentage;
const iconSize = maskableSize - (padding * 2);

ctx.fillStyle = 'white';
ctx.beginPath();
ctx.arc(maskableSize/2, maskableSize/2, iconSize/2, 0, Math.PI * 2);
ctx.fill();

// Text
const fontSize = Math.floor(iconSize * 0.5);
ctx.font = `bold ${fontSize}px Arial, sans-serif`;
ctx.fillStyle = '#3b82f6';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText('VT', maskableSize/2, maskableSize/2);

const dataUrl = canvas.toDataURL('image/png');
console.log('Maskable icon:');
console.log(dataUrl);

// Create a download link
const link = document.createElement('a');
link.download = 'maskable-icon.png';
link.href = dataUrl;
link.click();
*/