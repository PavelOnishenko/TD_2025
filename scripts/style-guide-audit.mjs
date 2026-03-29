import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
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
            folder: path.relative(ROOT, dir) || '.',
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

const tsFiles = collectTsFiles(ROOT);
const fileLineViolations = [];
const functionViolations = [];

for (const tsFile of tsFiles) {
    const rel = path.relative(ROOT, tsFile);
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

const folderViolations = countFolderChildren(ROOT);

console.log('Style Guide audit (informational)');
console.log(`- TS files scanned: ${tsFiles.length}`);
console.log(`- Rule 3 (file <= ${MAX_FILE_LINES} lines) violations: ${fileLineViolations.length}`);
console.log(`- Rule 2 (named function <= ${MAX_FUNCTION_LINES} lines) potential violations: ${functionViolations.length}`);
console.log(`- Rule 16 (folder <= ${MAX_CHILDREN_PER_FOLDER} children) violations: ${folderViolations.length}`);

if (fileLineViolations.length > 0) {
    console.log('\nTop files over limit:');
    for (const violation of fileLineViolations.slice(0, 10)) {
        console.log(`  - ${violation.file}: ${violation.lines} lines`);
    }
}

if (functionViolations.length > 0) {
    console.log('\nTop files with long functions (first samples):');
    for (const violation of functionViolations.slice(0, 10)) {
        const sample = violation.samples.map((item) => `${item.start}-${item.end} (${item.length})`).join(', ');
        console.log(`  - ${violation.file}: ${violation.count} functions [${sample}]`);
    }
}

if (folderViolations.length > 0) {
    console.log('\nTop folders over children limit:');
    for (const violation of folderViolations.slice(0, 10)) {
        console.log(`  - ${violation.folder}: ${violation.childrenCount} children`);
    }
}

console.log('\nNote: this audit does not fail CI yet. It highlights backlog items for gradual refactoring.');
