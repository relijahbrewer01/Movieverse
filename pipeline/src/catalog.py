"""Normalize original demo films and generate a deterministic atlas release."""

import argparse
import hashlib
import json
import math
import re
from collections import Counter
from pathlib import Path
from typing import Iterable, NotRequired, Protocol, TypedDict

ROOT = Path(__file__).resolve().parents[2]
REGIONS = {
    "Science fiction": (-0.87, -0.39),
    "Drama": (0.56, -0.50),
    "Documentary": (-0.51, 0.54),
    "Animation": (0.89, 0.46),
    "Unmapped": (0, 0),
}
PROVENANCE = {"source": "movieverse-fixtures", "status": "fictional", "rights": "CC0-1.0"}


class Film(TypedDict):
    id: str
    title: str
    year: int | None
    genres: list[str]
    format: str
    provenance: dict[str, str]
    aliases: NotRequired[list[str]]
    countries: NotRequired[list[str]]


class CatalogSource(Protocol):
    def films(self) -> Iterable[Film]:
        """Yield normalized records with stable IDs and provenance."""


class FixtureSource:
    def __init__(self, path: Path):
        self.path = path

    def films(self) -> Iterable[Film]:
        for row in json.loads(self.path.read_text(encoding="utf-8")):
            slug, title, year, genres, film_format = row
            if not isinstance(slug, str) or not re.fullmatch(r"[a-z0-9-]+", slug):
                raise ValueError(f"Invalid fixture ID: {slug}")
            if not isinstance(title, str) or not title.strip():
                raise ValueError(f"{slug}: missing title")
            if year is not None and (type(year) is not int or not 1888 <= year <= 2100):
                raise ValueError(f"{slug}: invalid year")
            if (
                not isinstance(genres, list)
                or not genres
                or any(not isinstance(genre, str) or genre not in REGIONS for genre in genres)
                or len(set(genres)) != len(genres)
            ):
                raise ValueError(f"{slug}: invalid genres")
            if film_format not in ("Feature", "TV movie"):
                raise ValueError(f"{slug}: invalid format")
            yield Film(id=f"mv:demo:{slug}", title=title, year=year, genres=genres,
                       format=film_format, provenance=PROVENANCE.copy())


class Projection(Protocol):
    id: str

    def points(self, films: list[Film]) -> list[dict]:
        """Return geometry keyed by canonical IDs."""


class DemoProjection:
    id = "genre-regions-v1"
    spacing = 0.12

    def points(self, films: list[Film]) -> list[dict]:
        counts: Counter[str] = Counter()
        points = []
        for film in films:
            region = film["genres"][0] if film["genres"] else "Unmapped"
            index = counts[region]
            counts[region] += 1
            center_x, center_y = REGIONS[region]
            angle = index * 2.3999632297
            radius = self.spacing * math.sqrt(index)
            points.append({
                "id": film["id"], "region": region,
                "x": round(center_x + math.cos(angle) * radius, 4),
                "y": round(center_y + math.sin(angle) * radius, 4),
            })
        return points


def encode(value: object) -> bytes:
    return (json.dumps(value, ensure_ascii=False, separators=(",", ":"), sort_keys=True,
                       allow_nan=False) + "\n").encode("utf-8")


def release(source: CatalogSource, projection: Projection, output: Path, *,
            dataset: str = "fictional-demo") -> dict:
    films = sorted(source.films(), key=lambda film: film["id"])
    ids = {film["id"] for film in films}
    if not ids or len(films) != len(ids):
        raise ValueError("Catalog must be nonempty and contain unique IDs")
    points = projection.points(films)
    if len(points) != len(ids) or {point["id"] for point in points} != ids:
        raise ValueError("Projection must contain exactly one point per film")

    catalog = encode({"schema": 1, "films": films})
    geometry = encode({"schema": 1, "projection": projection.id, "points": points})
    revision = hashlib.sha256(catalog + geometry).hexdigest()[:16]
    manifest = {
        "schema": 1, "revision": revision, "dataset": dataset,
        "catalog": "catalog.v1.json", "geometry": "geometry.v1.json",
        "projection": projection.id, "count": len(films),
    }
    output.mkdir(parents=True, exist_ok=True)
    for name, payload in ((manifest["catalog"], catalog), (manifest["geometry"], geometry),
                          ("manifest.v1.json", encode(manifest))):
        pending = output / f".{name}.tmp"
        pending.write_bytes(payload)
        pending.replace(output / name)
    return manifest


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=ROOT / "data/demo")
    args = parser.parse_args()
    manifest = release(FixtureSource(ROOT / "pipeline/fixtures/films.json"),
                       DemoProjection(), args.output)
    print(f'Wrote {manifest["count"]} fictional films ({manifest["revision"]}) to {args.output}')


if __name__ == "__main__":
    main()
