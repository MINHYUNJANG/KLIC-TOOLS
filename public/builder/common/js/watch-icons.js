const fs = require('fs');
const path = require('path');

const ICON_DIR = path.join(__dirname, '..', 'templates', 'common', 'icon');
const MANIFEST_PATH = path.join(ICON_DIR, 'manifest.json');
const IMAGE_EXT = /\.(png|jpg|jpeg|svg|webp)$/i;

function scanCategory(cat) {
  const folder = cat.folder || cat.label;
  const dir = path.join(ICON_DIR, folder);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => IMAGE_EXT.test(f))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map(f => ({
      src: `templates/common/icon/${folder}/${f}`,
      name: path.basename(f, path.extname(f))
    }));
}

function updateManifest() {
  try {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
    let changed = false;
    for (const cat of manifest) {
      const icons = scanCategory(cat);
      if (JSON.stringify(icons) !== JSON.stringify(cat.icons)) {
        cat.icons = icons;
        changed = true;
      }
    }
    if (changed) {
      fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf8');
      console.log(`[${new Date().toLocaleTimeString()}] manifest.json 업데이트됨`);
    }
  } catch (e) {
    console.error('manifest 업데이트 실패:', e.message);
  }
}

updateManifest();

let debounceTimer = null;
fs.watch(ICON_DIR, { recursive: true }, (eventType, filename) => {
  if (!filename || !IMAGE_EXT.test(filename)) return;
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(updateManifest, 200);
});

console.log('아이콘 폴더 감시 중... (Ctrl+C로 종료)');
