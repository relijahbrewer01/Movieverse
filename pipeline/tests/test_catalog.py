import tempfile
import unittest
from pathlib import Path

from pipeline.src.catalog import DemoProjection, FixtureSource, ROOT, release


class CatalogTests(unittest.TestCase):
    def setUp(self):
        self.source = FixtureSource(ROOT / "pipeline/fixtures/films.json")

    def test_release_is_reproducible_and_sample_is_current(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory)
            manifest = release(self.source, DemoProjection(), output)
            self.assertEqual(manifest["count"], 32)
            for name in (manifest["catalog"], manifest["geometry"], "manifest.v1.json"):
                self.assertEqual((output / name).read_bytes(),
                                 (ROOT / "data/sample" / name).read_bytes())

    def test_same_title_and_tv_films_are_preserved(self):
        films = list(self.source.films())
        same_title = [film for film in films if film["title"] == "Paper Sun"]
        self.assertEqual(len({film["id"] for film in same_title}), 2)
        self.assertIn("TV movie", {film["format"] for film in same_title})
        self.assertTrue(any(film["year"] is None for film in films))

    def test_duplicate_id_is_rejected(self):
        film = next(iter(self.source.films()))

        class DuplicateSource:
            def films(self):
                return [film, film]

        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaisesRegex(ValueError, "unique IDs"):
                release(DuplicateSource(), DemoProjection(), Path(directory))
