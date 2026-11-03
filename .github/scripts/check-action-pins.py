#!/usr/bin/env python3
"""Check that every action this repository uses is pinned to a commit that exists.

    python3 .github/scripts/check-action-pins.py [root]

`root` defaults to `.github`, which covers workflows *and* composite actions
(`.github/actions/**/action.yml`) - refs in a composite action are scored by the
scorecard the same way, so they are checked the same way.

Two things are checked, because a pin can be wrong in two ways:

  - it is not a commit at all (`uses: owner/repo@v1`, `@main`). The scorecard's
    Pinned-Dependencies check scores that on the next push to the default branch -
    too late to be useful in review, which is why it fails here directly.
  - it is 40 hex but does not exist in that action's repository. The step then
    fails at action resolution the next time its workflow runs, and for the
    scorecard workflow that is the push that follows the merge. Pinning an
    annotated tag's own id rather than the commit it points to produces exactly
    that.

The file is read as YAML-ish text rather than through a parser, because a
workflow's content is not the same as the actions it uses: a `uses:` inside a
`run: |` block is shell text, and a quoted ref carries its quotes into any naive
comparison. Both are handled here - block scalars are skipped, quotes are
stripped - and both are covered by the shapes this repository already contains.

Local (`./path`) and container (`docker://image`) refs are not actions from a
repository, so they are skipped.
"""
import json
import os
import pathlib
import re
import sys
import time
import urllib.error
import urllib.request

USES = re.compile(r'^(\s*)(?:-\s+)?uses:\s*(.+?)\s*$')
BLOCK = re.compile(r'^(\s*)(?:-\s+)?[\w.-]+:\s*[|>][-+]?\s*(?:#.*)?$')


def refs_in(path):
    """Every (line number, ref) that is genuinely a `uses:` key in this file."""
    found = []
    block_indent = None

    for number, line in enumerate(path.read_text().splitlines(), start=1):
        indent = len(line) - len(line.lstrip())

        if block_indent is not None:
            # still inside the block scalar until something is indented no more
            if line.strip() == '' or indent > block_indent:
                continue
            block_indent = None

        if line.lstrip().startswith('#'):
            continue

        block = BLOCK.match(line)
        if block:
            block_indent = len(block.group(1))
            continue

        match = USES.match(line)
        if not match:
            continue

        value = match.group(2)
        # a trailing comment is not part of the ref; a '#' inside a quoted value
        # would be, but no action ref contains one
        value = re.sub(r'\s+#.*$', '', value).strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in '"\'':
            value = value[1:-1]
        found.append((number, value))

    return found


def api(path, token):
    request = urllib.request.Request(
        f'https://api.github.com{path}',
        headers={
            'Authorization': f'Bearer {token}',
            'Accept': 'application/vnd.github+json',
        },
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.load(response)


def resolves(repo, sha, token):
    """(True, '') when the commit exists; (False, reason) otherwise.

    A rate limit or a 5xx is retried rather than reported as a bad pin: the step
    exists to catch a wrong sha, not to fail an unrelated pull request because the
    API was busy.
    """
    for attempt in range(3):
        try:
            api(f'/repos/{repo}/commits/{sha}', token)
            return True, ''
        except urllib.error.HTTPError as error:
            if error.code in (404, 422):
                return False, f'no such commit in {repo}'
            if error.code in (401, 403, 429) and attempt < 2:
                time.sleep(20 * (attempt + 1))
                continue
            return False, f'could not be checked (HTTP {error.code})'
        except (urllib.error.URLError, TimeoutError) as error:
            if attempt < 2:
                time.sleep(20 * (attempt + 1))
                continue
            return False, f'could not be checked ({error})'
    return False, 'could not be checked'


def main():
    root = sys.argv[1] if len(sys.argv) > 1 else '.github'
    token = os.environ.get('GITHUB_TOKEN', '')
    if not token:
        print('::error::GITHUB_TOKEN is not set')
        return 1

    files = sorted(
        path
        for path in pathlib.Path(root).rglob('*')
        if path.suffix in ('.yml', '.yaml') and path.is_file()
    )

    unpinned = []
    checked = 0
    unresolved = []

    for path in files:
        for number, ref in refs_in(path):
            if ref.startswith('./') or ref.startswith('docker://'):
                continue

            if '@' not in ref:
                unpinned.append((path, number, ref, 'no @<ref> at all'))
                continue

            action, sha = ref.rsplit('@', 1)
            if not re.fullmatch(r'[0-9a-f]{40}', sha):
                unpinned.append((path, number, ref, 'not a full commit SHA'))
                continue

            parts = action.split('/')
            if len(parts) < 2:
                unpinned.append((path, number, ref, 'not an owner/repo action'))
                continue

            repo = '/'.join(parts[:2])
            checked += 1
            ok, reason = resolves(repo, sha, token)
            if not ok:
                unresolved.append((path, number, ref, reason))

    for path, number, ref, why in unpinned:
        print(f'::error file={path},line={number}::uses: {ref} is not pinned to a commit SHA - {why}')

    for path, number, ref, why in unresolved:
        print(f'::error file={path},line={number}::uses: {ref} does not resolve - {why}')

    print(
        f'checked {checked} pinned action(s) in {len(files)} file(s): '
        f'{len(unpinned)} unpinned, {len(unresolved)} unresolved'
    )

    return 1 if (unpinned or unresolved) else 0


if __name__ == '__main__':
    sys.exit(main())
