/**
 * Generates and downloads a 512x512px transparent PNG template guide
 * showing exact circular avatar safe-zones and border bleed guidelines
 * so admin-uploaded custom profile frames align without clipping.
 */
export function downloadSampleFrameTemplate(): void {
  const size = 512;
  const center = size / 2;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, size, size);

  // Outer Bleed Guide (radius 244px -> 12px margin from canvas edge)
  ctx.save();
  ctx.beginPath();
  ctx.arc(center, center, 244, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.75)';
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 8]);
  ctx.stroke();
  ctx.restore();

  // Decorative Frame Ring Band (between r=184 and r=234)
  ctx.save();
  ctx.beginPath();
  ctx.arc(center, center, 234, 0, Math.PI * 2);
  ctx.arc(center, center, 184, 0, Math.PI * 2, true);
  ctx.fillStyle = 'rgba(245, 158, 11, 0.16)';
  ctx.fill();
  ctx.restore();

  // Inner Avatar Safe-Zone Boundary (r=184px -> matches 72% diameter avatar)
  ctx.save();
  ctx.beginPath();
  ctx.arc(center, center, 184, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.95)';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.restore();

  // Inner Safe-Zone Crosshair Guides (subtle)
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(center, 16);
  ctx.lineTo(center, size - 16);
  ctx.moveTo(16, center);
  ctx.lineTo(size - 16, center);
  ctx.stroke();
  ctx.restore();

  // Sample Metallic Corner Accents in the Frame Band so admins see live alignment
  const angles = [-Math.PI / 4, Math.PI / 4, (3 * Math.PI) / 4, (-3 * Math.PI) / 4];
  ctx.save();
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.9)';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  for (const a of angles) {
    ctx.beginPath();
    ctx.arc(center, center, 212, a - 0.18, a + 0.18);
    ctx.stroke();
  }
  ctx.restore();

  // Alignment Specification Text (inside transparent center safe-zone for template readability)
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(248, 250, 252, 0.92)';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('512 x 512 px FRAME GUIDE', center, center - 34);

  ctx.fillStyle = 'rgba(245, 158, 11, 0.95)';
  ctx.font = '600 15px monospace';
  ctx.fillText('AVATAR SAFE ZONE: r = 184px (KEEP CLEAR)', center, center - 4);

  ctx.fillStyle = 'rgba(56, 189, 248, 0.95)';
  ctx.font = '600 15px monospace';
  ctx.fillText('FRAME ART BAND: r = 184px – 234px', center, center + 24);

  ctx.fillStyle = 'rgba(148, 163, 184, 0.9)';
  ctx.font = '13px monospace';
  ctx.fillText('OUTER BLEED LIMIT: r = 244px', center, center + 52);
  ctx.restore();

  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'vanguard-frame-template-512x512.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 'image/png');
}
