"""Builds the public website into dist-site/: the landing page (site/) at the root and the full web app (offline-app/) under /app/.

usage: python3 build/site.py [SITE_URL]
  SITE_URL  the address the site is served from, used for link previews (default https://seventy-three.pages.dev)
Run build/assemble.py first so offline-app/ is up to date.
"""
import os, re, sys, shutil

B = os.path.dirname(os.path.abspath(__file__))
P = os.path.dirname(B)
SITE = (sys.argv[1] if len(sys.argv) > 1 else 'https://seventy-three.pages.dev').rstrip('/')
OUT = P + '/dist-site'

assert os.path.exists(P + '/offline-app/index.html'), 'run build/assemble.py first'
if os.path.isdir(OUT): shutil.rmtree(OUT)
shutil.copytree(P + '/site', OUT, ignore=shutil.ignore_patterns('index.src.html', '.DS_Store'))
shutil.copytree(P + '/offline-app', OUT + '/app', ignore=shutil.ignore_patterns('LEEME.txt', '.DS_Store'))

html = open(P + '/site/index.src.html').read()
html = html.replace('/*FONTS*/', open(B + '/fonts.css').read())
html = html.replace('%SITE%', SITE).replace('%APP%', 'app/')
assert '%SITE%' not in html and '%APP%' not in html, 'unfilled placeholder'
open(OUT + '/index.html', 'w').write(html)

# media can be cached for a long time; the page and the app must be checked for updates
open(OUT + '/_headers', 'w').write('/media/*\n  Cache-Control: public, max-age=604800\n/fonts/*\n  Cache-Control: public, max-age=31536000, immutable\n')
size = sum(os.path.getsize(os.path.join(r, f)) for r, _, fs in os.walk(OUT) for f in fs)
files = sum(len(fs) for _, _, fs in os.walk(OUT))
big = max(((os.path.getsize(os.path.join(r, f)), os.path.join(r, f)[len(OUT) + 1:]) for r, _, fs in os.walk(OUT) for f in fs))
print('dist-site:', files, 'files,', round(size / 1e6, 1), 'MB; largest', big[1], round(big[0] / 1e6, 1), 'MB; site', SITE)
