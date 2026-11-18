# Wikidata pilot

The first Milestone 1 release is a curated pilot of 71 films from 72 candidates, retrieved on November 18, 2026. The seed list deliberately mixes international releases, documentaries, animation, television films, and same-title releases. It includes one TV series as an exclusion check. This sample tests the pipeline and browsing experience. Its proportions cannot estimate coverage of the wider catalog.

| Check | Result |
| --- | --- |
| Wikidata IDs resolved | 72 of 72. All are distinct. |
| Included / held | 71 films included. The Last of Us is held as a TV series. |
| Release year | Every included seed year is supported by a non-deprecated P577 statement with year precision or better. 42 films list publication dates in multiple years. |
| Television films | 8 are shown as TV movies. Five have direct Wikidata classification and three have a separate editorial review with linked evidence. |
| Genre grouping | All 71 match at least one of 12 filters. 68 fall in the four named map groups. Duel, Brian's Song and The Night Stalker appear in Other, with Thriller, Sports and Horror tags. |
| Title collisions | 4 same-title pairs remain separate, including Solaris (1972/2002) and The Thing (1982/2011). |
| Country and title variants | 71 films have country claims. 38 films have alternate titles indexed for search. |

## How evidence is used

- Resolve curated article names to Wikidata IDs via Wikimedia's page properties API. Fetch selected structured Wikidata evidence by ID. The snapshot contains no article text, images, or ratings.
- Use the English or language-independent label, falling back to an English title statement. Search also indexes English aliases and additional titles reported in P1476.
- Use the curated candidate year only when it matches a Wikidata publication-date statement. The report and detail panel retain the other reported years. Statement IDs and qualifiers remain in the snapshot. Territory, festival, broadcast, and reissue qualifiers can affect interpretation. Search by year still uses the display year so same-title releases remain easy to distinguish.
- Include records whose P31 type matches a supported film class. Use direct TV film classification or a title-specific review for TV movie labels. Keep these editorial decisions separate from the Wikidata claims.
- The map group order is Animation, Documentary, Science fiction, then Drama, with Other for the remaining films. Eight additional genre filters use explicit Wikidata claim mappings. Documentary and animation can be both genre and form here. Position and distance do not represent similarity.

## Format and date review

On November 18, 2026, separate production and broadcast sources resolved the three TV candidates whose Wikidata entries list the generic film type:

- *The Day After* was an ABC television presentation in 1983. The snapshot also records publications in 1984 in other territories. [Paley Center broadcast archive](https://www.paleycenter.org/collection/item?item=T84%3A0208)
- *Duel* was made for television and broadcast in 1971. Later international theatrical releases explain part of the spread of dates. The snapshot also includes a 1974 claim, which remains a reported publication year. [Amblin production history](https://amblin.com/movie/duel/)
- *Behind the Candelabra* was an HBO Films production broadcast by HBO Canada in May 2013 and screened that year at Cannes. Both release contexts fit the same display year. [HBO Canada announcement](https://www.bellmedia.ca/the-lede/press/lavishness-luster-and-liberace//) · [Cannes festival record](https://www.festival-cannes.com/en/f/behind-the-candelabra/)

These three reviews resolve format. The 42 multi-year records remain flagged for publication context. We have not independently verified every territorial or reissue date.

Inspect [candidate decisions](../data/wikidata-pilot/audit.json), [format reviews](../data/wikidata-pilot/format-reviews.json), [pinned source evidence](../data/wikidata-pilot/snapshot.json), and [rebuild commands](../data/README.md).

Sources include [Wikidata data access](https://www.wikidata.org/wiki/Wikidata:Data_access), [licensing](https://www.wikidata.org/wiki/Wikidata:Licensing), [publication date (P577)](https://www.wikidata.org/wiki/Property:P577), and [Wikimedia API etiquette](https://www.mediawiki.org/wiki/API:Etiquette).
