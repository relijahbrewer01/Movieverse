PRAGMA user_version = 1;

CREATE TABLE source_items (
    qid TEXT PRIMARY KEY,
    revision INTEGER NOT NULL,
    retrieved TEXT NOT NULL,
    label TEXT,
    label_language TEXT NOT NULL,
    aliases_json TEXT NOT NULL CHECK (json_valid(aliases_json))
) STRICT;

CREATE TABLE source_terms (
    qid TEXT PRIMARY KEY,
    label TEXT NOT NULL
) STRICT;

CREATE TABLE source_claims (
    statement_id TEXT PRIMARY KEY,
    qid TEXT NOT NULL REFERENCES source_items (qid),
    property TEXT NOT NULL,
    rank TEXT NOT NULL CHECK (rank IN ('normal', 'preferred', 'deprecated')),
    value_json TEXT NOT NULL CHECK (json_valid(value_json)),
    qualifiers_json TEXT NOT NULL CHECK (json_valid(qualifiers_json))
) STRICT;

CREATE INDEX claims_by_item_property ON source_claims (qid, property);

CREATE TABLE films (
    id TEXT PRIMARY KEY,
    qid TEXT NOT NULL UNIQUE REFERENCES source_items (qid),
    title TEXT NOT NULL CHECK (length(title) > 0),
    year INTEGER NOT NULL,
    format TEXT NOT NULL CHECK (format IN ('Film', 'TV movie')),
    status TEXT NOT NULL
) STRICT;

CREATE INDEX films_by_title_year ON films (title COLLATE NOCASE, year);

CREATE TABLE film_aliases (
    film_id TEXT NOT NULL REFERENCES films (id),
    position INTEGER NOT NULL,
    value TEXT NOT NULL,
    PRIMARY KEY (film_id, position),
    UNIQUE (film_id, value)
) STRICT;

CREATE TABLE film_genres (
    film_id TEXT NOT NULL REFERENCES films (id),
    position INTEGER NOT NULL,
    value TEXT NOT NULL,
    PRIMARY KEY (film_id, position),
    UNIQUE (film_id, value)
) STRICT;

CREATE TABLE film_countries (
    film_id TEXT NOT NULL REFERENCES films (id),
    position INTEGER NOT NULL,
    value TEXT NOT NULL,
    PRIMARY KEY (film_id, position),
    UNIQUE (film_id, value)
) STRICT;

CREATE TABLE film_publication_years (
    film_id TEXT NOT NULL REFERENCES films (id),
    value INTEGER NOT NULL,
    PRIMARY KEY (film_id, value)
) STRICT;

CREATE TABLE format_reviews (
    qid TEXT PRIMARY KEY REFERENCES films (qid),
    label TEXT NOT NULL,
    url TEXT NOT NULL,
    reviewed TEXT NOT NULL,
    note TEXT NOT NULL
) STRICT;

CREATE TABLE candidate_reviews (
    position INTEGER PRIMARY KEY,
    cohort TEXT NOT NULL,
    seed TEXT NOT NULL,
    expected_year INTEGER NOT NULL,
    qid TEXT,
    outcome TEXT NOT NULL CHECK (outcome IN ('included', 'held')),
    detail_json TEXT NOT NULL CHECK (json_valid(detail_json))
) STRICT;

CREATE TABLE catalog_metadata (
    key TEXT PRIMARY KEY,
    value_json TEXT NOT NULL CHECK (json_valid(value_json))
) STRICT;
