#!/usr/bin/env python3
"""Upload dist/ to the web FTP target and prune stale remote files.

Vite content-hashes built assets (index-<hash>.js), so every build leaves the
previous hash's file behind on the server if nothing removes it. This script
mirrors each directory dist/ itself manages - the account root, dist/api/,
dist/assets/ - deleting any remote file in those directories that no longer
exists locally. It never lists or touches a remote directory that has no
local counterpart, so anything outside dist's own footprint is left alone.

Usage:
    npm run build
    python3 scripts/deploy_ftp.py [--dry-run]

Password resolution: FTP_PASSWORD env var if set, else macOS Keychain
(service "dreamflowCommandForFlutterFlow.ftp", account per HOST/USER below).
"""
import argparse
import ftplib
import os
import subprocess
import sys
from pathlib import Path

HOST = "ftp.connectio.com.au"
PORT = 21
USER = "opencode_upload@connectio.com.au"
KEYCHAIN_SERVICE = "dreamflowCommandForFlutterFlow.ftp"

REPO_ROOT = Path(__file__).resolve().parent.parent
DIST = REPO_ROOT / "dist"


def resolve_password():
    env_password = os.environ.get("FTP_PASSWORD")
    if env_password:
        return env_password

    try:
        result = subprocess.run(
            ["security", "find-generic-password", "-s", KEYCHAIN_SERVICE, "-a", USER, "-w"],
            capture_output=True, text=True, check=True,
        )
        return result.stdout.strip()
    except (subprocess.CalledProcessError, FileNotFoundError) as error:
        sys.exit(
            f"Could not read the FTP password from Keychain ({error}). "
            f"Set FTP_PASSWORD or add it with:\n"
            f'  security add-generic-password -s {KEYCHAIN_SERVICE} -a {USER} -w',
        )


def local_files_and_dirs(root):
    """Returns (relative file paths, relative dir paths including "") under root."""
    files = set()
    dirs = {""}
    for path in root.rglob("*"):
        rel = path.relative_to(root).as_posix()
        if path.is_file():
            files.add(rel)
        elif path.is_dir():
            dirs.add(rel)
    return files, dirs


def ensure_remote_dir(ftp, rel_dir, made):
    if not rel_dir or rel_dir in made:
        return
    parts = rel_dir.split("/")
    for i in range(len(parts)):
        path = "/".join(parts[: i + 1])
        if path in made:
            continue
        try:
            ftp.mkd(path)
            print(f"  mkdir  {path}")
        except ftplib.all_errors:
            pass  # already exists
        made.add(path)


def upload_all(ftp, local_files, dry_run):
    made_dirs = set()
    uploaded = []
    failed = []

    for rel in sorted(local_files):
        ensure_remote_dir(ftp, os.path.dirname(rel), made_dirs)
        local_path = DIST / rel
        size = local_path.stat().st_size

        if dry_run:
            print(f"  would upload {rel} ({size:,} bytes)")
            continue

        try:
            with local_path.open("rb") as handle:
                ftp.storbinary(f"STOR {rel}", handle)
            print(f"  upload {rel} ({size:,} bytes)")
            uploaded.append(rel)
        except ftplib.all_errors as error:
            print(f"  FAIL upload {rel}: {error}")
            failed.append(rel)

    return uploaded, failed


def list_remote_dir(ftp, rel_dir):
    """Returns [(name, is_dir), ...] for one directory, or [] if it doesn't exist."""
    entries = []
    lines = []
    try:
        ftp.retrlines(f"LIST {rel_dir}" if rel_dir else "LIST", lines.append)
    except ftplib.all_errors:
        return entries

    for line in lines:
        parts = line.split(None, 8)
        if len(parts) < 9:
            continue
        name = parts[8]
        if name in (".", ".."):
            continue
        entries.append((name, parts[0].startswith("d")))

    return entries


def prune_stale_files(ftp, local_files, local_dirs, dry_run):
    """Deletes remote files not present locally, scoped to directories dist
    manages. A remote directory with no local counterpart is never listed, so
    it is never touched."""
    removed = []
    failed = []

    for rel_dir in sorted(local_dirs):
        for name, is_dir in list_remote_dir(ftp, rel_dir):
            if is_dir:
                continue  # only prune files; subdirectories are handled by their own entry in local_dirs
            rel = f"{rel_dir}/{name}" if rel_dir else name
            if rel in local_files:
                continue

            if dry_run:
                print(f"  would delete {rel} (no longer built)")
                removed.append(rel)
                continue

            try:
                ftp.delete(rel)
                print(f"  delete {rel} (no longer built)")
                removed.append(rel)
            except ftplib.all_errors as error:
                print(f"  FAIL delete {rel}: {error}")
                failed.append(rel)

    return removed, failed


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Show what would be uploaded and deleted without changing the server",
    )
    args = parser.parse_args()

    if not DIST.is_dir():
        sys.exit(f"{DIST} does not exist. Run `npm run build` first.")

    local_files, local_dirs = local_files_and_dirs(DIST)
    if not local_files:
        sys.exit(f"{DIST} has no files to deploy.")

    password = resolve_password()

    ftp = ftplib.FTP()
    ftp.connect(HOST, PORT, timeout=120)
    ftp.login(USER, password)
    print(f"connected to {HOST} as {USER}" + (" (dry run)" if args.dry_run else ""))

    print("\n-- upload --")
    uploaded, upload_failed = upload_all(ftp, local_files, args.dry_run)

    print("\n-- prune stale files --")
    removed, prune_failed = prune_stale_files(ftp, local_files, local_dirs, args.dry_run)

    ftp.quit()

    failed = upload_failed + prune_failed
    verb = "would upload" if args.dry_run else "uploaded"
    prune_verb = "would delete" if args.dry_run else "deleted"
    print(f"\n{verb}={len(uploaded)} {prune_verb}={len(removed)} failed={len(failed)}")

    if failed:
        print("failed: " + ", ".join(failed))
        sys.exit(1)


if __name__ == "__main__":
    main()
