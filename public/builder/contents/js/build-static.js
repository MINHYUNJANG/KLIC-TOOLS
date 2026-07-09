const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'dist');
const entries = ['index.html', 'css', 'js', 'images', 'templates'];

function copyEntry(name) {
	const from = path.join(root, name);
	const to = path.join(outDir, name);

	if (!fs.existsSync(from)) return;
	fs.cpSync(from, to, { recursive: true });
}

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

entries.forEach(copyEntry);
