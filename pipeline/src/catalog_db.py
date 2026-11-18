"""Persist the Wikidata catalog and expose it to the static release builder."""

import json
import sqlite3
from collections import defaultdict
from contextlib import closing, contextmanager
from pathlib import Path
from tempfile import NamedTemporaryFile
from typing import Iterator

from .catalog import ROOT, Film, FormatReview

DATABASE = ROOT / "data/build/movieverse.sqlite3"
SCHEMA = Path(__file__).with_name("catalog_schema.sql")
SCHEMA_VERSION = 1
FILM_LISTS = ("aliases", "genres", "countries")
CANDIDATE_FIELDS = ("cohort", "seed", "expected_year", "qid", "outcome")


def json_text(value: object) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"), sort_keys=True,
                      allow_nan=False)


def insert_evidence(db: sqlite3.Connection, snapshot: dict) -> None:
    items = snapshot["entities"]
    db.executemany("INSERT INTO source_items VALUES (?, ?, ?, ?, ?, ?)", (
        (qid, entity["revision"], entity.get("retrieved", snapshot["retrieved"]),
         entity["label"], entity["label_language"], json_text(entity["aliases"]))
        for qid, entity in items.items()
    ))
    db.executemany("INSERT INTO source_terms VALUES (?, ?)", snapshot["terms"].items())
    db.executemany("INSERT INTO source_claims VALUES (?, ?, ?, ?, ?, ?)", (
        (claim["id"], qid, prop, claim["rank"], json_text(claim["value"]),
         json_text(claim.get("qualifiers", {})))
        for qid, entity in items.items()
        for prop, claims in entity["claims"].items()
        for claim in claims
    ))


def insert_films(db: sqlite3.Connection, films: list[Film]) -> None:
    db.executemany("INSERT INTO films VALUES (?, ?, ?, ?, ?, ?)", (
        (film["id"], film["provenance"]["qid"], film["title"], film["year"], film["format"],
         film["provenance"]["status"]) for film in films
    ))
    for field in FILM_LISTS:
        # Each table name comes from the fixed schema above, never from imported data.
        db.executemany(f"INSERT INTO film_{field} VALUES (?, ?, ?)", (
            (film["id"], index, value)
            for film in films for index, value in enumerate(film.get(field, []))
        ))
    db.executemany("INSERT INTO film_publication_years VALUES (?, ?)", (
        (film["id"], year) for film in films for year in film.get("publication_years", [])
    ))
    db.executemany("INSERT INTO format_reviews VALUES (?, ?, ?, ?, ?)", (
        (film["provenance"]["qid"], review["label"], review["url"], review["reviewed"], review["note"])
        for film in films if (review := film.get("format_review"))
    ))


def insert_audit(db: sqlite3.Connection, report: dict, rights: str) -> None:
    summary = {key: value for key, value in report.items() if key != "rows"}
    db.executemany("INSERT INTO catalog_metadata VALUES (?, ?)", (
        ("audit_summary", json_text(summary)), ("source_rights", json_text(rights)),
    ))
    db.executemany("INSERT INTO candidate_reviews VALUES (?, ?, ?, ?, ?, ?, ?)", (
        (position, *(row[field] for field in CANDIDATE_FIELDS),
         json_text({key: value for key, value in row.items() if key not in CANDIDATE_FIELDS}))
        for position, row in enumerate(report["rows"])
    ))


def rebuild_database(path: Path, snapshot: dict, films: list[Film], report: dict) -> None:
    """Publish a replacement only after the transaction and constraints succeed."""
    if not films:
        raise ValueError("Cannot build an empty catalog database")
    path.parent.mkdir(parents=True, exist_ok=True)
    with NamedTemporaryFile(prefix=f".{path.name}-", suffix=".tmp",
                            dir=path.parent, delete=False) as pending_file:
        pending = Path(pending_file.name)
    try:
        with closing(sqlite3.connect(pending)) as db:
            db.execute("PRAGMA foreign_keys = ON")
            db.executescript(SCHEMA.read_text(encoding="utf-8"))
            with db:
                insert_evidence(db, snapshot)
                insert_films(db, films)
                insert_audit(db, report, snapshot["rights"])
        pending.replace(path)
    finally:
        pending.unlink(missing_ok=True)


class SqliteCatalog:
    def __init__(self, db: sqlite3.Connection):
        self.db = db

    def metadata(self, key: str):
        row = self.db.execute("SELECT value_json FROM catalog_metadata WHERE key = ?", (key,)).fetchone()
        if row is None:
            raise ValueError(f"Missing catalog metadata: {key}")
        return json.loads(row[0])

    def films(self) -> Iterator[Film]:
        values = {}
        for field in (*FILM_LISTS, "publication_years"):
            ordering = "value" if field == "publication_years" else "position"
            by_film = defaultdict(list)
            for film_id, value in self.db.execute(
                f"SELECT film_id, value FROM film_{field} ORDER BY film_id, {ordering}"
            ):
                by_film[film_id].append(value)
            values[field] = by_film

        reviews = {
            qid: FormatReview(label=label, url=url, reviewed=reviewed, note=note)
            for qid, label, url, reviewed, note in self.db.execute(
                "SELECT qid, label, url, reviewed, note FROM format_reviews"
            )
        }
        rights = self.metadata("source_rights")
        for film_id, qid, title, year, fmt, status, revision, retrieved in self.db.execute("""
            SELECT films.id, films.qid, films.title, films.year, films.format, films.status,
                   source_items.revision, source_items.retrieved
            FROM films JOIN source_items USING (qid)
            ORDER BY films.id
        """):
            film = Film(
                id=film_id, title=title, year=year, format=fmt,
                genres=values["genres"][film_id], aliases=values["aliases"][film_id],
                countries=values["countries"][film_id],
                publication_years=values["publication_years"][film_id],
                provenance={
                    "source": "wikidata", "status": status, "rights": rights, "qid": qid,
                    "revision": str(revision), "retrieved": retrieved,
                },
            )
            if qid in reviews:
                film["format_review"] = reviews[qid]
            yield film

    def audit_report(self) -> dict:
        summary = self.metadata("audit_summary")
        rows = []
        for *fields, detail in self.db.execute("""
            SELECT cohort, seed, expected_year, qid, outcome, detail_json
            FROM candidate_reviews ORDER BY position
        """):
            rows.append({**dict(zip(CANDIDATE_FIELDS, fields, strict=True)), **json.loads(detail)})
        return {**summary, "rows": rows}


@contextmanager
def open_catalog(path: Path) -> Iterator[SqliteCatalog]:
    """Open an existing build database without creating or modifying it."""
    if not path.is_file():
        raise FileNotFoundError(f"Catalog database not found: {path}")
    with closing(sqlite3.connect(path.resolve().as_uri() + "?mode=ro", uri=True)) as db:
        version = db.execute("PRAGMA user_version").fetchone()[0]
        if version != SCHEMA_VERSION:
            raise ValueError(f"Unsupported catalog database schema {version}. Rebuild from pinned evidence.")
        yield SqliteCatalog(db)
