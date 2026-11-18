import copy
import json
import tempfile
import unittest
from pathlib import Path

from pipeline.src.catalog import ROOT, encode, release
from pipeline.src.pilot import DATASET, REPORT, PilotProjection, audit
from pipeline.src.wikidata import EVIDENCE


class PilotTests(unittest.TestCase):
    def setUp(self):
        self.snapshot = json.loads(EVIDENCE.read_text(encoding="utf-8"))
        self.pilot = audit(self.snapshot)

    def test_checked_in_release_matches_pinned_snapshot(self):
        self.assertEqual(self.pilot.report["candidates"], 72)
        self.assertEqual(self.pilot.report["included"], 71)
        self.assertEqual(len(self.pilot.records), len({film["id"] for film in self.pilot.records}))
        self.assertEqual(encode(self.pilot.report).decode(), REPORT.read_text(encoding="utf-8"))
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory)
            manifest = release(self.pilot, PilotProjection(), output, dataset=DATASET)
            for name in (manifest["catalog"], manifest["geometry"], "manifest.v1.json"):
                self.assertEqual((output / name).read_text(encoding="utf-8"),
                                 (ROOT / "data/sample" / name).read_text(encoding="utf-8"))

    def test_same_name_films_are_distinct_and_tv_series_is_held(self):
        solaris = [film for film in self.pilot.records if film["title"] == "Solaris"]
        self.assertEqual({film["year"] for film in solaris}, {1972, 2002})
        self.assertEqual({film["provenance"]["qid"] for film in solaris}, {"Q125772", "Q673195"})
        self.assertEqual({row["qid"] for row in self.pilot.report["rows"] if row["outcome"] == "held"},
                         {"Q87131973"})

    def test_unsupported_expected_year_is_held_even_when_other_dates_exist(self):
        edited = copy.deepcopy(self.snapshot)
        seed = next(row for row in edited["candidates"] if row["qid"] == "Q125772")
        seed["expected_year"] = 1901
        result = audit(edited)
        row = next(row for row in result.report["rows"] if row["qid"] == seed["qid"])
        self.assertEqual(row["outcome"], "held")
        self.assertIn("expected-year-not-supported", row["flags"])

    def test_format_is_supported_by_type_and_original_titles_are_preserved(self):
        films = {film["provenance"]["qid"]: film for film in self.pilot.records}
        self.assertEqual(films["Q1412119"]["format"], "TV movie")
        self.assertEqual(films["Q583407"]["format"], "Film")
        self.assertIn("七人の侍", films["Q189540"]["aliases"])
