# Data files

All files are JSON. Verses are identified by a **global index** `g`: the position of the verse in `bible.json`'s `text` array, counting from 0 at Genesis 1:1 through all 73 books in the Douay-Rheims order. Chapter and verse numbers are always the Douay-Rheims ones (Vulgate numbering for the Psalms).

Where each file comes from is in [THIRD_PARTY.md](../THIRD_PARTY.md). The scripts that originally produced these files are not part of this repository, so the files themselves are the source of truth. Each one keeps a `source` note.

## `bible.json`

- `translation`: edition and origin.
- `books[]`: `code` (e.g. `GEN`, `1SA`, `REV`), `name` (modern English name), `dr` (Douay-Rheims name, e.g. "1 Kings" for 1 Samuel), `t` (`OT`/`NT`), `deut` (deuterocanonical), `start` (global index of its first verse), `ch` (number of verses in each chapter).
- `text[]`: the verse texts, by global index.
- `std`: `{g: "chapter:verse"}`, the verse's number in modern (Hebrew/RSV) numbering, only where it differs.

## `xrefs.json`

- `r[g]`: the cross-references of verse `g`, as one string of `;`-separated entries:
  - `t,votes` or `t,span,votes`: from OpenBible.info. `t` is the target verse, `span` how many verses the target range extends, `votes` the OpenBible.info readers' votes.
  - `t,span,n,src`: a verse cited in the commentaries, used for the deuterocanonical books. `n` is the number of notes citing it, and `src` is `h` (Haydock), `c` (Challoner) or `hc` (both).

## `fathers/<BOOK>.json`

- `v[g]`: comments on verse `g`, each as `[source, author, text, citation, url, end]`.
  - `source`: `catena` (Catena Aurea), `hcf` (Fathers, via Historical Christian Faith), `haydock` or `challoner`.
  - `author`: key into `saints.json` › `authors`, or `haydock`/`challoner`.
  - `end`: last verse of the passage commented, or 0 for a single verse.
- `_counts.json`: `{BOOK: {g: number of comments}}`.
- `_authors.json`: `{author: [verses they comment on]}`.

## `saints.json`

- `saints[]`: `id`, `n` (name), `h` (handle), `f` (feast `MM-DD`), `fs` (calendar the feast comes from), `b`/`d` (birth and death year), `t` (type, see `types`), `e` (emblem, see `emblems`), `r` (region), `bio`, `p` (patronages), `w` (reference link), `lv` (Saint or Blessed), `grc` (in the General Roman Calendar), `sort`.
- `extra[]`: Church writers and other authors who appear in the commentary but are not canonized saints.
- `authors`: maps the commentary's author keys to these accounts, with their kind (`saint`, `writer`, `compilation`, …).
- `types`, `emblems`: names of the types; emblem drawings as SVG paths.

## `quotes.json`

- `q[]`: `i` (id), `s` (saint id), `t` (the quotation), `w` (work), `l` (location in the work), `tr` (translator), `y` (year of the translation), `g` (related verse or -1), `th` (themes).

## `credits.json`

- `works[]`: every work quoted, with `saint`, `work`, `tr` (translator), `y`, `n` (number of quotations) and `url` (the public-domain source).

## `calendar.json`, `calendar_US.json`, `calendar_CA.json`

- `days["YYYY-MM-DD"]`: `s` (season), `w` (week), `sc`/`wc` (Sunday and weekday lectionary cycles), `c[]` (celebrations: `n` name, `r` rank, `col` liturgical colour), `rd[]` (readings: `l` label, `ref` lectionary reference in modern numbering, `g` Douay-Rheims verse ranges `[[start, end], …]`).
- The national files only list the days that differ from the General Roman Calendar; the app lays them over `calendar.json`.
- Coverage: October 2026 to December 2030.

## `martyrology.json`

- `days["MM-DD"]`: the Roman Martyrology entries for that day.

## `licenses/`

License texts of the projects whose data is included.
