import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const require = createRequire(path.join(ROOT_DIR, 'app/package.json'));
const nodeHtmlToImage = require('node-html-to-image');
const ICONS_DIR = path.join(ROOT_DIR, 'app/static/icons');

if (!fs.existsSync(ICONS_DIR)) {
  fs.mkdirSync(ICONS_DIR, { recursive: true });
}

function getIconHTML(size) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: ${size}px;
      height: ${size}px;
      background: #0f172a;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .icon-card {
      width: ${Math.round(size * 0.88)}px;
      height: ${Math.round(size * 0.88)}px;
      background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #2563eb 100%);
      border-radius: ${Math.round(size * 0.22)}px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      position: relative;
      box-shadow: 0 ${Math.round(size * 0.08)}px ${Math.round(size * 0.16)}px rgba(0,0,0,0.5);
    }
    .flag-accent {
      position: absolute;
      top: ${Math.round(size * 0.08)}px;
      display: flex;
      width: ${Math.round(size * 0.28)}px;
      height: ${Math.max(3, Math.round(size * 0.018))}px;
      border-radius: 999px;
      overflow: hidden;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    }
    .flag-black { flex: 1; background: #1e1e1e; }
    .flag-red { flex: 1; background: #dd0000; }
    .flag-gold { flex: 1; background: #ffce00; }
    
    .letters {
      font-size: ${Math.round(size * 0.32)}px;
      font-weight: 900;
      color: #ffffff;
      letter-spacing: -${Math.round(size * 0.02)}px;
      line-height: 1;
      text-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }
    .subtext {
      font-size: ${Math.round(size * 0.10)}px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: ${Math.round(size * 0.025)}px;
      color: rgba(255, 255, 255, 0.9);
      margin-top: ${Math.round(size * 0.03)}px;
    }
  </style>
</head>
<body>
  <div class="icon-card">
    <div class="flag-accent">
      <div class="flag-black"></div>
      <div class="flag-red"></div>
      <div class="flag-gold"></div>
    </div>
    <div class="letters">DE</div>
    <div class="subtext">KASUS</div>
  </div>
</body>
</html>`;
}

async function main() {
  console.log('Generating PWA icons...');
  
  await nodeHtmlToImage({
    output: path.join(ICONS_DIR, 'icon-192.png'),
    html: getIconHTML(192)
  });
  console.log('✓ Created icon-192.png');

  await nodeHtmlToImage({
    output: path.join(ICONS_DIR, 'icon-512.png'),
    html: getIconHTML(512)
  });
  console.log('✓ Created icon-512.png');

  await nodeHtmlToImage({
    output: path.join(ICONS_DIR, 'apple-touch-icon.png'),
    html: getIconHTML(180)
  });
  console.log('✓ Created apple-touch-icon.png');

  await nodeHtmlToImage({
    output: path.join(ICONS_DIR, 'maskable-icon-512.png'),
    html: getIconHTML(512)
  });
  console.log('✓ Created maskable-icon-512.png');

  console.log('🎉 All PWA icons generated successfully!');
}

main().catch(err => {
  console.error('Failed to generate icons:', err);
  process.exit(1);
});
