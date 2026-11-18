import copy
import json
import tempfile
import unittest
from pathlib import Path

from pipeline.src.catalog import ROOT, encode, release
from pipeline.src.pilot import DATASET, FORMAT_REVIEWS, REPORT, PilotProjection, audit
from pipeline.src.wikidata import EVIDENCE, EXPANSION, load_snapshots


class PilotTests(unittest.TestCase):
    def setUp(self):
        self.snapshot = load_snapshots([EVIDENCE, EXPANSION])
        self.reviews = json.loads(FORMAT_REVIEWS.read_text(encoding="utf-8"))
        self.pilot = audit(self.snapshot, self.reviews)

    def test_checked_in_release_matches_pinned_snapshot(self):
        self.assertEqual(self.pilot.report["candidates"], 137)
        self.assertEqual(self.pilot.report["included"], 135)
        self.assertEqual(self.pilot.report["cohorts"]["snapshot"], {"included": 71, "held": 1})
        self.assertEqual(self.pilot.report["cohorts"]["expansion"], {"included": 64, "held": 1})
        self.assertEqual(len(self.pilot.records), len({film["id"] for film in self.pilot.records}))
        self.assertEqual(encode(self.pilot.report).decode(), REPORT.read_text(encoding="utf-8"))
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory)
            manifest = release(self.pilot, PilotProjection(), output, dataset=DATASET)
            for name in (manifest["catalog"], manifest["geometry"], "manifest.v1.json"):
                self.assertEqual((output / name).read_text(encoding="utf-8"),
                                 (ROOT / "data/sample" / name).read_text(encoding="utf-8"))

    def test_same_name_films_are_distinct_and_out_of_scope_titles_are_held(self):
        solaris = [film for film in self.pilot.records if film["title"] == "Solaris"]
        self.assertEqual({film["year"] for film in solaris}, {1972, 2002})
        self.assertEqual({film["provenance"]["qid"] for film in solaris}, {"Q125772", "Q673195"})
        self.assertEqual({row["qid"] for row in self.pilot.report["rows"] if row["outcome"] == "held"},
                         {"Q87131973", "Q244971"})

    def test_later_batch_cannot_silently_replace_pinned_qid_evidence(self):
        original = json.loads(EVIDENCE.read_text(encoding="utf-8"))
        qid = "Q125772"
        changed = {**original["entities"][qid], "label": "Changed title"}
        with tempfile.TemporaryDirectory() as directory:
            newer = Path(directory) / "newer.json"
            newer.write_text(json.dumps({
                "retrieved": "2099-01-01", "rights": "CC0-1.0", "terms": {},
                "entities": {qid: changed},
                "candidates": [next(row for row in original["candidates"] if row["qid"] == qid)],
            }), encoding="utf-8")
            pilot = audit(load_snapshots([EVIDENCE, newer]))
        solaris = next(film for film in pilot.records if film["provenance"]["qid"] == qid)
        self.assertEqual(solaris["title"], "Solaris")
        self.assertEqual(solaris["provenance"]["retrieved"], original["retrieved"])
        self.assertIn("repeated-qid", pilot.report["rows"][-1]["flags"])

    def test_unsupported_expected_year_is_held_even_when_other_dates_exist(self):
        edited = copy.deepcopy(self.snapshot)
        seed = next(row for row in edited["candidates"] if row["qid"] == "Q125772")
        seed["expected_year"] = 1901
        result = audit(edited, self.reviews)
        row = next(row for row in result.report["rows"] if row["qid"] == seed["qid"])
        self.assertEqual(row["outcome"], "held")
        self.assertIn("expected-year-not-supported", row["flags"])

    def test_format_is_supported_by_type_and_original_titles_are_preserved(self):
        films = {film["provenance"]["qid"]: film for film in self.pilot.records}
        self.assertEqual(films["Q1412119"]["format"], "TV movie")
        self.assertEqual(films["Q583407"]["format"], "TV movie")
        self.assertEqual(films["Q583407"]["format_review"]["label"], "Amblin production history")
        self.assertEqual(self.pilot.report["formats"]["TV movie"], 8)
        self.assertNotIn("tv-format-unconfirmed", self.pilot.report["flags"])
        self.assertIn("七人の侍", films["Q189540"]["aliases"])

    def test_later_publications_and_filter_genres_do_not_replace_year_or_map_region(self):
        films = {film["provenance"]["qid"]: film for film in self.pilot.records}
        duel = films["Q583407"]
        self.assertEqual(duel["year"], 1971)
        self.assertEqual(duel["publication_years"], [1971, 1972, 1973, 1974])
        self.assertIn("Thriller", duel["genres"])
        self.assertEqual(PilotProjection().region(duel), "Other")
        alien = films["Q103569"]
        self.assertIn("Horror", alien["genres"])
        self.assertEqual(PilotProjection().region(alien), "Science fiction")
