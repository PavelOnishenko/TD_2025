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
const MAX_FILE_LINES = 200;
const MAX_FUNCTION_LINES = 20;
const MAX_CHILDREN_PER_FOLDER = 10;
const EXTENSION = '.ts';

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

        if (item.isFile() && item.name.endsWith(EXTENSION) && !item.name.endsWith('.d.ts')) {
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
        if (!entry.isDirectory()) {
            continue;
        }

        violations.push(...countFolderChildren(path.join(dir, entry.name)));
    }

    return violations;
}

function findLargeFunctions(lines) {
    const violations = [];
    const stack = [];

    for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index];

        if (/\b(function\s+\w+|\w+\s*\([^)]*\)\s*\{|\w+\s*=\s*\([^)]*\)\s*=>\s*\{)/.test(line)) {
            stack.push({ start: index + 1, braces: 0, started: false });
        }

        for (const state of stack) {
            const opens = (line.match(/\{/g) || []).length;
            const closes = (line.match(/\}/g) || []).length;
            state.braces += opens - closes;
            if (opens > 0) {
                state.started = true;
            }
        }

        const completed = [];
        for (let s = 0; s < stack.length; s += 1) {
            const state = stack[s];
            if (state.started && state.braces <= 0) {
                const length = index + 1 - state.start + 1;
                if (length > MAX_FUNCTION_LINES) {
                    violations.push({ start: state.start, end: index + 1, length });
                }
                completed.push(s);
            }
        }

        for (let c = completed.length - 1; c >= 0; c -= 1) {
            stack.splice(completed[c], 1);
        }
    }

    return violations;
}

if (!fs.existsSync(SCAN_ROOT) || !fs.statSync(SCAN_ROOT).isDirectory()) {
    console.error(`Invalid scope path: ${scopeArg}`);
    process.exit(1);
}

const tsFiles = collectTsFiles(SCAN_ROOT);
const fileLineViolations = [];
const functionViolations = [];

for (const tsFile of tsFiles) {
    const rel = path.relative(SCAN_ROOT, tsFile);
    const content = fs.readFileSync(tsFile, 'utf8');
    const lines = content.split(/\r?\n/);

    if (lines.length > MAX_FILE_LINES) {
        fileLineViolations.push({ file: rel, lines: lines.length });
    }

    const largeFunctions = findLargeFunctions(lines);
    if (largeFunctions.length > 0) {
        functionViolations.push({ file: rel, count: largeFunctions.length, samples: largeFunctions.slice(0, 3) });
    }
}

const folderViolations = countFolderChildren(SCAN_ROOT);

console.log('Style Guide audit (informational)');
console.log(`- Scope: ${path.relative(ROOT, SCAN_ROOT) || '.'}`);
console.log(`- TS files scanned: ${tsFiles.length}`);
console.log(`- Rule 3 (file <= ${MAX_FILE_LINES} lines) violations: ${fileLineViolations.length}`);
console.log(`- Rule 2 (named function <= ${MAX_FUNCTION_LINES} lines) potential violations: ${functionViolations.length}`);
console.log(`- Rule 16 (folder <= ${MAX_CHILDREN_PER_FOLDER} children) violations: ${folderViolations.length}`);

console.log('\nTop files over limit:');
if (fileLineViolations.length === 0) {
    console.log('  - none');
} else {
    for (const violation of fileLineViolations.slice(0, 10)) {
        console.log(`  - ${violation.file}: ${violation.lines} lines`);
    }
}

console.log('\nTop files with long functions (first samples):');
if (functionViolations.length === 0) {
    console.log('  - none');
} else {
    for (const violation of functionViolations.slice(0, 10)) {
        const sample = violation.samples.map((item) => `${item.start}-${item.end} (${item.length})`).join(', ');
        console.log(`  - ${violation.file}: ${violation.count} functions [${sample}]`);
    }
}

console.log('\nTop folders over children limit:');
if (folderViolations.length === 0) {
    console.log('  - none');
} else {
    for (const violation of folderViolations.slice(0, 10)) {
        console.log(`  - ${violation.folder}: ${violation.childrenCount} children`);
    }
}

console.log('\nNote: this audit does not fail CI yet. It highlights backlog items for gradual refactoring.');
