#!/usr/bin/env python3
"""Checks the deploy guard that keeps a half-built dist/ off production.

The FTP mirror prunes any remote file with no local counterpart, so deploying a
dist/index.html that names a bundle nobody built uploads the broken HTML *and*
deletes the bundle currently serving the site. dist/index.html is tracked while
dist/assets/ is gitignored, so a fresh clone reaches that state just by
skipping `npm run build`.

Run: python3 scripts/test-deploy-guard.py
"""
import importlib.util
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent


def load_deploy_module():
    spec = importlib.util.spec_from_file_location(
        "deploy_ftp", REPO_ROOT / "scripts" / "deploy_ftp.py",
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def main():
    deploy = load_deploy_module()
    built_html = (deploy.DIST / "index.html").read_text(encoding="utf-8")

    cases = [
        (
            "the committed dist references only files that exist",
            built_html,
            [],
        ),
        (
            "a bundle hash with no built file is caught",
            built_html.replace("assets/index-", "assets/index-absent-"),
            None,  # asserted below - the real hash is not known here
        ),
        (
            "external, protocol-relative, data and anchor refs are ignored",
            '<a href="#top"></a>'
            '<script src="https://cdn.tailwindcss.com"></script>'
            '<link href="//fonts.gstatic.com/x.css">'
            '<img src="data:image/png;base64,AA">'
            '<a href="mailto:someone@example.com">mail</a>',
            [],
        ),
        (
            "a query string does not hide a file that exists",
            '<script src="/assets/PLACEHOLDER?v=2"></script>',
            [],
        ),
        (
            "a relative reference is checked too",
            '<script src="assets/never-built.js"></script>',
            ["assets/never-built.js"],
        ),
        (
            "single-quoted attributes are checked",
            "<script src='/assets/never-built-2.js'></script>",
            ["assets/never-built-2.js"],
        ),
    ]

    # Resolve the real bundle name for the query-string case.
    real_bundle = next(
        (p.name for p in (deploy.DIST / "assets").glob("index-*.js")), None,
    )
    if real_bundle is None:
        sys.exit("No built bundle in dist/assets/. Run `npm run build` first.")

    failures = []
    for name, document, expected in cases:
        document = document.replace("PLACEHOLDER", real_bundle)
        actual = deploy.missing_referenced_assets(document)

        if expected is None:
            ok = len(actual) == 1 and actual[0].startswith("assets/index-absent-")
        else:
            ok = actual == expected

        print(f"{'PASS' if ok else 'FAIL'}  {name}")
        if not ok:
            failures.append(f"{name}: expected {expected}, got {actual}")

    if failures:
        print("\n" + "\n".join(failures))
        sys.exit(1)
    print(f"\n{len(cases)}/{len(cases)} passed")


if __name__ == "__main__":
    main()
