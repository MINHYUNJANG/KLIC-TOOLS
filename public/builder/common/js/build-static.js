const fs = require('fs');
const path = require('path');

function buildStatic(rootDir) {
	const root = path.resolve(rootDir);
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
}

if (require.main === module) {
	const targetDir = process.argv[2];

	if (!targetDir) {
		throw new Error('Usage: node build-static.js <builder-directory>');
	}

	buildStatic(targetDir);
}

module.exports = buildStatic;
