# RGFN LOC Analysis Script

A utility script is available to compute **non-empty lines of code (LOC)** by language for:

1. the RGFN game folder (`rgfn_game`),
2. the shared engine folder (`engine`) **separately**,
3. and both together as a combined total.

## Script location

- `rgfn_game/scripts/loc_report.py`

## What it counts

- Traverses files recursively.
- Ignores common generated/vendor folders: `.git`, `node_modules`, `dist`, `coverage`, `build`, `.next`.
- Counts only files with known source/doc extensions (`.ts`, `.js`, `.css`, `.html`, `.json`, `.md`, `.py`, `.sh`, `.yml`, `.yaml`, etc.).
- LOC metric is **non-empty lines**.

## Usage

From repository root:

```bash
python3 rgfn_game/scripts/loc_report.py
```

Optional custom paths:

```bash
python3 rgfn_game/scripts/loc_report.py --repo-root /path/to/repo --rgfn-dir rgfn_game --engine-dir engine
```

## Output format

The script prints three sections:

- `RGFN Game`
- `Engine (separate)`
- `RGFN + Engine (combined)`

Each section includes:

- files counted,
- total non-empty LOC,
- language breakdown with percentages.

## Example workflow

```bash
python3 rgfn_game/scripts/loc_report.py
```

Then copy the language percentages into planning docs or PR notes when estimating implementation complexity or ownership split.
