"""Assemble Seventy-Three from its sources.

  v7/*.html, v7/*.js   the app's source (head, styles, core, storage, rendering, events)
  build/books.json     each book's icon and description, copied into the app
  data/                Bible, cross-references, commentary, saints, quotations, calendar

Outputs:
  app-v7.html          the page published on claude.ai (the platform adds the document skeleton)
  sixty-six.html       copy of app-v7.html: the file that is published to the claude.ai link
  _test7.html          the same page in a plain document, for the local preview
  offline-app/         the installable version: index.html, service worker, manifest, icons, fonts, data
  seventy-three-offline.zip

usage: python3 build/assemble.py
"""
import os, re, json, shutil, hashlib, zipfile

B = os.path.dirname(os.path.abspath(__file__))
P = os.path.dirname(B)

meta = json.dumps(json.load(open(B + '/books.json')), ensure_ascii=False, separators=(',', ':'))   # each book's icon and description
head = open(P + '/v7/a_head.html').read()
css = open(P + '/v7/b_css.html').read()
js = ''.join(open(P + '/v7/' + f).read() + '\n' for f in ['c_core.js', 'd_store.js', 'e_render.js', 'f_events.js'])
js = js.replace('/*META*/{}/*END META*/', '/*META*/' + meta + '/*END META*/')
# data version: changes whenever any data file changes, so no browser reads an old cached copy
dh = hashlib.sha256()
for root, _, files in sorted(os.walk(P + '/data')):
    for f in sorted(files):
        if f.startswith('.'): continue
        dh.update(f.encode()); dh.update(open(os.path.join(root, f), 'rb').read())
js = js.replace("const DV='/*DV*/';", "const DV='%s';" % dh.hexdigest()[:8])
body = ('\n<div class="shell">\n  <main id="main"><div class="splash"><div><h1>Seventy-Three</h1><p>Opening the Douay-Rheims Bible…</p></div></div></main>\n'
        '  <aside class="rail" id="rail"></aside>\n</div>\n')
page = head + css + body + '<script>\n' + js + '</script>\n'
open(P + '/app-v7.html', 'w').write(page)
open(P + '/sixty-six.html', 'w').write(page)
wrap = ('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
        '<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui;background:#fafaf9}img{max-width:100%}[hidden]{display:none!important}</style></head><body>')
open(P + '/_test7.html', 'w').write(wrap + page + '</body></html>')

# ---------------- offline-app ----------------
O = P + '/offline-app'
if os.path.isdir(O): shutil.rmtree(O)
os.makedirs(O + '/fonts'); os.makedirs(O + '/icons')
shutil.copytree(P + '/data', O + '/data', ignore=shutil.ignore_patterns('.DS_Store', 'README.md'))
for f in os.listdir(B + '/fonts'):
    if f.endswith(('.woff2', '.txt')): shutil.copy(B + '/fonts/' + f, O + '/fonts/' + f)   # fonts and their OFL license texts
for f in ('icon-192.png', 'icon-512.png', 'apple-touch-icon.png'):
    shutil.copy(B + '/icons/' + f, O + '/icons/' + f)
fontcss = open(B + '/fonts.css').read()

phead = re.sub(r'<link rel="preconnect"[^>]*>\n|<link rel="stylesheet" href="https://fonts\.googleapis\.com[^>]*>\n', '', head)
assert 'fonts.googleapis' not in phead
phead = phead.replace('<style>', '<style>\n' + fontcss + 'body{margin:0}[hidden]{display:none!important}\n', 1)
doc = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
       '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
       '<meta name="description" content="The Catholic Bible as a feed: every book posts its verses, other books reply with cross-references, and the Fathers and saints comment.">\n'
       '<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">\n'
       '<meta name="theme-color" content="#141921" media="(prefers-color-scheme: dark)">\n'
       '<link rel="manifest" href="manifest.webmanifest">\n'
       '<link rel="icon" type="image/png" sizes="192x192" href="icons/icon-192.png">\n'
       '<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">\n'
       '<meta name="mobile-web-app-capable" content="yes">\n<meta name="apple-mobile-web-app-capable" content="yes">\n'
       '<meta name="apple-mobile-web-app-title" content="Seventy-Three">\n'
       + phead + css + '</head>\n<body>' + body + '<script>window.S73_PWA=1</script>\n<script>\n' + js + '</script>\n</body>\n</html>\n')
open(O + '/index.html', 'w').write(doc)

manifest = {"name": "Seventy-Three", "short_name": "Seventy-Three", "id": "./", "start_url": "./", "scope": "./", "display": "standalone",
            "description": "The Catholic Bible as a feed: every book posts its verses, other books reply with cross-references, and the Fathers and saints comment.",
            "background_color": "#f4f5f8", "theme_color": "#ffffff", "lang": "en",
            "icons": [{"src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any"},
                      {"src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any"},
                      {"src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"}]}
json.dump(manifest, open(O + '/manifest.webmanifest', 'w'), indent=1)

# each book's commentary is saved when first opened, or all at once from Settings
fathers = {f[:-5]: os.path.getsize(O + '/data/fathers/' + f) for f in sorted(os.listdir(O + '/data/fathers')) if f.endswith('.json') and not f.startswith('_')}
def digest(paths):
    h = hashlib.sha256()
    for p in paths: h.update(p.encode()); h.update(open(O + '/' + p, 'rb').read())
    return h.hexdigest()[:10]
fhash = digest(['data/fathers/%s.json' % c for c in fathers])
json.dump({'fcache': 's73-fathers-' + fhash, 'fathers': fathers}, open(O + '/data/offline.json', 'w'), separators=(',', ':'))
core = []
for root, _, files in os.walk(O):
    for f in files:
        rel = os.path.relpath(os.path.join(root, f), O)
        if rel.startswith('data/fathers/') and not os.path.basename(rel).startswith('_'): continue
        if rel in ('sw.js', 'LEEME.txt') or f.startswith('.'): continue
        core.append(rel)
core.sort()
vhash = digest(core)
sw = open(B + '/sw_template.js').read().replace('%CORE%', 's73-core-' + vhash).replace('%FATHERS%', 's73-fathers-' + fhash)
sw = sw.replace('%FILES%', json.dumps(['./'] + core))
open(O + '/sw.js', 'w').write(sw)
shutil.copy(B + '/LEEME.txt', O + '/LEEME.txt')

# ---------------- Android app: the same files inside the APK, no service worker needed ----------------
W = P + '/android/assets/www'
if os.path.isdir(P + '/android'):
    if os.path.isdir(W): shutil.rmtree(W)
    shutil.copytree(O, W, ignore=shutil.ignore_patterns('sw.js', 'LEEME.txt', 'manifest.webmanifest', 'icons', '.DS_Store'))
    ndoc = doc.replace('<script>window.S73_PWA=1</script>\n', '')
    ndoc = re.sub(r'<link rel="(manifest|icon|apple-touch-icon)"[^>]*>\n', '', ndoc)
    assert 'S73_PWA=1' not in ndoc
    open(W + '/index.html', 'w').write(ndoc)

Z = P + '/seventy-three-offline.zip'
with zipfile.ZipFile(Z, 'w', zipfile.ZIP_DEFLATED) as z:
    for root, _, files in sorted(os.walk(O)):
        for f in sorted(files):
            if f.startswith('.'): continue
            full = os.path.join(root, f)
            z.write(full, os.path.join('offline-app', os.path.relpath(full, O)))
size = lambda ps: sum(os.path.getsize(O + '/' + p) for p in ps)
print('page', len(page), '| offline-app core files', len(core), round(size(core) / 1e6, 1), 'MB; commentary', len(fathers), 'books',
      round(sum(fathers.values()) / 1e6, 1), 'MB; version', vhash, '| zip', round(os.path.getsize(Z) / 1e6, 1), 'MB')
