# Sources and licenses

Seventy-Three is built from public-domain texts and from open projects. This page lists every source, what was taken from it, and its license. The same list is in the app (person icon › Settings › Sources and credits).

## The Bible

| Source | Used for | License |
|---|---|---|
| Douay-Rheims Bible, Challoner revision, 1899 American edition, text from [eBible.org](https://ebible.org/find/details.php?id=engDRA) | All 73 books (`data/bible.json`) | Public domain |
| King James Version with Apocrypha, from eBible.org | Only to compute which verse each Douay-Rheims verse is in modern numbering. Not shown | Public domain |

## Cross-references (`data/xrefs.json`)

| Source | Used for | License |
|---|---|---|
| [OpenBible.info Cross References](https://www.openbible.info/labs/cross-references/) | Links between verses and reader votes, converted to Douay-Rheims numbering | [CC BY](https://creativecommons.org/licenses/by/4.0/) |
| Haydock's Catholic Bible Commentary (1859) and Challoner's notes | Links for the deuterocanonical books: the verses these commentators cite | Public domain |

## The Fathers and commentary (`data/fathers/`)

| Source | License |
|---|---|
| Catena Aurea of St. Thomas Aquinas, English translation edited by John Henry Newman, Oxford, 1841–45 | Public domain |
| Ante-Nicene Fathers (1885–96), Nicene and Post-Nicene Fathers (1886–1900) and Library of the Fathers (Oxford, 1838–81). Passages and their verse links come from the [Historical Christian Faith](https://github.com/HistoricalChristianFaith) databases. Only passages found word for word in the cited 19th-century text were kept, and machine translations were left out | Public domain |
| Haydock's Catholic Bible Commentary, George Leo Haydock, 1859 edition | Public domain |
| Challoner's notes to the Douay-Rheims (1749–52), from [Project Gutenberg eBook #1581](https://www.gutenberg.org/ebooks/1581) | Public domain |

## Saints (`data/saints.json`, `data/martyrology.json`)

| Source | Used for | License |
|---|---|---|
| [romcal](https://github.com/romcal/romcal) | The saints of the General Roman Calendar | MIT ([license text](data/licenses/romcal-MIT.txt)) |
| The Roman Martyrology, English translation (1908), text from [Divinum Officium](https://github.com/DivinumOfficium/divinum-officium) | Martyrology of each day | Text public domain; Divinum Officium under MIT ([license text](data/licenses/divinum-officium-MIT.txt)) |
| Catholic Encyclopedia (1907–14), Butler's Lives of the Saints, Wikidata, Wikipedia | Checking the profiles, which were written for this app | Profiles: CC BY 4.0 (see LICENSE-CONTENT.txt). Wikidata is CC0; Wikipedia, used only for checking facts, is CC BY-SA |
| F. C. Husenbeth, *Emblems of Saints* (1882) | The traditional symbols the emblems were drawn after | Public domain |

## Words of the saints (`data/quotes.json`)

Every quotation is copied word for word from a public-domain English translation and was checked against it. The full list of works, translators, years and source links is in [`data/credits.json`](data/credits.json). Each translation was checked to be in the public domain both in the United States (published before 1931) and in countries where copyright lasts 70 years after the translator's death. The results, and the four translations removed because of them, are in [docs/translation-audit.md](docs/translation-audit.md).

Where no free English translation exists, quotations were **translated for this app** from the original Latin, French, Italian or Spanish, with the help of AI, and checked against the original by a second review. They come from editions first published before 1931: Migne's *Patrologia Latina* (St. Peter Chrysologus, St. Peter Damian, St. Bruno, St. Hildegard), Borgnet's *Opera omnia* of St. Albert the Great (1890–99), the *Acta Sanctorum* (St. Dominic), the *Opera omnia* of St. Lawrence of Brindisi (vol. 1, 1928), the *Œuvres complètes* of St. John Eudes (1905–11), the 19th-century editions of St. Peter Julian Eymard and St. Anthony Mary Claret, Don Bosco's own publications, and the *Acta Sanctae Sedis* and encyclicals of St. Pius X. Each such quotation says so in the app and shows its original text and edition.

The whole **Didache** (Teaching of the Twelve Apostles) is included in J. B. Lightfoot's translation (1891, public domain), from [Wikisource](https://en.wikisource.org/wiki/Didache_(Lightfoot_translation)).

## Calendar and readings (`data/calendar*.json`)

| Source | Used for | License |
|---|---|---|
| [Liturgical Calendar API](https://github.com/Liturgical-Calendar/LiturgicalCalendarAPI), John R. D'Orazio and contributors | Liturgical days, ranks, colours, national calendars, lectionary references | Apache License 2.0 ([license text](data/licenses/litcal-Apache-2.0.txt)) |
| [Tamil Catholic Lectionary](https://github.com/jayarathina/Tamil-Catholic-Lectionary) | Reading references | The Unlicense, public domain ([text](data/licenses/tamil-lectionary-Unlicense.txt)) |
| [sate](https://github.com/sawirricardo/sate) | Cross-checking reading references | MIT ([license text](data/licenses/sate-MIT.txt)) |
| *Ordo Lectionum Missae*, editio typica altera (1981) | Checking reading references | References only (facts), no text copied |

The readings are shown in the Douay-Rheims text, so wording and some verse numbers differ from the lectionary translation used in parishes.

## Fonts (`build/fonts/`)

| Font | Authors | License |
|---|---|---|
| EB Garamond | Georg Duffner, Octavio Pardo | [SIL Open Font License 1.1](build/fonts/OFL-EBGaramond.txt) |
| Manrope | Mikhail Sharanda | [SIL Open Font License 1.1](build/fonts/OFL-Manrope.txt) |
