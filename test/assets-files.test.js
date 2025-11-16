import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const ASSET_PATTERN = /['"`](assets\/[^'"`]+)['"`]/g;
const SOURCE_FILES = [
    'js/systems/assets.js',
    'js/systems/ui.js',
    'js/systems/localization.js',
];

async function listAssetFiles(relativeDir = 'assets') {
    const files = [];
    async function walk(directory) {
        const entries = await readdir(directory, { withFileTypes: true });
        for (const entry of entries) {
            const absolutePath = path.join(directory, entry.name);
            if (entry.isDirectory()) {
                await walk(absolutePath);
            } else {
                const relativePath = path.relative(projectRoot, absolutePath).split(path.sep).join('/');
                files.push(relativePath);
            }
        }
    }
    const absoluteRoot = path.join(projectRoot, relativeDir);
    await walk(absoluteRoot);
    return files.sort();
}

function hasFileExtension(assetPath) {
    return path.extname(assetPath) !== '';
}

async function extractAssetsFromSource(relativePath) {
    const absolutePath = path.join(projectRoot, relativePath);
    const contents = await readFile(absolutePath, 'utf8');
    const matches = contents.matchAll(ASSET_PATTERN);
    const assets = new Set();

    for (const match of matches) {
        assets.add(match[1]);
    }

    return assets;
}

test('declared asset files exist on disk', async () => {
    const assetOrigins = new Map();

    for (const source of SOURCE_FILES) {
        const assets = await extractAssetsFromSource(source);
        for (const assetPath of assets) {
            if (!assetOrigins.has(assetPath)) {
                assetOrigins.set(assetPath, new Set());
            }
            assetOrigins.get(assetPath).add(source);
        }
    }

    assert.notEqual(assetOrigins.size, 0, 'No assets were found in the declared source files.');

    const missingAssets = [];

    for (const [assetPath, origins] of assetOrigins) {
        const absoluteAssetPath = path.join(projectRoot, assetPath);
        try {
            await access(absoluteAssetPath);
        } catch (error) {
            missingAssets.push({
                assetPath,
                origins: Array.from(origins).sort(),
                error: error.message,
            });
        }
    }

    assert.deepEqual(
        missingAssets,
        [],
        missingAssets.length === 0
            ? undefined
            : `Missing assets:\n${missingAssets
                .map(({ assetPath, origins }) => `${assetPath} (declared in ${origins.join(', ')})`)
                .join('\n')}`,
    );

    const declaredAssets = Array.from(assetOrigins.keys());
    const declaredFiles = new Set(declaredAssets.filter(hasFileExtension));
    const declaredDirectories = new Set(declaredAssets.filter(assetPath => !hasFileExtension(assetPath)));
    const actualFiles = await listAssetFiles();
    const extraAssets = actualFiles.filter(assetPath => {
        if (declaredFiles.has(assetPath)) {
            return false;
        }
        for (const directory of declaredDirectories) {
            if (assetPath.startsWith(`${directory}/`)) {
                return false;
            }
        }
        return true;
    });

    assert.deepEqual(
        extraAssets,
        [],
        extraAssets.length === 0
            ? undefined
            : `Unexpected assets in repository:\n${extraAssets.join('\n')}`,
    );
});
