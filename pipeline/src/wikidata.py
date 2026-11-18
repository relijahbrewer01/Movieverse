"""Fetch selected Wikidata evidence and build the offline atlas from a pinned snapshot."""

import argparse
import json
import re
import time
from datetime import date
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from .catalog import ROOT, encode

EVIDENCE = ROOT / "data/wikidata-pilot/snapshot.json"
EXPANSION = ROOT / "data/wikidata-pilot/expansion.json"
COVERAGE = ROOT / "data/wikidata-pilot/coverage.json"
PILOT_BATCHES = (EVIDENCE, EXPANSION, COVERAGE)
SEEDS = ROOT / "pipeline/fixtures/wikidata-candidates.txt"
PROPERTIES = ("P31", "P136", "P1476", "P495", "P577")
USER_AGENT = "MovieversePilot/0.1 (https://github.com/relijahbrewer01/Movieverse)"


def api(host: str, **params) -> dict:
    url = f"https://{host}/w/api.php?" + urlencode({
        "format": "json", "formatversion": 2, "maxlag": 5, **params,
    })
    with urlopen(Request(url, headers={"User-Agent": USER_AGENT}), timeout=30) as response:
        result = json.load(response)
    if "error" in result:
        raise ValueError(f"{host}: {result['error']}")
    return result


def batches(values, size=35):
    for start in range(0, len(values), size):
        yield "|".join(values[start:start + size])


def value(snak: dict):
    raw = snak.get("datavalue", {}).get("value")
    if isinstance(raw, dict):
        return raw.get("id") or raw.get("text") or raw
    return raw


def evidence(item: dict) -> dict:
    fields = {}
    for prop in PROPERTIES:
        rows = []
        for claim in item.get("claims", {}).get(prop, []):
            entry = {
                "id": claim["id"], "rank": claim["rank"],
                "value": (claim["mainsnak"].get("datavalue", {}).get("value")
                          if prop == "P1476" else value(claim["mainsnak"])),
            }
            if prop == "P577":
                entry["qualifiers"] = {
                    key: [value(snak) for snak in snaks]
                    for key, snaks in claim.get("qualifiers", {}).items()
                }
            rows.append(entry)
        if rows:
            fields[prop] = rows
    labels = item.get("labels", {})
    label_language = "en" if "en" in labels else "mul"
    label = labels.get(label_language, {}).get("value")
    aliases = [alias["value"] for alias in item.get("aliases", {}).get("en", [])]
    return {"revision": item["lastrevid"], "label": label, "label_language": label_language,
            "aliases": aliases, "claims": fields}


def snapshot(seed_file: Path = SEEDS) -> dict:
    seeds = []
    for line in seed_file.read_text(encoding="utf-8-sig").splitlines():
        title, year, *tags = line.split("|")
        seeds.append({"seed": title, "expected_year": int(year), "tv_candidate": "tv" in tags})
    by_title = {}
    for batch in batches([seed["seed"] for seed in seeds]):
        query = api("en.wikipedia.org", action="query", prop="pageprops",
                    ppprop="wikibase_item", redirects=1, titles=batch)["query"]
        pages = {page["title"]: page.get("pageprops", {}).get("wikibase_item")
                 for page in query["pages"]}
        transforms = {entry["from"]: entry["to"]
                      for key in ("normalized", "redirects") for entry in query.get(key, [])}
        for title in batch.split("|"):
            target = transforms.get(title, title)
            target = transforms.get(target, target)
            by_title[title] = pages.get(target)
        time.sleep(0.35)

    ids = sorted({qid for qid in by_title.values() if qid})
    entities = {}
    for batch in batches(ids):
        items = api("www.wikidata.org", action="wbgetentities", ids=batch,
                    props="info|labels|aliases|claims", languages="en|mul")["entities"]
        entities.update({qid: evidence(item) for qid, item in items.items() if "missing" not in item})
        time.sleep(0.35)

    terms = set()
    for entity in entities.values():
        for prop in ("P31", "P136", "P495"):
            for row in entity["claims"].get(prop, []):
                if isinstance(row["value"], str) and re.fullmatch(r"Q\d+", row["value"]):
                    terms.add(row["value"])
    labels = {}
    for batch in batches(sorted(terms)):
        items = api("www.wikidata.org", action="wbgetentities", ids=batch,
                    props="labels", languages="en")["entities"]
        labels.update({qid: item.get("labels", {}).get("en", {}).get("value", qid)
                       for qid, item in items.items()})
        time.sleep(0.35)
    return {
        "retrieved": date.today().isoformat(), "rights": "CC0-1.0", "terms": labels,
        "candidates": [{**seed, "qid": by_title.get(seed["seed"])} for seed in seeds],
        "entities": entities,
    }


def load_snapshots(paths: list[Path] | tuple[Path, ...]) -> dict:
    """Combine pinned batches in order, preserving the first evidence for each QID."""
    batches = [(path.stem, json.loads(path.read_text(encoding="utf-8"))) for path in paths]
    rights = {batch["rights"] for _, batch in batches}
    if rights != {"CC0-1.0"}:
        raise ValueError("Movieverse pilot expects CC0 Wikidata evidence")
    combined = {
        "retrieved": max(batch["retrieved"] for _, batch in batches),
        "rights": "CC0-1.0", "terms": {}, "entities": {}, "candidates": [],
    }
    for cohort, batch in batches:
        for qid, term in batch["terms"].items():
            combined["terms"].setdefault(qid, term)
        for qid, entity in batch["entities"].items():
            combined["entities"].setdefault(qid, {**entity, "retrieved": batch["retrieved"]})
        combined["candidates"].extend({**row, "cohort": cohort} for row in batch["candidates"])
    return combined


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--refresh", action="store_true", help="Refresh candidate evidence from Wikimedia")
    parser.add_argument("--seeds", type=Path, default=SEEDS)
    parser.add_argument("--output", type=Path, default=EVIDENCE)
    args = parser.parse_args()
    if args.refresh:
        data = snapshot(args.seeds)
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_bytes(encode(data))
        print(f"Fetched {len(data['entities'])} entities for {len(data['candidates'])} candidates")
    else:
        parser.error("Use --refresh to capture evidence")


if __name__ == "__main__":
    main()
