#!/usr/bin/env python3
"""Calculate LOC distribution for RGFN and engine folders."""

from __future__ import annotations

import argparse
from collections import Counter
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

EXTENSION_LANGUAGE = {
    ".ts": "TypeScript",
    ".tsx": "TypeScript",
    ".js": "JavaScript",
    ".jsx": "JavaScript",
    ".mjs": "JavaScript",
    ".cjs": "JavaScript",
    ".css": "CSS",
    ".html": "HTML",
    ".json": "JSON",
    ".md": "Markdown",
    ".py": "Python",
    ".sh": "Shell",
    ".yml": "YAML",
    ".yaml": "YAML",
}

SKIP_DIRS = {
    ".git",
    "node_modules",
    "dist",
    "coverage",
    "build",
    ".next",
}


@dataclass
class FolderLoc:
    files: int
    lines: int
    per_language: Counter


def iter_source_files(base: Path) -> Iterable[Path]:
    for path in base.rglob("*"):
        if not path.is_file():
            continue
        if any(part in SKIP_DIRS for part in path.parts):
            continue
        if path.suffix.lower() in EXTENSION_LANGUAGE:
            yield path


def count_non_empty_lines(path: Path) -> int:
    text = path.read_text(encoding="utf-8", errors="ignore")
    return sum(1 for line in text.splitlines() if line.strip())


def analyze_folder(base: Path) -> FolderLoc:
    per_language: Counter = Counter()
    files = 0
    lines = 0

    for file_path in iter_source_files(base):
        language = EXTENSION_LANGUAGE[file_path.suffix.lower()]
        loc = count_non_empty_lines(file_path)
        per_language[language] += loc
        files += 1
        lines += loc

    return FolderLoc(files=files, lines=lines, per_language=per_language)


def print_report(title: str, data: FolderLoc) -> None:
    print(f"\n{title}")
    print("-" * len(title))
    print(f"Files counted: {data.files}")
    print(f"Non-empty LOC: {data.lines}")
    if data.lines == 0:
        print("No matching files found.")
        return

    print("Language split:")
    for language, loc in data.per_language.most_common():
        pct = (loc / data.lines) * 100
        print(f"  - {language:<12} {loc:>7} lines ({pct:>6.2f}%)")


def main() -> None:
    parser = argparse.ArgumentParser(
        description=(
            "Calculate LOC by language for RGFN and engine, with engine shown separately."
        )
    )
    parser.add_argument(
        "--repo-root",
        default=Path(__file__).resolve().parents[2],
        type=Path,
        help="Repository root path (defaults to current project root).",
    )
    parser.add_argument(
        "--rgfn-dir",
        default="rgfn_game",
        help="RGFN game directory relative to repo root.",
    )
    parser.add_argument(
        "--engine-dir",
        default="engine",
        help="Engine directory relative to repo root.",
    )
    args = parser.parse_args()

    repo_root = args.repo_root.resolve()
    rgfn_path = (repo_root / args.rgfn_dir).resolve()
    engine_path = (repo_root / args.engine_dir).resolve()

    if not rgfn_path.exists():
        raise SystemExit(f"RGFN directory not found: {rgfn_path}")
    if not engine_path.exists():
        raise SystemExit(f"Engine directory not found: {engine_path}")

    rgfn_stats = analyze_folder(rgfn_path)
    engine_stats = analyze_folder(engine_path)

    combined = FolderLoc(
        files=rgfn_stats.files + engine_stats.files,
        lines=rgfn_stats.lines + engine_stats.lines,
        per_language=rgfn_stats.per_language + engine_stats.per_language,
    )

    print_report("RGFN Game", rgfn_stats)
    print_report("Engine (separate)", engine_stats)
    print_report("RGFN + Engine (combined)", combined)


if __name__ == "__main__":
    main()
