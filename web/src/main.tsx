import { StrictMode, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AtlasMap, regionByName, regions } from './AtlasMap';
import { filterFilms, loadAtlas } from './catalog';
import type { Atlas, Filters, Point } from './catalog';
import './style.css';

const initialFilters = { query: '', genre: '', format: '' };

function Explorer({ atlas }: { atlas: Atlas }) {
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focus, setFocus] = useState<{ point: Point; request: number } | null>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const search = useRef<HTMLInputElement>(null);
  const films = useMemo(() => new Map(atlas.films.map(film => [film.id, film])), [atlas]);
  const points = useMemo(() => new Map(atlas.points.map(point => [point.id, point])), [atlas]);
  const genres = useMemo(() => [...new Set(atlas.films.flatMap(film => film.genres))].sort(), [atlas]);
  const matches = useMemo(() => filterFilms(atlas.films, filters), [atlas, filters]);
  const visible = useMemo(() => new Set(matches.map(film => film.id)), [matches]);
  const selected = selectedId && visible.has(selectedId) ? films.get(selectedId) : null;
  const selectedPoint = selected ? points.get(selected.id) : null;
  const region = selectedPoint?.region ?? '';

  function select(id: string, source: HTMLElement, moveCamera: boolean) {
    trigger.current = source;
    setSelectedId(id);
    const point = points.get(id);
    if (moveCamera && point) setFocus(previous => ({ point, request: (previous?.request ?? 0) + 1 }));
    if (id === selectedId) title.current?.focus();
  }

  useEffect(() => {
    if (selectedId) title.current?.focus();
  }, [selectedId]);

  function closeDetails() {
    setSelectedId(null);
    setFocus(null);
    (trigger.current?.isConnected ? trigger.current : search.current)?.focus();
  }

  function updateFilter(key: keyof Filters, value: string) {
    setSelectedId(null);
    setFocus(null);
    setFilters(current => ({ ...current, [key]: value }));
  }

  return (
    <main className="workspace">
      <div className="map-stack">
        <div className="map-area">
          <AtlasMap points={atlas.points} films={films} visible={visible}
            selected={selected?.id ?? null} focus={focus} onSelect={select} />
          <section className="legend" aria-label="Map legend">
            <span>Primary genre</span>
            <ul>{regions.map(({ name, marker, color }) =>
              <li key={name}><span className="marker" data-shape={marker} style={{ color }} aria-hidden="true" />{name}</li>)}</ul>
          </section>
        </div>
        <p className="atlas-caption">Positions group films by primary genre. Distance does not measure film similarity.</p>
      </div>

      <aside className="sidebar" aria-label="Film explorer">
        {selected && <section className="details" aria-labelledby="film-title"
          onKeyDown={event => { if (event.key === 'Escape') closeDetails(); }}>
          <div className="detail-top">
            <div>
              <p className="kicker">Fictional film</p>
              <h2 id="film-title" tabIndex={-1} ref={title}>{selected.title}</h2>
            </div>
            <button type="button" className="close" aria-label="Close film details" onClick={closeDetails}>×</button>
          </div>
          <dl>
            <div><dt>Year</dt><dd>{selected.year ?? 'Unknown'}</dd></div>
            <div><dt>Format</dt><dd>{selected.format}</dd></div>
            <div><dt>Genres</dt><dd>{selected.genres.join(', ')}</dd></div>
            <div><dt>Source</dt><dd>Movieverse fixtures · {selected.provenance.rights}</dd></div>
          </dl>
        </section>}
        <section className="search-panel" aria-labelledby="explore">
          <div className="panel-title">
            <h2 id="explore">Explore films</h2>
            <span className="result-count" aria-live="polite">{matches.length} of {atlas.films.length}</span>
          </div>
          <label className="search-label" htmlFor="search">Title or year</label>
          <div className="search-field">
            <input ref={search} id="search" type="search" placeholder="e.g. Paper Sun" value={filters.query}
              onChange={event => updateFilter('query', event.target.value)} />
          </div>
          <div className="filters">
            <label>Genre<select value={filters.genre} onChange={event => updateFilter('genre', event.target.value)}>
              <option value="">All genres</option>
              {genres.map(genre => <option key={genre}>{genre}</option>)}
            </select></label>
            <label>Format<select value={filters.format} onChange={event => updateFilter('format', event.target.value)}>
              <option value="">All formats</option><option>Feature</option><option>TV movie</option>
            </select></label>
          </div>
          {matches.length ? <ul className="films" aria-label="Matching films">
            {matches.map(film => {
              const style = regionByName.get(points.get(film.id)?.region ?? '');
              return <li key={film.id}>
                <button type="button" aria-label={film.title + ', ' + (film.year ?? 'unknown year') + ', ' + film.format}
                  aria-pressed={film.id === selectedId} onClick={event => select(film.id, event.currentTarget, true)}>
                  <span className="marker" data-shape={style?.marker} style={{ color: style?.color }} aria-hidden="true" />
                  <span><strong>{film.title}</strong><small>{film.format}</small></span>
                  <span className="film-year">{film.year ?? 'Unknown'}</span>
                </button>
              </li>;
            })}
          </ul> : <div className="empty">
            <p>No films match these filters.</p>
            <button type="button" onClick={() => { setFilters(initialFilters); search.current?.focus(); }}>Clear filters</button>
          </div>}
        </section>
      </aside>
      <span className="sr-only">{selected && region ? 'Selected map region: ' + region : ''}</span>
    </main>
  );
}

function App() {
  const [atlas, setAtlas] = useState<Atlas | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    loadAtlas(controller.signal).then(setAtlas).catch(() => {
      if (!controller.signal.aborted) setError(true);
    });
    return () => controller.abort();
  }, [attempt]);

  return (
    <div className="shell">
      <header className="masthead">
        <div className="wordmark"><span className="aperture" aria-hidden="true" /><h1>Movieverse</h1></div>
        <p className="catalog-status">Demo atlas <span> / </span> Fictional films</p>
      </header>
      {atlas ? <Explorer atlas={atlas} /> : error ?
        <section className="status" role="alert"><p>The atlas couldn’t load.</p>
          <button type="button" onClick={() => { setError(false); setAttempt(value => value + 1); }}>Retry</button>
        </section> : <p className="status" role="status">Loading the film atlas…</p>}
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
