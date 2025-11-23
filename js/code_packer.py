import os
import sys
import math

def pack_into_n_files(n: int):
    root = os.getcwd()
    files = []

    for dirpath, _, filenames in os.walk(root):
        for f in filenames:
            if f == os.path.basename(__file__):
                continue
            full = os.path.join(dirpath, f)
            rel = os.path.relpath(full, root)
            files.append(rel)

    if not files:
        print("No files to pack.")
        return

    chunk = math.ceil(len(files) / n)
    groups = [files[i:i+chunk] for i in range(0, len(files), chunk)]

    for i, group in enumerate(groups, start=1):
        out_name = f"package_{i}.txt"
        with open(out_name, "w", encoding="utf-8") as out:
            for path in group:
                out.write(f"\n===== FILE: {path} =====\n")
                try:
                    with open(path, "r", encoding="utf-8", errors="ignore") as src:
                        out.write(src.read())
                except Exception as e:
                    out.write(f"[ERROR READING FILE: {e}]\n")

    print(f"Created {len(groups)} files.")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python pack.py <N>")
        sys.exit(1)
    pack_into_n_files(int(sys.argv[1]))
