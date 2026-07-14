#!/usr/bin/env python3
# Content-hash cache-busting: stamps ?v=<md5[:8]> onto asset refs in every HTML
# file. HTML is served with revalidation, assets are immutable — so a changed
# asset gets a new URL and always reaches the browser, while unchanged assets
# stay fully cached. Re-run on every deploy; it's idempotent.
import re, hashlib, pathlib, sys
root = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else '.')
ASSETS = ['styles.css', 'app.js', 'api-base.js', 'account.js', 'fonts.css', 'admin.js', 'leadmeta.js']
ver = {}
for name in ASSETS:
    f = root / 'assets' / name
    if f.exists():
        ver[name] = hashlib.md5(f.read_bytes()).hexdigest()[:8]
changed = 0
for html in root.rglob('*.html'):
    s = html.read_text(encoding='utf-8'); o = s
    for name, h in ver.items():
        s = re.sub(r'(/assets/' + re.escape(name) + r')(\?v=[0-9a-f]+)?', r'\1?v=' + h, s)
    if s != o:
        html.write_text(s, encoding='utf-8'); changed += 1
print('asset versions:', ver)
print('HTML files stamped:', changed)
