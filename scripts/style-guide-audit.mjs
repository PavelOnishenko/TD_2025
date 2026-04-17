import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const args = process.argv.slice(2);
const scopeFlagIndex = args.indexOf('--scope');
const scopeArg = scopeFlagIndex >= 0 ? args[scopeFlagIndex + 1] : null;
if (scopeFlagIndex >= 0 && !scopeArg) {
    console.error('Missing value for --scope. Example: --scope rgfn_game');
    process.exit(1);
}

const SCAN_ROOT = scopeArg ? path.resolve(ROOT, scopeArg) : ROOT;
const MAX_CHILDREN_PER_FOLDER = 10;

function collectTsFiles(dir) {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    const result = [];

    for (const item of items) {
        const fullPath = path.join(dir, item.name);

        if (item.isDirectory()) {
            if (item.name === 'node_modules' || item.name === 'dist' || item.name.startsWith('.git')) {
                continue;
            }
            result.push(...collectTsFiles(fullPath));
            continue;
        }

        if (item.isFile() && item.name.endsWith('.ts') && !item.name.endsWith('.d.ts')) {
            result.push(fullPath);
        }
    }

    return result;
}

function countFolderChildren(dir) {
    const entries = fs
        .readdirSync(dir, { withFileTypes: true })
        .filter((entry) => entry.name !== '.git' && entry.name !== 'node_modules' && entry.name !== 'dist');

    const violations = [];
    if (entries.length > MAX_CHILDREN_PER_FOLDER) {
        violations.push({
            folder: path.relative(SCAN_ROOT, dir) || '.',
            childrenCount: entries.length
        });
    }

    for (const entry of entries) {
        if (entry.isDirectory()) {
            violations.push(...countFolderChildren(path.join(dir, entry.name)));
        }
    }

    return violations;
}

if (!fs.existsSync(SCAN_ROOT) || !fs.statSync(SCAN_ROOT).isDirectory()) {
    console.error(`Invalid scope path: ${scopeArg}`);
    process.exit(1);
}

const tsFiles = collectTsFiles(SCAN_ROOT);
const folderViolations = countFolderChildren(SCAN_ROOT);

console.log('Style Guide audit (informational)');
console.log(`- Scope: ${path.relative(ROOT, SCAN_ROOT) || '.'}`);
console.log(`- TS files scanned: ${tsFiles.length}`);
console.log('- Rule 2/3 (function/file length): enforced directly by ESLint as warnings/errors.');
console.log(`- Rule 16 (folder <= ${MAX_CHILDREN_PER_FOLDER} children) violations: ${folderViolations.length}`);

console.log('\nTop folders over children limit:');
if (folderViolations.length === 0) {
    console.log('  - none');
} else {
    for (const violation of folderViolations.slice(0, 10)) {
        console.log(`  - ${violation.folder}: ${violation.childrenCount} children`);
    }
}

console.log('\nNote: this audit remains informational for Rule 16 backlog tracking.');
