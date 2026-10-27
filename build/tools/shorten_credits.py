"""Short translator and edition credits for the app (the full evidence is in docs/translation-audit.md and THIRD_PARTY.md).
usage: python3 -I build/tools/shorten_credits.py PROJECT"""
import json, sys
P = sys.argv[1]
TR = {  # saint id -> translator as shown in the app
    'paulinus_of_nola_bishop': 'H. G. Evelyn-White',
    'camillus_de_lellis_priest': 'Oratorian series, ed. F. W. Faber',
    'rose_of_lima_virgin': 'Oratorian series, ed. F. W. Faber',
    'cajetan_of_thiene_priest': 'Lady Herbert',
    'frances_of_rome_religious': 'Lady Georgiana Fullerton',
    'louise_de_marillac_religious': 'Alice, Lady Lovat',
    'elizabeth_of_hungary_religious': 'Francis Deming Hoyt',
    'damien_de_veuster_priest': 'Catholic Truth Society, ed. Fr. Pamphile De Veuster',
    'bernadette_soubirous_virgin': 'anonymous ("M. B.")',
    'frances_xavier_cabrini_virgin': 'anonymous (Missionary Sisters of the Sacred Heart)',
    'jean_theophane_venard_priest': 'Lady Herbert, rev. James A. Walsh',
    'john_gabriel_perboyre_priest': 'anonymous',
    'paul_miki_martyr': 'anonymous ("a Catholic Priest")',
    'peter_chanel_priest': 'Florence Gilmore',
    'perpetua_of_carthage_martyr': 'R. E. Wallis',
}
OE = {  # saint id -> edition of the original as shown in the app
    'gregory_vii_pope': 'Migne, Patrologia Latina 148 (1853); Jaffé, Monumenta Gregoriana (1865)',
    'martin_i_pope': 'Migne, Patrologia Latina 87 (1851)',
    'eusebius_of_vercelli_bishop': 'Migne, Patrologia Latina 12 (1845)',
    'pius_v_pope': 'Bullarium Romanum, Turin ed., vol. 7 (1862); Laderchi, Annales ecclesiastici 35 (1880)',
    'mary_of_the_incarnation_marie_guyart_religious': 'Lettres, ed. Richaudeau, vol. 2 (1876)',
    'andrew_kim_tae_gon_priest': "Dallet, Histoire de l'Église de Corée, vol. 2 (1874)",
    'peter_canisius_priest': 'Braunsberger, Epistulae et acta, vol. 1 (1896)',
    'scholastica_of_nursia_virgin': 'Migne, Patrologia Latina 66 (1847)',
    'nicholas_of_flue_hermit': 'Ming, Der selige Bruder Nikolaus von Flüe (1861); Amiet (1843)',
    'albert_the_great_bishop': 'Borgnet, Opera omnia, vols. 21-38 (1894-99)',
    'peter_chrysologus_bishop': 'Migne, Patrologia Latina 52 (1846)',
    'peter_damian_bishop': 'Migne, Patrologia Latina 144-145 (1853)',
    'lawrence_of_brindisi_priest': 'Opera omnia, vol. 1: Mariale (Padua, 1928)',
    'hildegard_of_bingen_abbess': 'Migne, Patrologia Latina 197 (1855)',
    'dominic_de_guzman_priest': 'Acta Sanctorum, August, vol. 1 (1867)',
    'bruno_of_cologne_priest': 'Acta Sanctorum, October, vol. 3 (1866)',
    'pius_x_pope': 'Acta Sanctae Sedis 36-41 (1903-08)',
    'john_eudes_priest': 'Œuvres complètes, vols. 1 and 8 (1905-08)',
    'peter_julian_eymard_priest': 'Mois de Notre-Dame du T. S. Sacrement, ed. Tesnière (1909)',
    'anthony_mary_claret_bishop': 'Camino recto y seguro para llegar al cielo (1862) and other works (1858-60)',
    'john_bosco_priest': 'his own publications (Turin, 1847-85)',
    'stephen_i_of_hungary': 'Endlicher, Rerum Hungaricarum Monumenta Arpadiana (1849)',
    'romuald_of_ravenna_abbot': 'Migne, Patrologia Latina 144 (1853); MGH Scriptores 15 (1888)',
}
qd = json.load(open(P + '/data/quotes.json')); sa = json.load(open(P + '/data/saints.json'))
name = {x['id']: x['n'] for x in sa['saints']}
ids = {x['s'] for x in qd['q']}
miss = [k for k in list(TR) + list(OE) if k not in ids]
assert not miss, miss
old = {}
for x in qd['q']:
    s = x['s']
    if s == 'cornelius_i_pope': x['tr'] = 'A. C. McGiffert' if 'Fabius' in x['w'] else 'R. E. Wallis'
    elif s in TR and x.get('tr'): x['tr'] = TR[s]
    if s in OE and x.get('oe'): old[x['oe']] = OE[s]; x['oe'] = OE[s]
json.dump(qd, open(P + '/data/quotes.json', 'w'), ensure_ascii=False, separators=(',', ':'))
cr = json.load(open(P + '/data/credits.json'))
sid = {v: k for k, v in name.items()}
for w in cr['works']:
    s = sid.get(w['saint'])
    if s == 'cornelius_i_pope': w['tr'] = 'A. C. McGiffert' if 'Fabius' in w['work'] else 'R. E. Wallis'
    elif s in TR and w.get('tr'): w['tr'] = TR[s]
    if w.get('oe') in old: w['oe'] = old[w['oe']]
json.dump(cr, open(P + '/data/credits.json', 'w'), ensure_ascii=False, separators=(',', ':'))
long = [(w['saint'], w.get('tr', ''), w.get('oe', '')) for w in cr['works'] if len(w.get('tr', '')) > 60 or len(w.get('oe', '')) > 90]
print('credits still long:', long)
