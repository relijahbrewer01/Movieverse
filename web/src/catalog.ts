export interface Film {
  id: string;
  title: string;
  year: number | null;
  genres: string[];
  format: 'Feature' | 'Film' | 'TV movie';
  aliases?: string[];
  countries?: string[];
  provenance: { source: string; status: string; rights: string; qid?: string; revision?: string; retrieved?: string };
}

export interface Point {
  id: string;
  region: string;
  x: number;
  y: number;
}

export interface Atlas {
  films: Film[];
  points: Point[];
  revision: string;
  dataset: 'fictional-demo' | 'wikidata-pilot';
}

export interface Filters {
  query: string;
  genre: string;
  format: string;
}

export const unmappedGenre = 'Unmapped';

function fold(value: string) {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

export function filterFilms(films: Film[], filters: Filters) {
  const words = fold(filters.query).trim().split(/\s+/).filter(Boolean);
  return films.filter(film => {
    const searchable = fold([film.title, ...(film.aliases ?? []), film.year ?? ''].join(' '));
    const matchesGenre = film.genres.length ? film.genres.includes(filters.genre) : filters.genre === unmappedGenre;
    return (!filters.genre || matchesGenre) &&
      (!filters.format || film.format === filters.format) &&
      words.every(word => searchable.includes(word));
  });
}

async function getJson<T>(file: string, signal: AbortSignal): Promise<T> {
  const embedded = document.getElementById('atlas-' + file)?.textContent;
  if (embedded) return JSON.parse(embedded) as T;
  const response = await fetch(import.meta.env.BASE_URL + file, { signal });
  if (!response.ok) throw new Error('Atlas asset unavailable');
  return response.json();
}

export async function loadAtlas(signal: AbortSignal): Promise<Atlas> {
  const manifest = await getJson<{
    schema: number; revision: string; catalog: string; geometry: string;
    projection: string; count: number; dataset: string;
  }>('manifest.v1.json', signal);
  if (manifest.schema !== 1 || (manifest.dataset !== 'fictional-demo' && manifest.dataset !== 'wikidata-pilot') ||
      manifest.catalog !== 'catalog.v1.json' || manifest.geometry !== 'geometry.v1.json') {
    throw new Error('Unsupported atlas release');
  }
  const [catalog, geometry] = await Promise.all([
    getJson<{ schema: number; films: Film[] }>(manifest.catalog, signal),
    getJson<{ schema: number; projection: string; points: Point[] }>(manifest.geometry, signal),
  ]);
  const ids = new Set(catalog.films.map(film => film.id));
  const pointIds = new Set(geometry.points.map(point => point.id));
  if (catalog.schema !== 1 || geometry.schema !== 1 ||
      ids.size !== catalog.films.length || ids.size !== manifest.count ||
      geometry.points.length !== ids.size || pointIds.size !== ids.size ||
      geometry.projection !== manifest.projection ||
      geometry.points.some(point => !ids.has(point.id) || !Number.isFinite(point.x) || !Number.isFinite(point.y))) {
    throw new Error('Inconsistent atlas release');
  }
  return { films: catalog.films, points: geometry.points, revision: manifest.revision, dataset: manifest.dataset };
}
