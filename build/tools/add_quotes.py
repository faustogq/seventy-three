"""Adds the quotations found by a saints workflow to the app data.

usage: python3 -I build/tools/add_quotes.py RESULT.json [PROJECT]
  RESULT.json  a workflow result: {"results": [{"extract": {"saints": [...]}, "check": {"saints": [...]}}]}

Each saint entry has own_translation (true: we translated from the original; false: an existing public-domain English
text), an edition {title, year, url, local_file, english_translator?} and quotes [{text, original, language, work,
locator, verse?, themes}]. The check entry says whether the edition passed (edition_ok) and, per quotation, keep and
an optional corrected_text.

A quotation is kept only if the check passed, the reviewer kept it, and the text it rests on (the original for our own
translations, the English for existing translations) is found verbatim in the files of the saint's folder, after
normalising only whitespace, end-of-line hyphenation and quote marks. Own translations get t (English), o (original),
xl (language) and oe (edition); existing translations get tr (translator) and y (year).
"""
import collections, glob, hashlib, json, os, re, sys

RES = sys.argv[1]
P = sys.argv[2] if len(sys.argv) > 2 else os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
res = json.load(open(RES)); res = res.get('result', res)
bible = json.load(open(P + '/data/bible.json'))
SNAME = {s['id']: s['n'] for s in json.load(open(P + '/data/saints.json'))['saints']}

name2code = {b['name'].lower(): b['code'] for b in bible['books']}
name2code.update({'psalm': 'PSA', 'psalms': 'PSA', 'song of solomon': 'SOL', 'canticle of canticles': 'SOL', 'apocalypse': 'REV', 'ecclesiasticus': 'SIR'})
key2g = {}                       # modern (Hebrew/RSV) reference -> Douay-Rheims global index
for b in bible['books']:
    g = b['start']
    for c, n in enumerate(b['ch'], 1):
        for v in range(1, n + 1):
            std = bible['std'].get(str(g)); cc, vv = map(int, std.split(':')) if std else (c, v)
            key2g.setdefault((b['code'], cc, vv), g); g += 1
def verse_g(ref):
    m = re.match(r'^\s*((?:[1-3]\s)?[A-Za-z][A-Za-z ]*?)\s+(\d+):(\d+)', ref or '')
    code = name2code.get(m.group(1).lower().strip()) if m else None
    return key2g.get((code, int(m.group(2)), int(m.group(3))), -1) if code else -1

def norm(s):
    for a, b in (('’', "'"), ('‘', "'"), ('“', '"'), ('”', '"'), ('«', '"'), ('»', '"'), ('­', '')):
        s = s.replace(a, b)
    s = re.sub(r'(\w)-\s*\n\s*(\w)', r'\1\2', s)
    return re.sub(r'\s+', ' ', s).strip()
def short_locator(l):
    """Keeps a location readable: cut after its first complete clause when it runs long, never inside parentheses."""
    if len(l) <= 120: return l
    depth = 0
    for i, ch in enumerate(l):
        depth += (ch == '(') - (ch == ')')
        if 40 <= i <= 140 and depth == 0 and ch in ').;' and (i + 1 == len(l) or l[i + 1] == ' ') \
                and not re.search(r'\b(Aug|vol|col|ch|p|pp|ed|no|n|cf|St|Vol|Bk|tom|t)\.$', l[:i + 1]):
            return l[:i + 1].rstrip(';')
    cut = l[:117].rsplit(' ', 1)[0].rstrip(',;(') + '…'
    return cut + ')' * max(0, cut.count('(') - cut.count(')'))

q = json.load(open(P + '/data/quotes.json'))
seen = {norm(x['t']).lower() for x in q['q']}; ids = {x['i'] for x in q['q']}
added, dropped, works = collections.Counter(), collections.Counter(), collections.OrderedDict()
for r in res['results']:
    checks = {c['id']: c for c in (r.get('check') or {}).get('saints', [])}
    for s in r['extract']['saints']:
        sid = s['id']
        if not s.get('found') or not s.get('quotes'): dropped[sid + ' (no source)'] += 1; continue
        ck = checks.get(sid)
        if not ck or not ck.get('edition_ok', ck.get('copyright_ok')): dropped[sid + ' (edition)'] += len(s['quotes']); continue
        by = {x['index']: x for x in ck['results']}
        ed = s['edition']
        folder = os.path.dirname(ed['local_file'])
        files = sorted(set(glob.glob(os.path.join(folder, '**', '*.txt'), recursive=True)) | {ed['local_file']})
        src = norm('\n'.join(open(f, encoding='utf-8', errors='replace').read() for f in files if os.path.exists(f)))
        if not src: dropped[sid + ' (files missing)'] += len(s['quotes']); continue
        own = s.get('own_translation', True)
        for i, x in enumerate(s['quotes']):
            v = by.get(i)
            if not v or not v['keep']: dropped[sid + ' (reviewer)'] += 1; continue
            text = norm(v.get('corrected_text') or x['text'])
            if norm(x['original'] if own else x['text']) not in src: dropped[sid + ' (not verbatim)'] += 1; continue
            if text.lower() in seen: dropped[sid + ' (duplicate)'] += 1; continue
            qid = hashlib.sha1((sid + text).encode()).hexdigest()[:8]
            while qid in ids: qid = hashlib.sha1(qid.encode()).hexdigest()[:8]
            ids.add(qid); seen.add(text.lower())
            rec = {'i': qid, 's': sid, 't': text, 'w': x['work'], 'l': short_locator(x.get('locator', '')), 'g': verse_g(x.get('verse')),
                   'th': [t.lower() for t in x.get('themes', [])][:4]}
            if own: rec.update({'tr': '', 'y': '', 'xl': x['language'], 'o': norm(x['original']), 'oe': f"{ed['title']} ({ed['year']})"})
            else: rec.update({'tr': ed.get('english_translator', ''), 'y': str(ed['year'])[:4]})
            q['q'].append(rec); added[sid] += 1
            w = works.setdefault((sid, x['work'], own), {'saint': SNAME.get(sid, s['name']), 'work': x['work'], 'tr': rec.get('tr', ''), 'y': rec.get('y', ''), 'n': 0, 'url': ed['url']})
            if own: w.update({'xl': x['language'], 'oe': f"{ed['title']} ({ed['year']})"})
            w['n'] += 1
json.dump(q, open(P + '/data/quotes.json', 'w'), ensure_ascii=False, separators=(',', ':'))
c = json.load(open(P + '/data/credits.json'))
c['works'] += list(works.values()); c['works'].sort(key=lambda w: (w['saint'], w['work']))
json.dump(c, open(P + '/data/credits.json', 'w'), ensure_ascii=False, separators=(',', ':'))
print('added', sum(added.values()), 'from', len(added), 'saints; total quotes', len(q['q']), '; saints posting', len({x['s'] for x in q['q']}))
for k, v in sorted(added.items(), key=lambda kv: -kv[1]): print(f'  + {SNAME.get(k, k)}: {v}')
print('dropped:', dict(dropped))
