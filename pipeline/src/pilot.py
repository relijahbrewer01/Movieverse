"""Audit the bounded Wikidata pilot and rebuild the interactive sample."""

import argparse
import json
import re
import unicodedata
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path

from .catalog import ROOT, DemoProjection, Film, encode, release
from .wikidata import EVIDENCE

DATASET = "wikidata-pilot"
REPORT = EVIDENCE.parent / "audit.json"
FILM_TYPES = {"Q11424", "Q506240", "Q20650540", "Q202866"}
TV_FILM = "Q506240"
# The first matching group controls placement. Animation and documentary can overlap.
GENRE_GROUPS = {
    "Animation": {"Q20650540", "Q202866", "Q138831212", "Q4765076"},
    "Documentary": {"Q93204", "Q4765076"},
    "Science fiction": {"Q471839", "Q20656232", "Q108084492", "Q10663882", "Q725757"},
    "Drama": {"Q130232", "Q7168625", "Q113485322", "Q63214877", "Q859369",
              "Q127739154", "Q21010853"},
}


class PilotProjection(DemoProjection):
    id = "pilot-genre-groups-v1"
    spacing = 0.074


@dataclass
class Pilot:
    records: list[Film]
    report: dict

    def films(self):
        return self.records


def active(entity: dict, prop: str) -> list[dict]:
    return [row for row in entity["claims"].get(prop, []) if row["rank"] != "deprecated"]


def wikidata_year(row: dict) -> int | None:
    raw = row["value"]
    if not isinstance(raw, dict) or raw.get("precision", 0) < 9:
        return None
    match = re.match(r"\+(\d{4})-", raw.get("time", ""))
    return int(match[1]) if match else None


def label_key(title: str) -> str:
    return "".join(character for character in unicodedata.normalize("NFKD", title.casefold())
                   if character.isalnum())


def audit(snapshot: dict) -> Pilot:
    films: list[Film] = []
    rows = []
    title_groups = defaultdict(list)
    accepted_ids = set()
    terms = snapshot["terms"]

    for seed in snapshot["candidates"]:
        qid = seed["qid"]
        row = {**seed, "flags": [], "outcome": "held"}
        rows.append(row)
        entity = snapshot["entities"].get(qid)
        if not entity:
            row["flags"].append("unresolved-item")
            continue
        row["revision"] = entity["revision"]
        types = {entry["value"] for entry in active(entity, "P31") if isinstance(entry["value"], str)}
        row["instance_of"] = [terms.get(term, term) for term in sorted(types)]
        if not types & FILM_TYPES or "Q5398426" in types:
            row["flags"].append("outside-film-scope")
            continue
        if qid in accepted_ids:
            row["flags"].append("repeated-qid")
            continue

        titles = [entry["value"] for entry in active(entity, "P1476")
                  if isinstance(entry["value"], dict) and entry["value"].get("text")]
        title = entity["label"] or next((entry["text"] for entry in titles if entry["language"] == "en"), None)
        if not title:
            row["flags"].append("missing-display-title")
            continue
        row["title"] = title
        row["title_basis"] = entity["label_language"] + " label" if entity["label"] else "English P1476"
        aliases = list(dict.fromkeys([*entity["aliases"], *(entry["text"] for entry in titles)]))
        aliases = [alias for alias in aliases if alias.casefold() != title.casefold()]

        dates = defaultdict(list)
        for entry in active(entity, "P577"):
            year = wikidata_year(entry)
            if year is not None:
                dates[year].append(entry["id"])
        year = seed["expected_year"]
        row["publication_years"] = sorted(dates)
        if len(dates) > 1:
            row["flags"].append("multiple-publication-years")
        if year not in dates:
            row["flags"].append("expected-year-not-supported")
            continue
        row["selected_year_statements"] = sorted(dates[year])

        genre_ids = {entry["value"] for entry in active(entity, "P136") if isinstance(entry["value"], str)}
        genres = [name for name, ids in GENRE_GROUPS.items() if ids & (genre_ids | types)]
        if not genre_ids:
            row["flags"].append("missing-genre-claims")
        if not genres:
            row["flags"].append("no-mapped-genre")
        film_format = "TV movie" if TV_FILM in types else "Film"
        if seed["tv_candidate"] and film_format != "TV movie":
            row["flags"].append("tv-format-unconfirmed")
        country_ids = {entry["value"] for entry in active(entity, "P495") if isinstance(entry["value"], str)}
        countries = sorted({terms.get(term, term) for term in country_ids})
        films.append(Film(id=f"mv:wd:{qid}", title=title, year=year, aliases=aliases,
                         genres=genres, format=film_format, countries=countries, provenance={
                             "source": "wikidata", "status": "pilot", "rights": snapshot["rights"],
                             "qid": qid, "revision": str(entity["revision"]),
                             "retrieved": snapshot["retrieved"],
                         }))
        accepted_ids.add(qid)
        row.update(outcome="included", format=film_format, mapped_genres=genres)
        title_groups[label_key(title)].append(row)

    same_titles = []
    for related in title_groups.values():
        if len(related) < 2:
            continue
        same_titles.append([row["qid"] for row in related])
        for row in related:
            row["flags"].append("same-title-distinct-id")

    return Pilot(films, {
        "retrieved": snapshot["retrieved"], "candidates": len(rows), "included": len(films),
        "held": len(rows) - len(films), "formats": dict(Counter(film["format"] for film in films)),
        "flags": dict(Counter(flag for row in rows for flag in row["flags"])),
        "same_title_groups": same_titles, "rows": rows,
    })


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--snapshot", type=Path, default=EVIDENCE)
    parser.add_argument("--output", type=Path, default=ROOT / "data/sample")
    parser.add_argument("--report", type=Path, default=REPORT)
    args = parser.parse_args()
    pilot = audit(json.loads(args.snapshot.read_text(encoding="utf-8")))
    manifest = release(pilot, PilotProjection(), args.output, dataset=DATASET)
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_bytes(encode(pilot.report))
    print(f"Published {manifest['count']} titles from {pilot.report['candidates']} candidates")
    print(json.dumps(pilot.report["flags"], sort_keys=True))


if __name__ == "__main__":
    main()
