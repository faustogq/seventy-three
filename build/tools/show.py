"""Print Douay-Rheims text for references like 'LUK 1:38' or 'LUK 1:46-49' (Douay-Rheims numbering)."""
import json, sys
b = json.load(open('/Users/fausto/Desktop/Seventy-Three/data/bible.json')); BK = {x['code']: x for x in b['books']}
def g(code, c, v): x = BK[code]; return x['start'] + sum(x['ch'][:c - 1]) + v - 1
for ref in sys.argv[1:]:
    code, cv = ref.split(' '); c, vv = cv.split(':'); a, _, e = vv.partition('-')
    for v in range(int(a), int(e or a) + 1): print(f'{code} {c}:{v} | {b["text"][g(code, int(c), v)]}')
