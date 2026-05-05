import { AnimatePresence, motion } from "motion/react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type DragEvent as ReactDragEvent,
  type FormEvent,
  type KeyboardEvent,
  type MutableRefObject,
  type PointerEvent as ReactPointerEvent,
} from "react";

type SkyTheme = "night" | "rose" | "dawn" | "aurora" | "midnight" | "ember" | "lagoon" | "gaia" | "rings" | "venus" | "mercury" | "eclipse" | "abyss";
type Tone = "gold" | "pearl" | "coral" | "sky" | "rose" | "mint" | "violet" | "custom";
type StarSize = "s" | "m" | "l";
type StarShape = "orb" | "diamond" | "spark" | "heart" | "lucero" | "comet" | "flower";
type LabelMode = "titles" | "hidden";
type LabelSide = "top" | "bottom" | "left" | "right";

type Sky = {
  id: string;
  name: string;
  createdAt: string;
  capacity: number;
  theme: SkyTheme;
  showTitles: boolean;
};

type Star = {
  id: string;
  skyId: string;
  createdAt: string;
  title: string;
  note: string;
  showTitle: boolean;
  color: Tone;
  customColor: string | null;
  size: StarSize;
  shape: StarShape;
  x: number;
  y: number;
};

type Constellation = {
  id: string;
  skyId: string;
  name: string;
  starIds: string[];
};

type BirthEffect = {
  star: Star;
  startX: number;
  startY: number;
  constellationId: string | null;
};

type AtlasState = {
  skies: Sky[];
  stars: Star[];
  constellations: Constellation[];
  activeSkyId: string;
  labelMode: LabelMode;
};

type ComposerDraft = {
  title: string;
  note: string;
  constellationId: string;
};

type StarEditorDraft = {
  id: string;
  title: string;
  note: string;
  showTitle: boolean;
  color: Tone;
  customColor: string | null;
  size: StarSize;
  shape: StarShape;
};

type SkyEditorDraft = {
  name: string;
  theme: SkyTheme;
};

type OverlayPanel =
  | "help"
  | "backup"
  | "create-sky"
  | "delete-sky"
  | "delete-star"
  | "move-star"
  | "delete-constellation"
  | "join-constellation"
  | "confirm-import"
  | "unsaved-changes"
  | null;
type SurfaceMode = "sky" | "journal" | "guide";
type PendingSkyAction = { skyId: string; mode: "composer" | "constellation" } | null;
type PendingConstellationJoin = { starId: string; constellationId: string } | null;
type PendingNavigation =
  | { type: "activate-sky"; skyId: string; afterSwitch?: PendingSkyAction; surfaceMode: SurfaceMode; selectStarId?: string | null }
  | { type: "show-sky-root" };

type DragSession = {
  starId: string;
  startClientX: number;
  startClientY: number;
  originX: number;
  originY: number;
  moved: boolean;
};

type Rect = { x1: number; y1: number; x2: number; y2: number };
type MoonPhaseKey = "new" | "waxing-crescent" | "first-quarter" | "waxing-gibbous" | "full" | "waning-gibbous" | "last-quarter" | "waning-crescent";
type MoonPhase = { age: number; phase: number; illumination: number; waxing: boolean; name: string; key: MoonPhaseKey };
type StorageBootstrap = {
  state: AtlasState;
  notice: string;
  skipInitialPersist: boolean;
  savedAt: string | null;
  source: "default" | "localStorage" | "recovery" | "history" | "indexeddb";
};
type HistorySnapshot = {
  savedAt: string;
  state: AtlasState;
};
type MeditationPhrase = {
  id: string;
  starId: string;
  text: string;
  emphasis: "title" | "note";
};
type MeditationMotion = "flow";
type MeditationLine = MeditationPhrase & {
  key: string;
  top: number;
  motion: MeditationMotion;
  delay: number;
  duration: number;
};
type ResonanceLink = {
  starId: string;
  title: string;
  skyId: string;
  skyName: string;
  sameSky: boolean;
};
type ResonanceSummary = {
  outgoing: ResonanceLink[];
  incoming: ResonanceLink[];
  unresolved: string[];
};

type ResonancePath = {
  path: string;
  relation: "outgoing" | "incoming" | "mutual";
  from: { x: number; y: number };
  to: { x: number; y: number };
  outgoing: boolean;
  incoming: boolean;
};

const STORAGE_KEY = "atlas-de-luz-state-v4";
const LEGACY_STORAGE_KEY = "atlas-de-luz-state-v3";
const STORAGE_RECOVERY_KEY = "atlas-de-luz-state-recovery-v4";
const STORAGE_HISTORY_KEY = "atlas-de-luz-history-v1";
const STORAGE_PERSIST_DEBOUNCE_MS = 280;
const STORAGE_HISTORY_LIMIT = 8;
const STORAGE_HISTORY_MIN_INTERVAL_MS = 15_000;
const INDEXED_DB_NAME = "setestrelo-local-db";
const INDEXED_DB_VERSION = 1;
const INDEXED_DB_STORE = "atlas";
const INDEXED_DB_KEY = "current";
const MAX_SKY_NAME = 36;
const SOFT_SKY_NAME = 24;
const MAX_TITLE = 48;
const SOFT_TITLE = 32;
const MAX_NOTE = 800;
const SOFT_NOTE = 420;
const STAR_NOTE_SYMBOLS = ["✦", "✧", "★", "☆", "☾", "☽", "🌙", "✨", "♡", "♥", "💗", "❀", "❁", "→", "↔", "•", "◦", "○"];
const MIN_DISTANCE = 12;
const CONSTELLATION_JOIN_THRESHOLD = 5.4;
const BIRTH_ADD_MS = 1320;
const BIRTH_END_MS = 2100;
const THEMES: SkyTheme[] = ["night", "rose", "dawn", "aurora", "midnight", "ember", "lagoon", "gaia", "rings", "venus", "mercury", "eclipse", "abyss"];
const COLORS: Tone[] = ["pearl", "gold", "coral", "sky", "rose", "mint", "violet"];
const SIZES: StarSize[] = ["m", "s", "l", "m"];
const SHAPES: StarShape[] = ["orb", "diamond", "spark", "heart", "lucero", "comet", "flower"];
const EDITOR_SIZES: StarSize[] = ["s", "m", "l"];
const EDITOR_SHAPES: StarShape[] = ["orb", "diamond", "spark", "heart", "lucero", "comet", "flower"];
const THEME_GROUPS: Array<{ label: string; themes: SkyTheme[] }> = [
  { label: "Claros", themes: ["night", "rose", "dawn", "aurora"] },
  { label: "Profundos", themes: ["midnight", "ember", "eclipse", "abyss"] },
  { label: "Orbitales", themes: ["lagoon", "gaia", "rings", "venus", "mercury"] },
];
const SYNODIC_MONTH = 29.530588853;
const KNOWN_NEW_MOON_UTC = Date.UTC(2000, 0, 6, 18, 14, 0);
const TONE_VALUES = {
  pearl: "#f5f0ff",
  gold: "#f7d794",
  coral: "#f2a7a0",
  sky: "#8ad5ff",
  rose: "#ff8dc9",
  mint: "#88e7c7",
  violet: "#b7a7ff",
} as const;

const BASE_POINTS = [
  { x: 16, y: 18 },
  { x: 30, y: 24 },
  { x: 48, y: 18 },
  { x: 66, y: 22 },
  { x: 80, y: 16 },
  { x: 20, y: 42 },
  { x: 40, y: 36 },
  { x: 60, y: 42 },
  { x: 78, y: 34 },
  { x: 28, y: 60 },
  { x: 50, y: 56 },
  { x: 72, y: 60 },
  { x: 18, y: 78 },
  { x: 40, y: 74 },
  { x: 64, y: 78 },
];

const BG_STARS = Array.from({ length: 40 }, (_, index) => ({
  id: `bg-${index}`,
  x: (index * 9.7) % 100,
  y: (index * 17.1) % 100,
  delay: (index % 9) * 0.33,
  scale: 0.24 + (index % 5) * 0.14,
}));

const FLOATING_MOTES = Array.from({ length: 22 }, (_, index) => ({
  id: `mote-${index}`,
  x: 8 + ((index * 13.4) % 82),
  y: 12 + ((index * 15.6) % 70),
  delay: (index % 6) * 0.58,
  span: 8 + (index % 4) * 2.2,
}));

const NEUTRAL_DUST = Array.from({ length: 64 }, (_, index) => ({
  id: `neutral-dust-${index}`,
  x: 4 + ((index * 11.7) % 92),
  y: 6 + ((index * 14.9) % 84),
  delay: (index % 9) * 0.46,
  driftX: -2.2 + (index % 5) * 1.1,
  driftY: -1.6 + (index % 7) * 0.52,
  scale: 0.28 + (index % 6) * 0.14,
}));

const NEUTRAL_GLOW_MOTES = Array.from({ length: 20 }, (_, index) => ({
  id: `neutral-glow-${index}`,
  x: 10 + ((index * 17.2) % 78),
  y: 14 + ((index * 19.1) % 68),
  delay: (index % 5) * 0.9,
  span: 12 + (index % 4) * 4,
}));

const DATE_FORMAT = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "short",
  year: "numeric",
});
const DATE_TIME_FORMAT = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const TOOLBAR_DAY_FORMAT = new Intl.DateTimeFormat("es-ES", {
  weekday: "short",
  day: "numeric",
  month: "short",
});
const TOOLBAR_TIME_FORMAT = new Intl.DateTimeFormat("es-ES", {
  hour: "2-digit",
  minute: "2-digit",
});

const DEFAULT_STATE: AtlasState = {
  skies: [
    { id: "sky-deseos", name: "Deseos de abril", createdAt: "2026-04-01T08:00:00.000Z", capacity: 16, theme: "night", showTitles: true },
    { id: "sky-casa", name: "Casa en calma", createdAt: "2026-04-01T08:12:00.000Z", capacity: 12, theme: "rose", showTitles: true },
  ],
  stars: [
    {
      id: "star-respirar",
      skyId: "sky-deseos",
      createdAt: "2026-04-01T08:15:00.000Z",
      title: "Respirar suave",
      note: "Quiero dar espacio a un ritmo mas sereno durante el dia.",
      showTitle: true,
      color: "pearl",
      customColor: null,
      size: "m",
      shape: "orb",
      x: 18,
      y: 24,
    },
    {
      id: "star-despertar",
      skyId: "sky-deseos",
      createdAt: "2026-04-01T08:18:00.000Z",
      title: "Despertar ligera",
      note: "Agradezco abrir los ojos con calma, energia y claridad.",
      showTitle: true,
      color: "gold",
      customColor: null,
      size: "l",
      shape: "spark",
      x: 40,
      y: 36,
    },
    {
      id: "star-crear",
      skyId: "sky-deseos",
      createdAt: "2026-04-01T08:21:00.000Z",
      title: "Ideas que florecen",
      note: "Mi creatividad encuentra formas suaves, utiles y hermosas.",
      showTitle: true,
      color: "sky",
      customColor: null,
      size: "m",
      shape: "diamond",
      x: 66,
      y: 58,
    },
    {
      id: "star-casa",
      skyId: "sky-casa",
      createdAt: "2026-04-01T08:24:00.000Z",
      title: "Casa tibia",
      note: "Deseo un hogar calido, silencioso y luminoso.",
      showTitle: true,
      color: "coral",
      customColor: null,
      size: "m",
      shape: "orb",
      x: 32,
      y: 30,
    },
    {
      id: "star-paz",
      skyId: "sky-casa",
      createdAt: "2026-04-01T08:28:00.000Z",
      title: "Dormir en paz",
      note: "Que cada noche tenga descanso real y sensacion de abrigo.",
      showTitle: true,
      color: "pearl",
      customColor: null,
      size: "s",
      shape: "spark",
      x: 56,
      y: 46,
    },
  ],
  constellations: [{ id: "const-1", skyId: "sky-deseos", name: "Respirar mejor", starIds: ["star-respirar", "star-despertar", "star-crear"] }],
  activeSkyId: "sky-deseos",
  labelMode: "titles",
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function sanitizeTitle(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, MAX_TITLE);
}

function sanitizeSkyName(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, MAX_SKY_NAME);
}

function displaySkyName(value: string) {
  return sanitizeSkyName(value) || "Cielo sin nombre";
}

function sanitizeNote(value: string) {
  return value.trim().slice(0, MAX_NOTE);
}

function fallbackTitle(value: string) {
  const compact = value.replace(/\s+/g, " ").trim();
  if (!compact) return "Luz nueva";
  const words = compact.split(" ").slice(0, 4).join(" ");
  return words.length > MAX_TITLE ? `${words.slice(0, MAX_TITLE - 1).trim()}...` : words;
}

function safeTitle(title: string, note = "") {
  const clean = sanitizeTitle(title);
  return clean || fallbackTitle(note);
}

function excerpt(value: string, max = 86) {
  const compact = value.replace(/\s+/g, " ").trim();
  if (!compact) return "Sin nota larga todavia.";
  return compact.length > max ? `${compact.slice(0, max - 1).trim()}…` : compact;
}

function resonanceKey(value: string) {
  return sanitizeTitle(value).toLocaleLowerCase("es-ES");
}

function stripResonanceMarkup(value: string) {
  return value.replace(/\{([^{}]+)\}/g, (_, raw: string) => sanitizeTitle(raw) || "").replace(/\s+/g, " ").trim();
}

function extractResonanceTitles(value: string) {
  const matches = value.matchAll(/\{([^{}]+)\}/g);
  const seen = new Set<string>();
  const titles: string[] = [];
  for (const match of matches) {
    const title = sanitizeTitle(match[1] ?? "");
    const key = resonanceKey(title);
    if (!title || !key || seen.has(key)) continue;
    seen.add(key);
    titles.push(title);
  }
  return titles;
}

function compactText(value: string) {
  return value.replace(/\s+/g, " ").replace(/\s([,.;!?])/g, "$1").trim();
}

function arraysEqual<T>(left: T[], right: T[]) {
  if (left.length !== right.length) return false;
  return left.every((item, index) => item === right[index]);
}

function hasDistinctNote(note: string, title: string) {
  const compactNote = compactText(note);
  const compactTitle = compactText(title);
  return Boolean(compactNote) && compactNote !== compactTitle;
}

function normalizeTheme(value: unknown): SkyTheme {
  return THEMES.includes(value as SkyTheme) ? (value as SkyTheme) : "night";
}

function normalizeTone(value: unknown): Tone {
  if (value === "custom") return "custom";
  return COLORS.includes(value as Tone) ? (value as Tone) : "pearl";
}

function normalizeCustomColor(value: unknown) {
  if (typeof value !== "string") return null;
  const hex = value.trim();
  return /^#([0-9a-fA-F]{6})$/.test(hex) ? hex.toLowerCase() : null;
}

function normalizeSize(value: unknown): StarSize {
  return ["s", "m", "l"].includes(String(value)) ? (value as StarSize) : "m";
}

function normalizeShape(value: unknown): StarShape {
  return ["orb", "diamond", "spark", "heart", "lucero", "comet", "flower"].includes(String(value)) ? (value as StarShape) : "orb";
}

function starColorValue(color: Tone, customColor: string | null = null) {
  if (color === "custom") return customColor ?? "#ff8dc9";
  return TONE_VALUES[color];
}

function linePath(points: Array<{ x: number; y: number }>) {
  if (points.length < 2) return "";
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let index = 1; index < points.length; index += 1) {
    path += ` L ${points[index].x} ${points[index].y}`;
  }
  return path;
}

function starRect(x: number, y: number): Rect {
  return { x1: x - 4.6, y1: y - 4.6, x2: x + 4.6, y2: y + 4.6 };
}

function overlap(a: Rect, b: Rect) {
  return !(a.x2 < b.x1 || a.x1 > b.x2 || a.y2 < b.y1 || a.y1 > b.y2);
}

function titleRect(x: number, y: number, title: string, side: LabelSide): Rect {
  const width = clamp(title.length * 0.92, 8, 17);
  const height = 4.4;
  if (side === "top") return { x1: x - width / 2, y1: y - 8.8, x2: x + width / 2, y2: y - 4.4 };
  if (side === "left") return { x1: x - width - 4.8, y1: y - height / 2, x2: x - 4.8, y2: y + height / 2 };
  if (side === "right") return { x1: x + 4.8, y1: y - height / 2, x2: x + width + 4.8, y2: y + height / 2 };
  return { x1: x - width / 2, y1: y + 4.4, x2: x + width / 2, y2: y + 8.8 };
}

function sideOrder(x: number, y: number): LabelSide[] {
  if (y < 22) return ["bottom", "right", "left", "top"];
  if (y > 74) return ["top", "right", "left", "bottom"];
  if (x < 24) return ["right", "bottom", "top", "left"];
  if (x > 76) return ["left", "bottom", "top", "right"];
  return ["bottom", "top", "right", "left"];
}

function chooseTitleSide(x: number, y: number, title: string, occupied: Rect[]) {
  for (const side of sideOrder(x, y)) {
    const rect = titleRect(x, y, title, side);
    if (rect.x1 <= 2 || rect.x2 >= 98 || rect.y1 <= 4 || rect.y2 >= 92) continue;
    if (!occupied.some((box) => overlap(rect, box))) return side;
  }
  return "bottom";
}

function resolveTitleSides(stars: Star[]) {
  const visible = stars.filter((star) => star.showTitle);
  const starBoxes = stars.map((star) => starRect(star.x, star.y));
  const titleBoxes: Rect[] = [];
  const result: Record<string, LabelSide> = {};
  for (const star of [...visible].sort((a, b) => b.title.length - a.title.length)) {
    const side = chooseTitleSide(star.x, star.y, star.title, [...starBoxes, ...titleBoxes]);
    result[star.id] = side;
    titleBoxes.push(titleRect(star.x, star.y, star.title, side));
  }
  return result;
}

function candidatePoints() {
  const points: Array<{ x: number; y: number }> = [];
  for (let ring = 0; ring < 4; ring += 1) {
    BASE_POINTS.forEach((base, index) => {
      const angle = (Math.PI * 2 * index) / BASE_POINTS.length + ring * 0.38;
      points.push({
        x: clamp(base.x + Math.cos(angle) * ring * 2.7, 8, 92),
        y: clamp(base.y + Math.sin(angle) * ring * 2.1, 10, 84),
      });
    });
  }
  for (let row = 0; row < 4; row += 1) {
    for (let col = 0; col < 5; col += 1) {
      points.push({ x: 14 + col * 18 + (row % 2 === 0 ? 0 : 2), y: 16 + row * 17 });
    }
  }
  return points;
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function pointToSegmentDistance(point: { x: number; y: number }, start: { x: number; y: number }, end: { x: number; y: number }) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (dx === 0 && dy === 0) return distance(point, start);
  const t = clamp(((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy), 0, 1);
  return distance(point, { x: start.x + dx * t, y: start.y + dy * t });
}

function findConstellationDropTarget(star: Star, constellations: Constellation[], stars: Star[]) {
  const byId = new Map(stars.map((item) => [item.id, item]));
  let best: { constellationId: string; score: number } | null = null;

  for (const constellation of constellations) {
    if (constellation.starIds.includes(star.id)) continue;
    const points = constellation.starIds.map((id) => byId.get(id)).filter((item): item is Star => Boolean(item));
    if (points.length < 2) continue;

    let nearest = Infinity;
    for (let index = 1; index < points.length; index += 1) {
      nearest = Math.min(nearest, pointToSegmentDistance(star, points[index - 1], points[index]));
    }

    if (nearest <= CONSTELLATION_JOIN_THRESHOLD && (!best || nearest < best.score)) {
      best = { constellationId: constellation.id, score: nearest };
    }
  }

  return best?.constellationId ?? null;
}

function findSpot(title: string, stars: Star[]) {
  const starBoxes = stars.map((star) => starRect(star.x, star.y));
  const titleSides = resolveTitleSides(stars);
  const titleBoxes = stars
    .filter((star) => star.showTitle)
    .map((star) => titleRect(star.x, star.y, star.title, titleSides[star.id] ?? "bottom"));
  let best = { x: 50, y: 48 };
  let bestScore = -Infinity;
  for (const point of candidatePoints()) {
    const nearest = stars.length ? Math.min(...stars.map((star) => distance(star, point))) : 100;
    if (nearest < MIN_DISTANCE) continue;
    chooseTitleSide(point.x, point.y, title, [...starBoxes, ...titleBoxes]);
    const score = nearest - (Math.abs(point.x - 50) + Math.abs(point.y - 46)) * 0.05;
    if (score > bestScore) {
      best = point;
      bestScore = score;
    }
  }
  return best;
}

function nextTheme(skies: Sky[]) {
  return THEMES[skies.length % THEMES.length];
}

function formatDate(value: string) {
  return DATE_FORMAT.format(new Date(value));
}

function formatDateTime(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  return DATE_TIME_FORMAT.format(date);
}

function moonPhaseKey(phase: number): MoonPhaseKey {
  if (phase < 0.03 || phase >= 0.97) return "new";
  if (phase < 0.22) return "waxing-crescent";
  if (phase < 0.28) return "first-quarter";
  if (phase < 0.47) return "waxing-gibbous";
  if (phase < 0.53) return "full";
  if (phase < 0.72) return "waning-gibbous";
  if (phase < 0.78) return "last-quarter";
  return "waning-crescent";
}

function moonPhaseName(key: MoonPhaseKey) {
  if (key === "new") return "Luna nueva";
  if (key === "waxing-crescent") return "Creciente fina";
  if (key === "first-quarter") return "Cuarto creciente";
  if (key === "waxing-gibbous") return "Gibosa creciente";
  if (key === "full") return "Luna llena";
  if (key === "waning-gibbous") return "Gibosa menguante";
  if (key === "last-quarter") return "Cuarto menguante";
  return "Menguante fina";
}

function moonPhaseTags(key: MoonPhaseKey) {
  if (key === "new") return ["semilla", "escucha"];
  if (key === "waxing-crescent") return ["intencion", "apertura"];
  if (key === "first-quarter") return ["decision", "accion"];
  if (key === "waxing-gibbous") return ["ajuste", "crecimiento"];
  if (key === "full") return ["claridad", "celebracion"];
  if (key === "waning-gibbous") return ["gratitud", "integracion"];
  if (key === "last-quarter") return ["limpieza", "soltar"];
  return ["reposo", "silencio"];
}

function calculateMoonPhase(date: Date): MoonPhase {
  const daysSinceReference = (date.getTime() - KNOWN_NEW_MOON_UTC) / 86_400_000;
  const age = ((daysSinceReference % SYNODIC_MONTH) + SYNODIC_MONTH) % SYNODIC_MONTH;
  const phase = age / SYNODIC_MONTH;
  const illumination = 0.5 * (1 - Math.cos(phase * Math.PI * 2));
  const key = moonPhaseKey(phase);
  return {
    age,
    phase,
    illumination,
    waxing: phase <= 0.5,
    key,
    name: moonPhaseName(key),
  };
}

function shapeText(shape: StarShape) {
  if (shape === "orb") return "orbe";
  if (shape === "diamond") return "rombo";
  if (shape === "heart") return "corazón";
  if (shape === "lucero") return "lucero";
  if (shape === "comet") return "cometa";
  if (shape === "flower") return "flor estelar";
  return "chispa";
}

function extractMeditationText(title: string, note: string) {
  const cleanTitle = compactText(title);
  const cleanNote = compactText(stripResonanceMarkup(note));
  if (!cleanNote || cleanNote.toLowerCase() === cleanTitle.toLowerCase()) return "";
  if (cleanNote.length <= 144) return cleanNote;

  const minLength = Math.max(28, Math.min(54, cleanTitle.length + 10));
  const sentences = cleanNote
    .split(/(?<=[.!?])\s+/)
    .map((part) => compactText(part))
    .filter(Boolean);
  const preferredSentence = sentences.find((sentence) => sentence.length >= minLength && sentence.length <= 158);
  if (preferredSentence) return preferredSentence;

  const clauses = cleanNote
    .split(/[;:]/)
    .map((part) => compactText(part))
    .filter(Boolean);
  const preferredClause = clauses.find((clause) => clause.length >= minLength && clause.length <= 132);
  if (preferredClause) {
    return /[.!?]$/.test(preferredClause) ? preferredClause : `${preferredClause}.`;
  }

  const commaClause = cleanNote
    .split(",")
    .map((part) => compactText(part))
    .find((part) => part.length >= minLength && part.length <= 114);
  if (commaClause) {
    return `${commaClause}.`;
  }

  return excerpt(cleanNote, 132);
}

function buildMeditationPool(stars: Star[]): MeditationPhrase[] {
  return [...stars]
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map((star) => {
      const title = safeTitle(star.title, star.note);
      const noteLine = extractMeditationText(title, star.note);
      return noteLine
        ? {
            id: `${star.id}-note`,
            starId: star.id,
            text: noteLine,
            emphasis: "note" as const,
          }
        : {
            id: `${star.id}-title`,
            starId: star.id,
            text: title,
            emphasis: "title" as const,
          };
    });
}

function themeText(theme: SkyTheme) {
  if (theme === "night") return "Noche";
  if (theme === "rose") return "Rosa";
  if (theme === "dawn") return "Alba";
  if (theme === "aurora") return "Aurora";
  if (theme === "midnight") return "Medianoche";
  if (theme === "ember") return "Brasa";
  if (theme === "lagoon") return "Laguna";
  if (theme === "gaia") return "Gaia";
  if (theme === "rings") return "Anillos";
  if (theme === "venus") return "Venus";
  if (theme === "mercury") return "Mercurio";
  if (theme === "abyss") return "Abismo";
  return "Eclipse";
}

function themeMoodText(theme: SkyTheme) {
  if (theme === "night") return "azul sereno";
  if (theme === "rose") return "bruma rosa";
  if (theme === "dawn") return "amanecer dorado";
  if (theme === "aurora") return "velo boreal";
  if (theme === "midnight") return "sombra quieta";
  if (theme === "ember") return "resplandor calido";
  if (theme === "lagoon") return "oceano celeste";
  if (theme === "gaia") return "tierra cercana";
  if (theme === "rings") return "anillos orbitales";
  if (theme === "venus") return "perla solar";
  if (theme === "mercury") return "roca brillante";
  if (theme === "abyss") return "vacio profundo";
  return "eclipse violeta";
}

function toneText(tone: Tone) {
  if (tone === "gold") return "dorado";
  if (tone === "coral") return "coral";
  if (tone === "sky") return "celeste";
  if (tone === "rose") return "rosa";
  if (tone === "mint") return "menta";
  if (tone === "violet") return "violeta";
  if (tone === "custom") return "personalizado";
  return "perla";
}

function sizeText(size: StarSize) {
  if (size === "s") return "pequena";
  if (size === "l") return "amplia";
  return "media";
}

function normalizeAtlasState(raw: unknown): AtlasState | null {
  if (!raw || typeof raw !== "object") return null;
  const payload = "data" in raw && typeof (raw as { data?: unknown }).data === "object" ? (raw as { data: unknown }).data : raw;
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  const defaultShowTitles =
    record.labelMode === "hidden" || record.labelMode === "titles"
      ? record.labelMode === "titles"
      : record.labelsVisible === false
        ? false
        : true;
  const skiesInput = Array.isArray(record.skies) ? record.skies : [];

  const skies: Sky[] = skiesInput.length
    ? skiesInput
        .map((entry, index) => {
          if (!entry || typeof entry !== "object") return null;
          const sky = entry as Record<string, unknown>;
          const id = typeof sky.id === "string" && sky.id ? sky.id : `sky-${index + 1}`;
          return {
            id,
            name: typeof sky.name === "string" && sky.name.trim() ? sky.name.trim() : `Cielo ${index + 1}`,
            createdAt: typeof sky.createdAt === "string" ? sky.createdAt : new Date().toISOString(),
            capacity: clamp(Number(sky.capacity) || 16, 6, 40),
            theme: normalizeTheme(sky.theme),
            showTitles: typeof sky.showTitles === "boolean" ? sky.showTitles : defaultShowTitles,
          };
        })
        .filter((sky): sky is Sky => Boolean(sky))
    : DEFAULT_STATE.skies;

  const skyIds = new Set(skies.map((sky) => sky.id));
  const starsInput = Array.isArray(record.stars) ? record.stars : [];
  const stars: Star[] = starsInput
    .map((entry, index) => {
      if (!entry || typeof entry !== "object") return null;
      const star = entry as Record<string, unknown>;
      const legacyText = typeof star.text === "string" ? star.text : "";
      const title = safeTitle(typeof star.title === "string" ? star.title : typeof star.label === "string" ? star.label : "", legacyText);
      const note = sanitizeNote(typeof star.note === "string" ? star.note : legacyText);
      const skyId = typeof star.skyId === "string" && skyIds.has(star.skyId) ? star.skyId : skies[0].id;
      return {
        id: typeof star.id === "string" && star.id ? star.id : `star-${index + 1}`,
        skyId,
        createdAt: typeof star.createdAt === "string" ? star.createdAt : new Date().toISOString(),
        title,
        note,
        showTitle: typeof star.showTitle === "boolean" ? star.showTitle : typeof star.showLabel === "boolean" ? star.showLabel : true,
        color: normalizeTone(star.color),
        customColor: normalizeCustomColor(star.customColor),
        size: normalizeSize(star.size),
        shape: normalizeShape(star.shape),
        x: clamp(Number(star.x) || 50, 6, 94),
        y: clamp(Number(star.y) || 50, 8, 84),
      };
    })
    .filter((star): star is Star => Boolean(star));

  const starIds = new Set(stars.map((star) => star.id));
  const constellationsInput = Array.isArray(record.constellations) ? record.constellations : [];
  const constellations: Constellation[] = constellationsInput
    .map((entry, index) => {
      if (!entry || typeof entry !== "object") return null;
      const constellation = entry as Record<string, unknown>;
      const starIdsForConstellation = Array.isArray(constellation.starIds)
        ? constellation.starIds.filter((id): id is string => typeof id === "string" && starIds.has(id))
        : [];
      if (starIdsForConstellation.length < 2) return null;
      return {
        id: typeof constellation.id === "string" && constellation.id ? constellation.id : `constellation-${index + 1}`,
        skyId: typeof constellation.skyId === "string" && skyIds.has(constellation.skyId) ? constellation.skyId : skies[0].id,
        name: typeof constellation.name === "string" && constellation.name.trim() ? constellation.name.trim() : `Constelacion ${index + 1}`,
        starIds: starIdsForConstellation,
      };
    })
    .filter((item): item is Constellation => Boolean(item));

  const activeSkyId = typeof record.activeSkyId === "string" && skyIds.has(record.activeSkyId) ? record.activeSkyId : skies[0].id;
  const labelMode: LabelMode =
    defaultShowTitles ? "titles" : "hidden";

  return {
    skies,
    stars,
    constellations,
    activeSkyId,
    labelMode,
  };
}

function serializeAtlasState(state: AtlasState) {
  return JSON.stringify({
    skies: state.skies,
    stars: state.stars,
    constellations: state.constellations,
    activeSkyId: state.activeSkyId,
    labelMode: state.labelMode,
  });
}

function serializePersistedAtlas(state: AtlasState, savedAt = new Date().toISOString()) {
  return JSON.stringify({
    savedAt,
    data: {
      skies: state.skies,
      stars: state.stars,
      constellations: state.constellations,
      activeSkyId: state.activeSkyId,
      labelMode: state.labelMode,
    },
  });
}

function readPersistedAtlas(raw: string | null) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    const state = normalizeAtlasState(parsed);
    if (!state) return null;
    return {
      state,
      savedAt:
        parsed && typeof parsed === "object" && "savedAt" in parsed && typeof (parsed as { savedAt?: unknown }).savedAt === "string"
          ? ((parsed as { savedAt: string }).savedAt ?? null)
          : null,
    };
  } catch {
    return null;
  }
}

function readHistorySnapshots(raw: string | null) {
  if (!raw) return [] as HistorySnapshot[];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [] as HistorySnapshot[];
    return parsed
      .map((entry) => {
        if (!entry || typeof entry !== "object") return null;
        const record = entry as Record<string, unknown>;
        const state = normalizeAtlasState(record.state ?? record.data ?? record);
        if (!state) return null;
        return {
          savedAt: typeof record.savedAt === "string" ? record.savedAt : new Date().toISOString(),
          state,
        } satisfies HistorySnapshot;
      })
      .filter((entry): entry is HistorySnapshot => Boolean(entry));
  } catch {
    return [] as HistorySnapshot[];
  }
}

function writeHistorySnapshot(windowRef: Window, nextState: AtlasState, previousSignature: string | null) {
  const history = readHistorySnapshots(windowRef.localStorage.getItem(STORAGE_HISTORY_KEY));
  const serialized = serializeAtlasState(nextState);
  const now = new Date().toISOString();
  const nextEntry: HistorySnapshot = {
    savedAt: now,
    state: nextState,
  };

  const deduped = history.filter((entry) => serializeAtlasState(entry.state) !== serialized);
  const shouldPrependPrevious =
    previousSignature &&
    previousSignature !== serialized &&
    !deduped.some((entry) => serializeAtlasState(entry.state) === previousSignature);

  if (shouldPrependPrevious) {
    const previousState = normalizeAtlasState(JSON.parse(previousSignature));
    if (previousState) {
      deduped.unshift({
        savedAt: now,
        state: previousState,
      });
    }
  }

  const nextHistory = [nextEntry, ...deduped].slice(0, STORAGE_HISTORY_LIMIT);
  windowRef.localStorage.setItem(
    STORAGE_HISTORY_KEY,
    JSON.stringify(
      nextHistory.map((entry) => ({
        savedAt: entry.savedAt,
        state: entry.state,
      })),
    ),
  );
}

function persistAtlasToStorage(
  windowRef: Window,
  nextState: AtlasState,
  previousSerialized: string | null,
  historyMode: "always" | "smart",
  nextHistorySignature: string,
  lastHistorySignatureRef: MutableRefObject<string>,
  lastHistoryAtRef: MutableRefObject<number>,
) {
  const serialized = serializeAtlasState(nextState);
  const persistedSerialized = serializePersistedAtlas(nextState);
  windowRef.localStorage.setItem(STORAGE_KEY, persistedSerialized);
  windowRef.localStorage.setItem(STORAGE_RECOVERY_KEY, persistedSerialized);
  void writeIndexedAtlas(persistedSerialized);

  const now = Date.now();
  const shouldWriteHistory =
    historyMode === "always" ||
    nextHistorySignature !== lastHistorySignatureRef.current ||
    now - lastHistoryAtRef.current >= STORAGE_HISTORY_MIN_INTERVAL_MS;

  if (shouldWriteHistory) {
    writeHistorySnapshot(windowRef, nextState, previousSerialized);
    lastHistorySignatureRef.current = nextHistorySignature;
    lastHistoryAtRef.current = now;
  }

  return serialized;
}

let indexedDbPromise: Promise<IDBDatabase> | null = null;

function openAtlasDatabase() {
  if (typeof window === "undefined" || !("indexedDB" in window)) {
    return Promise.reject(new Error("IndexedDB no disponible"));
  }
  if (indexedDbPromise) return indexedDbPromise;

  indexedDbPromise = new Promise((resolve, reject) => {
    const request = window.indexedDB.open(INDEXED_DB_NAME, INDEXED_DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(INDEXED_DB_STORE)) {
        db.createObjectStore(INDEXED_DB_STORE);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("No pude abrir la base local"));
  });

  return indexedDbPromise;
}

async function readIndexedAtlas() {
  try {
    const db = await openAtlasDatabase();
    const raw = await new Promise<string | null>((resolve, reject) => {
      const transaction = db.transaction(INDEXED_DB_STORE, "readonly");
      const store = transaction.objectStore(INDEXED_DB_STORE);
      const request = store.get(INDEXED_DB_KEY);
      request.onsuccess = () => resolve(typeof request.result === "string" ? request.result : null);
      request.onerror = () => reject(request.error ?? new Error("No pude leer la base local"));
    });
    return readPersistedAtlas(raw);
  } catch {
    return null;
  }
}

async function writeIndexedAtlas(serialized: string) {
  try {
    const db = await openAtlasDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(INDEXED_DB_STORE, "readwrite");
      const store = transaction.objectStore(INDEXED_DB_STORE);
      store.put(serialized, INDEXED_DB_KEY);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("No pude guardar la base local"));
      transaction.onabort = () => reject(transaction.error ?? new Error("Se interrumpio el guardado local"));
    });
  } catch {
    // Fallback silencioso: seguimos teniendo localStorage.
  }
}

function readStateBootstrap(): StorageBootstrap {
  if (typeof window === "undefined") {
    return { state: DEFAULT_STATE, notice: "", skipInitialPersist: false, savedAt: null, source: "default" };
  }

  const primaryRaw = window.localStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_STORAGE_KEY);
  const recoveryRaw = window.localStorage.getItem(STORAGE_RECOVERY_KEY);
  const historyRaw = window.localStorage.getItem(STORAGE_HISTORY_KEY);

  const primary = readPersistedAtlas(primaryRaw);
  if (primary?.state) {
    return { state: primary.state, notice: "", skipInitialPersist: false, savedAt: primary.savedAt, source: "localStorage" };
  }

  const recovery = readPersistedAtlas(recoveryRaw);
  if (recovery?.state) {
    return {
      state: recovery.state,
      notice: primaryRaw
        ? "He recuperado una copia local del atlas porque la memoria principal no se pudo leer."
        : "He restaurado una copia local guardada automaticamente de tu atlas.",
      skipInitialPersist: false,
      savedAt: recovery.savedAt,
      source: "recovery",
    };
  }

  const history = readHistorySnapshots(historyRaw);
  if (history.length > 0) {
    return {
      state: history[0].state,
      notice: "He restaurado una copia local anterior del atlas desde el historial automatico.",
      skipInitialPersist: false,
      savedAt: history[0].savedAt,
      source: "history",
    };
  }

  if (primaryRaw) {
    return {
      state: DEFAULT_STATE,
      notice: "No pude leer el atlas guardado. He cargado el atlas base y no sobrescribire la memoria en este arranque hasta que hagas cambios.",
      skipInitialPersist: true,
      savedAt: null,
      source: "default",
    };
  }

  return { state: DEFAULT_STATE, notice: "", skipInitialPersist: false, savedAt: null, source: "default" };
}

export function App() {
  const initialBootstrap = useMemo(() => readStateBootstrap(), []);
  const initial = initialBootstrap.state;
  const [skies, setSkies] = useState(initial.skies);
  const [stars, setStars] = useState(initial.stars);
  const [constellations, setConstellations] = useState(initial.constellations);
  const [activeSkyId, setActiveSkyId] = useState(initial.activeSkyId);
  const [labelMode, setLabelMode] = useState<LabelMode>(initial.labelMode);
  const [composer, setComposer] = useState<ComposerDraft>({ title: "", note: "", constellationId: "" });
  const [composerOpen, setComposerOpen] = useState(false);
  const [birthEffect, setBirthEffect] = useState<BirthEffect | null>(null);
  const [selectedStarId, setSelectedStarId] = useState<string | null>(null);
  const [starEditor, setStarEditor] = useState<StarEditorDraft | null>(null);
  const [editingSky, setEditingSky] = useState(false);
  const [skyEditor, setSkyEditor] = useState<SkyEditorDraft | null>(null);
  const [constellationMode, setConstellationMode] = useState(false);
  const [editingConstellationId, setEditingConstellationId] = useState<string | null>(null);
  const [draftConstellationName, setDraftConstellationName] = useState("");
  const [draftConstellationStarIds, setDraftConstellationStarIds] = useState<string[]>([]);
  const [overlayPanel, setOverlayPanel] = useState<OverlayPanel>(null);
  const [surfaceMode, setSurfaceMode] = useState<SurfaceMode>("sky");
  const [importMessage, setImportMessage] = useState("");
  const [moveTargetSkyId, setMoveTargetSkyId] = useState("");
  const [draggingStarId, setDraggingStarId] = useState<string | null>(null);
  const [dismissedSkyGuides, setDismissedSkyGuides] = useState<string[]>([]);
  const [pendingImportState, setPendingImportState] = useState<AtlasState | null>(null);
  const [pendingConstellationJoin, setPendingConstellationJoin] = useState<PendingConstellationJoin>(null);
  const [pendingConstellationId, setPendingConstellationId] = useState<string | null>(null);
  const [newSkyName, setNewSkyName] = useState("");
  const [pendingSkySelectionId, setPendingSkySelectionId] = useState<string | null>(null);
  const [skyMenuId, setSkyMenuId] = useState<string | null>(null);
  const [skyMenuPlacement, setSkyMenuPlacement] = useState<"down" | "up">("down");
  const [draggedSkyId, setDraggedSkyId] = useState<string | null>(null);
  const [dropSkyId, setDropSkyId] = useState<string | null>(null);
  const [pendingDeleteSkyId, setPendingDeleteSkyId] = useState<string | null>(null);
  const [pendingSkyAction, setPendingSkyAction] = useState<PendingSkyAction>(null);
  const [storageNotice, setStorageNotice] = useState(initialBootstrap.notice);
  const [storageSource, setStorageSource] = useState<StorageBootstrap["source"]>(initialBootstrap.source);
  const [storageSavedAt, setStorageSavedAt] = useState<string | null>(initialBootstrap.savedAt);
  const [currentMoment, setCurrentMoment] = useState(() => new Date());
  const [meditationMode, setMeditationMode] = useState(false);
  const [meditationCycle, setMeditationCycle] = useState(0);
  const [pendingNavigation, setPendingNavigation] = useState<PendingNavigation | null>(null);
  const [inspectorHomeView, setInspectorHomeView] = useState<"neutral" | "sky">("neutral");
  const [showConstellations, setShowConstellations] = useState(true);
  const [showResonances, setShowResonances] = useState(true);
  const [viewportControlsOpen, setViewportControlsOpen] = useState(false);
  const [skyMenuCoords, setSkyMenuCoords] = useState<{ top: number; left: number } | null>(null);
  const [starSymbolPickerOpen, setStarSymbolPickerOpen] = useState(false);

  const skyPanelRef = useRef<HTMLDivElement | null>(null);
  const skyRailRef = useRef<HTMLDivElement | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const composerTitleRef = useRef<HTMLInputElement | null>(null);
  const starNoteTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const dragSessionRef = useRef<DragSession | null>(null);
  const renderedStarsRef = useRef<Star[]>([]);
  const activeConstellationsRef = useRef<Constellation[]>([]);
  const skipInitialPersistRef = useRef(initialBootstrap.skipInitialPersist);
  const hydrationReadyRef = useRef(typeof window === "undefined");
  const persistTimerRef = useRef<number | null>(null);
  const lastSerializedRef = useRef(serializeAtlasState(initial));
  const bootSerializedRef = useRef(serializeAtlasState(initial));
  const lastHistorySignatureRef = useRef(`${initial.skies.length}|${initial.stars.length}|${initial.constellations.length}`);
  const lastHistoryAtRef = useRef(0);
  const latestStateRef = useRef<AtlasState>(initial);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let cancelled = false;
    void readIndexedAtlas().then((indexed) => {
      if (cancelled) return;

      if (cancelled || !indexed?.state) return;

      const indexedSerialized = serializeAtlasState(indexed.state);
      const currentSerialized = serializeAtlasState({
        skies,
        stars,
        constellations,
        activeSkyId,
        labelMode,
      });

      const bootstrapSavedAt = initialBootstrap.savedAt ? Date.parse(initialBootstrap.savedAt) : 0;
      const indexedSavedAt = indexed.savedAt ? Date.parse(indexed.savedAt) : 0;

      if (currentSerialized === bootSerializedRef.current && indexedSerialized !== currentSerialized && indexedSavedAt >= bootstrapSavedAt) {
        replaceAtlas(indexed.state);
        setStorageNotice((current) => current || "He cargado tu atlas desde la memoria avanzada local.");
        setStorageSource("indexeddb");
        setStorageSavedAt(indexed.savedAt ?? null);
      }

      if (indexedSerialized === currentSerialized) {
        lastSerializedRef.current = indexedSerialized;
        setStorageSource("indexeddb");
        setStorageSavedAt(indexed.savedAt ?? null);
      }
    }).finally(() => {
      if (!cancelled) {
        hydrationReadyRef.current = true;
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!hydrationReadyRef.current) return;
    if (skipInitialPersistRef.current) {
      skipInitialPersistRef.current = false;
      return;
    }

    const nextState: AtlasState = {
      skies,
      stars,
      constellations,
      activeSkyId,
      labelMode: skies.find((sky) => sky.id === activeSkyId)?.showTitles === false ? "hidden" : "titles",
    };
    const previousSerialized = lastSerializedRef.current;
    const nextHistorySignature = `${nextState.skies.length}|${nextState.stars.length}|${nextState.constellations.length}`;
    latestStateRef.current = nextState;

    if (persistTimerRef.current) {
      window.clearTimeout(persistTimerRef.current);
    }

    persistTimerRef.current = window.setTimeout(() => {
      lastSerializedRef.current = persistAtlasToStorage(
        window,
        nextState,
        previousSerialized,
        "smart",
        nextHistorySignature,
        lastHistorySignatureRef,
        lastHistoryAtRef,
      );
      persistTimerRef.current = null;
    }, STORAGE_PERSIST_DEBOUNCE_MS);

    return () => {
      if (persistTimerRef.current) {
        window.clearTimeout(persistTimerRef.current);
        persistTimerRef.current = null;
      }
    };
  }, [activeSkyId, constellations, labelMode, skies, stars]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const flushCurrentAtlas = () => {
      if (!hydrationReadyRef.current) return;
      const nextState = latestStateRef.current;
      const nextHistorySignature = `${nextState.skies.length}|${nextState.stars.length}|${nextState.constellations.length}`;
      if (persistTimerRef.current) {
        window.clearTimeout(persistTimerRef.current);
        persistTimerRef.current = null;
      }
      lastSerializedRef.current = persistAtlasToStorage(
        window,
        nextState,
        lastSerializedRef.current,
        "smart",
        nextHistorySignature,
        lastHistorySignatureRef,
        lastHistoryAtRef,
      );
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flushCurrentAtlas();
      }
    };

    window.addEventListener("pagehide", flushCurrentAtlas);
    window.addEventListener("beforeunload", flushCurrentAtlas);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("pagehide", flushCurrentAtlas);
      window.removeEventListener("beforeunload", flushCurrentAtlas);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    setSelectedStarId(null);
    setStarEditor(null);
    setEditingSky(false);
    setSkyEditor(null);
    setComposerOpen(false);
    setComposer({ title: "", note: "", constellationId: "" });
    setConstellationMode(false);
    setEditingConstellationId(null);
    setDraftConstellationName("");
    setDraftConstellationStarIds([]);
    setSkyMenuId(null);
    setPendingConstellationJoin(null);
    setMeditationCycle(0);
  }, [activeSkyId]);

  useEffect(() => {
    if (!pendingSkyAction || pendingSkyAction.skyId !== activeSkyId) return;

    if (pendingSkyAction.mode === "composer") {
      setSurfaceMode("sky");
      setComposerOpen(true);
      setDismissedSkyGuides((current) => (current.includes(activeSkyId) ? current : [...current, activeSkyId]));
      window.setTimeout(() => composerTitleRef.current?.focus(), 0);
    } else {
      setSurfaceMode("sky");
      setConstellationMode(true);
      setDismissedSkyGuides((current) => (current.includes(activeSkyId) ? current : [...current, activeSkyId]));
    }

    setPendingSkyAction(null);
  }, [activeSkyId, pendingSkyAction]);

  useEffect(() => {
    if (!birthEffect) return;
    const addTimer = window.setTimeout(() => {
      setStars((current) => [...current, birthEffect.star]);
      if (birthEffect.constellationId) {
        setConstellations((current) =>
          current.map((constellation) =>
            constellation.id === birthEffect.constellationId && !constellation.starIds.includes(birthEffect.star.id)
              ? { ...constellation, starIds: [...constellation.starIds, birthEffect.star.id] }
              : constellation,
          ),
        );
      }
      setSelectedStarId(birthEffect.star.id);
    }, BIRTH_ADD_MS);
    const endTimer = window.setTimeout(() => setBirthEffect(null), BIRTH_END_MS);
    return () => {
      window.clearTimeout(addTimer);
      window.clearTimeout(endTimer);
    };
  }, [birthEffect]);

  useEffect(() => {
    const handleMove = (event: PointerEvent) => {
      const session = dragSessionRef.current;
      const bounds = skyPanelRef.current?.getBoundingClientRect();
      if (!session || !bounds) return;
      const deltaX = event.clientX - session.startClientX;
      const deltaY = event.clientY - session.startClientY;
      const movement = Math.hypot(deltaX, deltaY);
      if (!session.moved && movement < 6) return;
      if (!session.moved) {
        dragSessionRef.current = { ...session, moved: true };
        setDraggingStarId(session.starId);
      }
      const nextX = clamp(session.originX + (deltaX / bounds.width) * 100, 6, 94);
      const nextY = clamp(session.originY + (deltaY / bounds.height) * 100, 8, 84);
      setStars((current) => current.map((star) => (star.id === session.starId ? { ...star, x: nextX, y: nextY } : star)));
    };

    const handleUp = () => {
      const session = dragSessionRef.current;
      if (session) {
        const movedStar = renderedStarsRef.current.find((star) => star.id === session.starId) ?? null;
        if (!session.moved) {
          setSelectedStarId(session.starId);
          setStarEditor(null);
        } else if (movedStar) {
          const constellationId = findConstellationDropTarget(movedStar, activeConstellationsRef.current, renderedStarsRef.current);
          setSelectedStarId(movedStar.id);
          setStarEditor(null);
          if (constellationId) {
            setPendingConstellationJoin({ starId: movedStar.id, constellationId });
            setOverlayPanel("join-constellation");
          }
        }
      }
      dragSessionRef.current = null;
      setDraggingStarId(null);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
    };
  }, []);

  const activeSky = useMemo(() => skies.find((sky) => sky.id === activeSkyId) ?? skies[0], [activeSkyId, skies]);
  const liveSkyTheme = editingSky && skyEditor ? skyEditor.theme : activeSky.theme;
  const activeStars = useMemo(() => stars.filter((star) => star.skyId === activeSkyId), [activeSkyId, stars]);
  const renderedStars = useMemo(
    () =>
      activeStars.map((star) =>
        starEditor?.id === star.id
          ? {
              ...star,
              title: safeTitle(starEditor.title, starEditor.note),
              note: sanitizeNote(starEditor.note),
              showTitle: starEditor.showTitle,
              color: starEditor.color,
              customColor: starEditor.color === "custom" ? normalizeCustomColor(starEditor.customColor) ?? "#ff8dc9" : null,
              size: starEditor.size,
              shape: starEditor.shape,
            }
          : star,
      ),
    [activeStars, starEditor],
  );
  const atlasStars = useMemo(
    () =>
      stars.map((star) =>
        starEditor?.id === star.id
          ? {
              ...star,
              title: safeTitle(starEditor.title, starEditor.note),
              note: sanitizeNote(starEditor.note),
              showTitle: starEditor.showTitle,
              color: starEditor.color,
              customColor: starEditor.color === "custom" ? normalizeCustomColor(starEditor.customColor) ?? "#ff8dc9" : null,
              size: starEditor.size,
              shape: starEditor.shape,
            }
          : star,
      ),
    [starEditor, stars],
  );
  const activeConstellations = useMemo(() => constellations.filter((item) => item.skyId === activeSkyId), [activeSkyId, constellations]);
  const selectedStar = useMemo(() => renderedStars.find((star) => star.id === selectedStarId) ?? null, [renderedStars, selectedStarId]);
  const persistedSelectedStar = useMemo(() => stars.find((star) => star.id === selectedStarId) ?? null, [selectedStarId, stars]);
  const editingSelectedStar = Boolean(selectedStar && starEditor?.id === selectedStar.id);
  const selectedConstellation = useMemo(
    () => activeConstellations.find((constellation) => constellation.id === pendingConstellationId) ?? null,
    [activeConstellations, pendingConstellationId],
  );
  const editingConstellation = useMemo(
    () => activeConstellations.find((constellation) => constellation.id === editingConstellationId) ?? null,
    [activeConstellations, editingConstellationId],
  );
  const pendingJoinConstellation = useMemo(
    () => activeConstellations.find((constellation) => constellation.id === pendingConstellationJoin?.constellationId) ?? null,
    [activeConstellations, pendingConstellationJoin],
  );
  const pendingJoinStar = useMemo(
    () => renderedStars.find((star) => star.id === pendingConstellationJoin?.starId) ?? null,
    [pendingConstellationJoin, renderedStars],
  );
  const moonPhase = calculateMoonPhase(currentMoment);
  const moonMaskShift = (moonPhase.waxing ? 1 : -1) * (1 - moonPhase.illumination) * 100;
  const moonPhaseStyle = {
    "--moon-glow-strength": `${0.14 + moonPhase.illumination * 0.2}`,
    "--moon-mask-shift": `${moonMaskShift}%`,
    "--moon-highlight-x": moonPhase.waxing ? "76%" : "24%",
    "--moon-lowlight-x": moonPhase.waxing ? "24%" : "76%",
  } as CSSProperties;
  const selectedStarConstellations = useMemo(
    () => (selectedStar ? activeConstellations.filter((constellation) => constellation.starIds.includes(selectedStar.id)) : []),
    [activeConstellations, selectedStar],
  );
  const resonanceSummaries = useMemo(() => {
    const titleIndex = new Map<string, Star[]>();
    const skyNameById = new Map(skies.map((sky) => [sky.id, displaySkyName(sky.name)]));
    const summaries = new Map<string, ResonanceSummary>();

    atlasStars.forEach((star) => {
      const key = resonanceKey(star.title);
      if (!key) return;
      const current = titleIndex.get(key) ?? [];
      current.push(star);
      titleIndex.set(key, current);
    });

    atlasStars.forEach((star) => {
      summaries.set(star.id, { outgoing: [], incoming: [], unresolved: [] });
    });

    atlasStars.forEach((source) => {
      const sourceSummary = summaries.get(source.id);
      if (!sourceSummary) return;
      extractResonanceTitles(source.note).forEach((requestedTitle) => {
        const key = resonanceKey(requestedTitle);
        if (!key) return;
        const matches = titleIndex.get(key) ?? [];
        const sameSkyMatches = matches.filter((target) => target.id !== source.id && target.skyId === source.skyId);
        const targetMatches = sameSkyMatches.length > 0 ? sameSkyMatches : matches.filter((target) => target.id !== source.id);

        if (targetMatches.length === 0) {
          sourceSummary.unresolved.push(requestedTitle);
          return;
        }

        targetMatches.forEach((target) => {
          const targetLink: ResonanceLink = {
            starId: target.id,
            title: target.title,
            skyId: target.skyId,
            skyName: skyNameById.get(target.skyId) ?? "Cielo",
            sameSky: target.skyId === source.skyId,
          };
          const incomingLink: ResonanceLink = {
            starId: source.id,
            title: source.title,
            skyId: source.skyId,
            skyName: skyNameById.get(source.skyId) ?? "Cielo",
            sameSky: target.skyId === source.skyId,
          };

          if (!sourceSummary.outgoing.some((link) => link.starId === target.id)) {
            sourceSummary.outgoing.push(targetLink);
          }
          const targetSummary = summaries.get(target.id);
          if (targetSummary && !targetSummary.incoming.some((link) => link.starId === source.id)) {
            targetSummary.incoming.push(incomingLink);
          }
        });
      });
    });

    return summaries;
  }, [atlasStars, skies]);
  const selectedStarResonances = useMemo(
    () => (selectedStar ? resonanceSummaries.get(selectedStar.id) ?? { outgoing: [], incoming: [], unresolved: [] } : null),
    [resonanceSummaries, selectedStar],
  );
  const selectedStarHasDistinctNote = useMemo(
    () => (selectedStar ? hasDistinctNote(selectedStar.note, selectedStar.title) : false),
    [selectedStar],
  );
  const selectedResonancePaths = useMemo(() => {
    if (!selectedStar || !selectedStarResonances) return [] as ResonancePath[];
    const byId = new Map(renderedStars.map((star) => [star.id, star]));
    const relations = new Map<string, { outgoing: boolean; incoming: boolean }>();

    selectedStarResonances.outgoing
      .filter((link) => link.sameSky)
      .forEach((link) => relations.set(link.starId, { ...(relations.get(link.starId) ?? { outgoing: false, incoming: false }), outgoing: true }));

    selectedStarResonances.incoming
      .filter((link) => link.sameSky)
      .forEach((link) => relations.set(link.starId, { ...(relations.get(link.starId) ?? { outgoing: false, incoming: false }), incoming: true }));

    return [...relations.entries()]
      .map(([targetId, relation]) => {
        const target = byId.get(targetId);
        if (!target) return null;
        return {
          from: { x: selectedStar.x, y: selectedStar.y },
          to: { x: target.x, y: target.y },
          path: linePath([
            { x: selectedStar.x, y: selectedStar.y },
            { x: target.x, y: target.y },
          ]),
          outgoing: relation.outgoing,
          incoming: relation.incoming,
          relation: relation.outgoing && relation.incoming ? "mutual" : relation.outgoing ? "outgoing" : "incoming",
        };
      })
      .filter((item): item is ResonancePath => Boolean(item?.path));
  }, [renderedStars, selectedStar, selectedStarResonances]);
  const visibleResonancePaths = useMemo(() => {
    if (!showResonances) return [] as ResonancePath[];
    if (selectedResonancePaths.length > 0) return selectedResonancePaths;

    const byId = new Map(renderedStars.map((star) => [star.id, star]));
    const seen = new Set<string>();
    const items: ResonancePath[] = [];

    renderedStars.forEach((star) => {
      const summary = resonanceSummaries.get(star.id);
      if (!summary) return;

      const outgoing = new Set(summary.outgoing.filter((link) => link.sameSky).map((link) => link.starId));
      const incoming = new Set(summary.incoming.filter((link) => link.sameSky).map((link) => link.starId));

      [...new Set([...outgoing, ...incoming])].forEach((targetId) => {
        if (targetId === star.id) return;
        const target = byId.get(targetId);
        if (!target) return;
        const pairKey = [star.id, targetId].sort().join("::");
        if (seen.has(pairKey)) return;
        seen.add(pairKey);

        const targetSummary = resonanceSummaries.get(targetId);
        const reverseOutgoing = Boolean(targetSummary?.outgoing.some((link) => link.sameSky && link.starId === star.id));
        const relation =
          (outgoing.has(targetId) && reverseOutgoing) || (outgoing.has(targetId) && incoming.has(targetId))
            ? "mutual"
            : outgoing.has(targetId)
              ? "outgoing"
              : "incoming";

        items.push({
          from: { x: star.x, y: star.y },
          to: { x: target.x, y: target.y },
          path: linePath([
            { x: star.x, y: star.y },
            { x: target.x, y: target.y },
          ]),
          outgoing: outgoing.has(targetId),
          incoming: reverseOutgoing || incoming.has(targetId),
          relation,
        });
      });
    });

    return items;
  }, [renderedStars, resonanceSummaries, selectedResonancePaths, showResonances]);
  const selectedResonanceStarIds = useMemo(() => {
    if (!selectedStarResonances) return new Set<string>();
    return new Set(
      [...selectedStarResonances.outgoing, ...selectedStarResonances.incoming].filter((link) => link.sameSky).map((link) => link.starId),
    );
  }, [selectedStarResonances]);
  const titleSides = useMemo(() => resolveTitleSides(renderedStars), [renderedStars]);
  const journalEntries = useMemo(() => [...renderedStars].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [renderedStars]);
  const skySummaries = useMemo(
    () =>
      skies.map((sky) => ({
        id: sky.id,
        stars: stars.filter((star) => star.skyId === sky.id).length,
        constellations: constellations.filter((item) => item.skyId === sky.id).length,
      })),
    [constellations, skies, stars],
  );
  const deleteTargetSky = useMemo(
    () => skies.find((sky) => sky.id === (pendingDeleteSkyId ?? activeSkyId)) ?? activeSky,
    [activeSky, activeSkyId, pendingDeleteSkyId, skies],
  );
  const deleteTargetStars = useMemo(() => stars.filter((star) => star.skyId === deleteTargetSky.id), [deleteTargetSky.id, stars]);
  const deleteTargetConstellations = useMemo(
    () => constellations.filter((item) => item.skyId === deleteTargetSky.id),
    [constellations, deleteTargetSky.id],
  );
  const moveTargets = useMemo(
    () =>
      selectedStar
        ? skies
            .filter((sky) => sky.id !== selectedStar.skyId)
            .map((sky) => {
              const used = stars.filter((star) => star.skyId === sky.id && star.id !== selectedStar.id).length;
              return { sky, used, full: used >= sky.capacity };
            })
        : [],
    [selectedStar, skies, stars],
  );
  const usedCapacity = activeStars.length + (birthEffect?.star.skyId === activeSkyId ? 1 : 0);
  const skyFull = usedCapacity >= activeSky.capacity;
  const showEmptySkyState = activeStars.length === 0 && (!birthEffect || birthEffect.star.skyId !== activeSkyId);
  const showSkyGuide = activeStars.length > 0 && !constellationMode && !selectedStarId && !birthEffect && !dismissedSkyGuides.includes(activeSkyId);
  const showPendingConnectionView =
    surfaceMode === "sky" &&
    inspectorHomeView === "neutral" &&
    !selectedStarId &&
    !composerOpen &&
    !constellationMode &&
    !editingSky &&
    !birthEffect;
  const canCreateStar =
    !birthEffect &&
    !skyFull &&
    sanitizeTitle(composer.title).length > 0 &&
    sanitizeTitle(composer.title).length <= MAX_TITLE &&
    composer.note.trim().length <= MAX_NOTE;
  const composerHasContent = Boolean(sanitizeTitle(composer.title) || sanitizeNote(composer.note));
  const skyEditorDirty = Boolean(
    editingSky &&
      skyEditor &&
      (sanitizeSkyName(skyEditor.name) !== sanitizeSkyName(activeSky.name) || skyEditor.theme !== activeSky.theme),
  );
  const starEditorDirty = Boolean(
    starEditor &&
      persistedSelectedStar &&
      (safeTitle(starEditor.title, starEditor.note) !== persistedSelectedStar.title ||
        sanitizeNote(starEditor.note) !== persistedSelectedStar.note ||
        starEditor.showTitle !== persistedSelectedStar.showTitle ||
        starEditor.color !== persistedSelectedStar.color ||
        normalizeCustomColor(starEditor.customColor) !== persistedSelectedStar.customColor ||
        starEditor.size !== persistedSelectedStar.size ||
        starEditor.shape !== persistedSelectedStar.shape),
  );
  const constellationDraftName = draftConstellationName.trim();
  const constellationDraftStarIds = Array.from(new Set(draftConstellationStarIds));
  const constellationDirty = Boolean(
    constellationMode &&
      (editingConstellation
        ? ((constellationDraftName || editingConstellation.name) !== editingConstellation.name ||
          !arraysEqual(constellationDraftStarIds, editingConstellation.starIds))
        : Boolean(constellationDraftName) || constellationDraftStarIds.length > 0),
  );
  const dirtyContext: "composer" | "sky" | "star" | "constellation" | null = starEditorDirty
    ? "star"
    : skyEditorDirty
      ? "sky"
      : constellationDirty
        ? "constellation"
        : composerHasContent
          ? "composer"
          : null;
  const canSaveDirtyContext =
    dirtyContext === "composer"
      ? composerHasContent && !skyFull
      : dirtyContext === "sky"
        ? skyEditorDirty
        : dirtyContext === "star"
          ? starEditorDirty
        : dirtyContext === "constellation"
            ? constellationDraftStarIds.length >= 2
            : false;
  const toolbarContextLabel = editingSelectedStar
    ? `Editar · ${safeTitle(starEditor?.title ?? selectedStar?.title ?? "", starEditor?.note ?? selectedStar?.note ?? "")}`
    : surfaceMode === "guide"
      ? "Guía y about"
      : surfaceMode === "journal"
      ? selectedStar
        ? selectedStar.title
        : "Diario"
      : editingSky
        ? "Editar cielo"
        : composerOpen
          ? "Nueva estrella"
          : constellationMode
            ? editingConstellation
              ? editingConstellation.name
              : "Nueva constelacion"
            : selectedStar
              ? selectedStar.title
              : "";
  const meditationPaused =
    composerOpen ||
    constellationMode ||
    editingSky ||
    editingSelectedStar ||
    Boolean(birthEffect) ||
    Boolean(overlayPanel) ||
    Boolean(draggingStarId);
  const meditationPool = useMemo(() => buildMeditationPool(renderedStars), [renderedStars]);
  const meditationRunning = meditationMode && surfaceMode === "sky" && !meditationPaused && meditationPool.length > 0;
  const meditationButtonText =
    activeStars.length === 0
      ? "☾ Sin estrellas"
      : meditationMode
        ? meditationRunning
          ? "☾ Salir de contemplacion"
          : "☾ Contemplacion en pausa"
        : "☾ Contemplar";
  const inspectorEditingMode = composerOpen || constellationMode || editingSky || editingSelectedStar;
  const storageSourceText =
    storageSource === "indexeddb"
      ? "IndexedDB"
      : storageSource === "localStorage"
        ? "Local del navegador"
        : storageSource === "recovery"
          ? "Copia de recuperacion"
          : storageSource === "history"
            ? "Historial local"
            : "Atlas base";
  const toolbarDateText = TOOLBAR_DAY_FORMAT.format(currentMoment);
  const toolbarTimeText = TOOLBAR_TIME_FORMAT.format(currentMoment);
  const toolbarMoonTags = moonPhaseTags(moonPhase.key);
  const storageOriginText = typeof window !== "undefined" ? window.location.origin : "";
  const selectedResonanceActive = showResonances && Boolean(selectedStarId) && selectedResonanceStarIds.size > 0;
  const meditationLines = useMemo(() => {
    if (!meditationRunning || meditationPool.length === 0) return [] as MeditationLine[];

    const phrase = meditationPool[meditationCycle % meditationPool.length];
    const topSlots = [32, 48, 64];
    return [
      {
        ...phrase,
        key: `flow-${meditationCycle}-${phrase.id}`,
        top: topSlots[meditationCycle % topSlots.length],
        motion: "flow",
        delay: 0,
        duration: phrase.emphasis === "note" ? 40 : 34,
      },
    ];
  }, [meditationCycle, meditationPool, meditationRunning]);

  const constellationPaths = useMemo(
    () =>
      activeConstellations
        .map((item) => item.starIds.map((id) => renderedStars.find((star) => star.id === id)).filter(Boolean) as Star[])
        .map((group) => linePath(group.map((star) => ({ x: star.x, y: star.y }))))
        .filter(Boolean),
    [activeConstellations, renderedStars],
  );

  const draftPath = useMemo(() => {
    const selected = draftConstellationStarIds
      .map((id) => renderedStars.find((star) => star.id === id))
      .filter((star): star is Star => Boolean(star));
    return linePath(selected.map((star) => ({ x: star.x, y: star.y })));
  }, [draftConstellationStarIds, renderedStars]);

  useEffect(() => {
    renderedStarsRef.current = renderedStars;
  }, [renderedStars]);

  useEffect(() => {
    activeConstellationsRef.current = activeConstellations;
  }, [activeConstellations]);

  useEffect(() => {
    if (surfaceMode !== "journal") return;
    if (journalEntries.length === 0) return;
    if (!selectedStarId || !journalEntries.some((star) => star.id === selectedStarId)) {
      setSelectedStarId(journalEntries[0].id);
    }
  }, [journalEntries, selectedStarId, surfaceMode]);

  useEffect(() => {
    if (!pendingSkySelectionId) return;
    const movedStar = stars.find((star) => star.id === pendingSkySelectionId && star.skyId === activeSkyId);
    if (!movedStar) return;
    setSelectedStarId(movedStar.id);
    setPendingSkySelectionId(null);
  }, [activeSkyId, pendingSkySelectionId, stars]);

  useEffect(() => {
    const activeTab = skyRailRef.current?.querySelector<HTMLButtonElement>(`[data-sky-id="${activeSkyId}"]`);
    activeTab?.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
  }, [activeSkyId]);

  useEffect(() => {
    if (!meditationRunning) return;
    const timer = window.setInterval(() => {
      setMeditationCycle((current) => current + 1);
    }, 44000);
    return () => window.clearInterval(timer);
  }, [meditationRunning]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentMoment(new Date());
    }, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (target.closest(".sky-tab-menu") || target.closest(".sky-tab-menu-button")) return;
      setSkyMenuId(null);
      setSkyMenuCoords(null);
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  function replaceAtlas(nextState: AtlasState) {
    setSkies(nextState.skies);
    setStars(nextState.stars);
    setConstellations(nextState.constellations);
    setActiveSkyId(nextState.activeSkyId);
    setLabelMode(nextState.labelMode);
    setComposerOpen(false);
    setSelectedStarId(null);
    setStarEditor(null);
    setConstellationMode(false);
    setEditingConstellationId(null);
    setDraftConstellationName("");
    setDraftConstellationStarIds([]);
    setPendingConstellationJoin(null);
    setOverlayPanel(null);
    setInspectorHomeView("neutral");
  }

  function updateStar(id: string, updater: (star: Star) => Star) {
    setStars((current) => current.map((star) => (star.id === id ? updater(star) : star)));
  }

  function updateSky(updater: (sky: Sky) => Sky) {
    setSkies((current) => current.map((sky) => (sky.id === activeSkyId ? updater(sky) : sky)));
  }

  function updateSkyById(id: string, updater: (sky: Sky) => Sky) {
    setSkies((current) => current.map((sky) => (sky.id === id ? updater(sky) : sky)));
  }

  function clearTransientPanels(nextSurfaceMode: SurfaceMode = "sky", options?: { preserveSelection?: boolean }) {
    setSurfaceMode(nextSurfaceMode);
    if (!options?.preserveSelection) setSelectedStarId(null);
    setStarEditor(null);
    setEditingSky(false);
    setSkyEditor(null);
    setComposerOpen(false);
    setComposer({ title: "", note: "", constellationId: "" });
    setConstellationMode(false);
    setEditingConstellationId(null);
    setDraftConstellationName("");
    setDraftConstellationStarIds([]);
    setSkyMenuId(null);
    setPendingConstellationJoin(null);
    setPendingConstellationId(null);
  }

  function commitComposerStar(options?: { animate?: boolean; select?: boolean }) {
    const shouldAnimate = options?.animate ?? true;
    const shouldSelect = options?.select ?? true;
    if (!composerHasContent || skyFull) return false;

    const title = safeTitle(composer.title, composer.note);
    const note = sanitizeNote(composer.note);
    const targetConstellationId =
      composer.constellationId && activeConstellations.some((constellation) => constellation.id === composer.constellationId)
        ? composer.constellationId
        : null;
    const visualIndex = activeStars.length;
    const visual = {
      color: COLORS[visualIndex % COLORS.length],
      size: SIZES[visualIndex % SIZES.length],
      shape: SHAPES[visualIndex % SHAPES.length],
    };
    const spot = findSpot(title, activeStars);
    const nextStar: Star = {
      id: crypto.randomUUID(),
      skyId: activeSkyId,
      createdAt: new Date().toISOString(),
      title,
      note,
      showTitle: true,
      color: visual.color,
      customColor: null,
      size: visual.size,
      shape: visual.shape,
      x: spot.x,
      y: spot.y,
    };

    if (shouldAnimate) {
      setBirthEffect({
        star: nextStar,
        startX: 50,
        startY: 90,
        constellationId: targetConstellationId,
      });
    } else {
      setStars((current) => [...current, nextStar]);
      if (targetConstellationId) {
        setConstellations((current) =>
          current.map((constellation) =>
            constellation.id === targetConstellationId && !constellation.starIds.includes(nextStar.id)
              ? { ...constellation, starIds: [...constellation.starIds, nextStar.id] }
              : constellation,
          ),
        );
      }
      if (shouldSelect) setSelectedStarId(nextStar.id);
    }

    setComposer({ title: "", note: "", constellationId: "" });
    setComposerOpen(false);
    return true;
  }

  function executePendingNavigation(action: PendingNavigation) {
    setPendingNavigation(null);
    setOverlayPanel(null);

    if (action.type === "show-sky-root") {
      setInspectorHomeView("sky");
      clearTransientPanels("sky");
      return;
    }

    if (action.skyId === activeSkyId) {
      setInspectorHomeView("sky");
      if (action.afterSwitch?.mode === "composer") {
        focusComposer();
        return;
      }
      if (action.afterSwitch?.mode === "constellation") {
        startConstellationMode();
        return;
      }
      if (action.selectStarId) {
        setSelectedStarId(action.selectStarId);
      }
      clearTransientPanels(action.surfaceMode, { preserveSelection: action.surfaceMode === "journal" });
      return;
    }

    setSurfaceMode(action.surfaceMode);
    setInspectorHomeView("sky");
    setPendingSkyAction(action.afterSwitch ?? null);
    setPendingSkySelectionId(action.selectStarId ?? null);
    setActiveSkyId(action.skyId);
    setSkyMenuId(null);
  }

  function requestNavigation(action: PendingNavigation) {
    if (dirtyContext) {
      setPendingNavigation(action);
      setSkyMenuId(null);
      setOverlayPanel("unsaved-changes");
      return;
    }
    executePendingNavigation(action);
  }

  function jumpToResonance(link: ResonanceLink) {
    requestNavigation({
      type: "activate-sky",
      skyId: link.skyId,
      surfaceMode,
      selectStarId: link.starId,
    });
  }

  function discardCurrentChanges() {
    if (dirtyContext === "composer") {
      setComposer({ title: "", note: "", constellationId: "" });
      setComposerOpen(false);
      return;
    }
    if (dirtyContext === "sky") {
      cancelSkyEditor();
      return;
    }
    if (dirtyContext === "star") {
      cancelStarEditor();
      return;
    }
    if (dirtyContext === "constellation") {
      resetConstellationDraft(true);
    }
  }

  function saveCurrentChanges() {
    if (dirtyContext === "composer") return commitComposerStar({ animate: false, select: false });
    if (dirtyContext === "sky") {
      saveSkyEditor();
      return true;
    }
    if (dirtyContext === "star") {
      saveStarEditor();
      return true;
    }
    if (dirtyContext === "constellation" && constellationDraftStarIds.length >= 2) {
      saveConstellation();
      return true;
    }
    return false;
  }

  function reorderSkies(fromId: string, toId: string) {
    if (fromId === toId) return;
    setSkies((current) => {
      const fromIndex = current.findIndex((sky) => sky.id === fromId);
      const toIndex = current.findIndex((sky) => sky.id === toId);
      if (fromIndex === -1 || toIndex === -1) return current;
      const next = [...current];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }

  function requestDeleteSky(skyId: string) {
    setSkyMenuId(null);
    setSkyMenuCoords(null);
    setPendingDeleteSkyId(skyId);
    setOverlayPanel("delete-sky");
  }

  function deletePendingSky() {
    const targetSkyId = pendingDeleteSkyId ?? activeSkyId;
    if (skies.length <= 1) {
      closeOverlay();
      return;
    }

    const remainingSkies = skies.filter((sky) => sky.id !== targetSkyId);
    const nextSky = remainingSkies[0];
    if (!nextSky) return;

    setSkies(remainingSkies);
    setStars((current) => current.filter((star) => star.skyId !== targetSkyId));
    setConstellations((current) => current.filter((item) => item.skyId !== targetSkyId));
    setBirthEffect((current) => (current?.star.skyId === targetSkyId ? null : current));
    setPendingConstellationJoin(null);

    if (activeSkyId === targetSkyId) {
      setActiveSkyId(nextSky.id);
      setInspectorHomeView("neutral");
      setSelectedStarId(null);
      setStarEditor(null);
      setConstellationMode(false);
      setEditingConstellationId(null);
      setDraftConstellationName("");
      setDraftConstellationStarIds([]);
      setEditingSky(false);
      setSkyEditor(null);
      setComposerOpen(false);
    }

    closeOverlay();
  }

  function deleteSelectedStar() {
    if (!selectedStar) {
      setOverlayPanel(null);
      return;
    }

    setStars((current) => current.filter((star) => star.id !== selectedStar.id));
    setConstellations((current) =>
      current
        .map((constellation) =>
          constellation.starIds.includes(selectedStar.id)
            ? { ...constellation, starIds: constellation.starIds.filter((id) => id !== selectedStar.id) }
            : constellation,
        )
        .filter((constellation) => constellation.starIds.length >= 2),
    );
    setSelectedStarId(null);
    setStarEditor(null);
    setOverlayPanel(null);
  }

  function deletePendingConstellation() {
    if (!pendingConstellationId) {
      setOverlayPanel(null);
      return;
    }
    setConstellations((current) => current.filter((constellation) => constellation.id !== pendingConstellationId));
    setPendingConstellationId(null);
    setOverlayPanel(null);
  }

  function confirmImportAtlas() {
    if (!pendingImportState) {
      setOverlayPanel(null);
      return;
    }
    replaceAtlas(pendingImportState);
    setPendingImportState(null);
    setImportMessage("Atlas importado correctamente.");
    setOverlayPanel(null);
  }

  function closeOverlay() {
    setOverlayPanel(null);
    setPendingConstellationId(null);
    setPendingImportState(null);
    setPendingConstellationJoin(null);
    setMoveTargetSkyId("");
    setNewSkyName("");
    setPendingNavigation(null);
    setPendingDeleteSkyId(null);
  }

  function resetConstellationDraft(closeMode = false) {
    setEditingConstellationId(null);
    setDraftConstellationName("");
    setDraftConstellationStarIds([]);
    if (closeMode) setConstellationMode(false);
  }

  function handleCreateSky() {
    setNewSkyName(`Cielo ${skies.length + 1}`);
    setOverlayPanel("create-sky");
  }

  function confirmCreateSky() {
    const name = sanitizeSkyName(newSkyName) || `Cielo ${skies.length + 1}`;
    setSurfaceMode("sky");
    const nextSky: Sky = {
      id: crypto.randomUUID(),
      name: name.trim(),
      createdAt: new Date().toISOString(),
      capacity: 16,
      theme: nextTheme(skies),
      showTitles: true,
    };
    setSkies((current) => [...current, nextSky]);
    setActiveSkyId(nextSky.id);
    setInspectorHomeView("sky");
    setDismissedSkyGuides((current) => current.filter((skyId) => skyId !== nextSky.id));
    closeOverlay();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canCreateStar) return;
    commitComposerStar({ animate: true, select: true });
  }

  function handleStarPointerDown(event: ReactPointerEvent<HTMLButtonElement>, star: Star) {
    event.stopPropagation();
    setDismissedSkyGuides((current) => (current.includes(activeSkyId) ? current : [...current, activeSkyId]));
    setComposerOpen(false);
    if (constellationMode) {
      event.preventDefault();
      setDraftConstellationStarIds((current) => (current.includes(star.id) ? current.filter((id) => id !== star.id) : [...current, star.id]));
      return;
    }
    if (event.button !== 0) return;
    event.preventDefault();
    setStarEditor(null);
    event.currentTarget.setPointerCapture?.(event.pointerId);
    dragSessionRef.current = {
      starId: star.id,
      startClientX: event.clientX,
      startClientY: event.clientY,
      originX: star.x,
      originY: star.y,
      moved: false,
    };
  }

  function handleStarKeyDown(event: KeyboardEvent<HTMLButtonElement>, star: Star) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    if (constellationMode) {
      setDraftConstellationStarIds((current) => (current.includes(star.id) ? current.filter((id) => id !== star.id) : [...current, star.id]));
      return;
    }
    setSelectedStarId(star.id);
    setStarEditor(null);
  }

  function handleSkyBackgroundPointerDown() {
    if (constellationMode) return;
    setSelectedStarId(null);
    setStarEditor(null);
    setInspectorHomeView("sky");
  }

  function focusComposer() {
    setSurfaceMode("sky");
    setDismissedSkyGuides((current) => (current.includes(activeSkyId) ? current : [...current, activeSkyId]));
    setSelectedStarId(null);
    setStarEditor(null);
    setEditingSky(false);
    setSkyEditor(null);
    setComposerOpen(true);
    setConstellationMode(false);
    setEditingConstellationId(null);
    setDraftConstellationName("");
    setDraftConstellationStarIds([]);
    setInspectorHomeView("neutral");
    window.setTimeout(() => composerTitleRef.current?.focus(), 0);
  }

  function openJournal() {
    setSurfaceMode("journal");
    setDismissedSkyGuides((current) => (current.includes(activeSkyId) ? current : [...current, activeSkyId]));
    setComposerOpen(false);
    setConstellationMode(false);
    setEditingConstellationId(null);
    setDraftConstellationName("");
    setDraftConstellationStarIds([]);
    setStarEditor(null);
    if (!selectedStarId && journalEntries[0]) {
      setSelectedStarId(journalEntries[0].id);
    }
  }

  function beginEditSky() {
    setSurfaceMode("sky");
    setInspectorHomeView("sky");
    setSelectedStarId(null);
    setStarEditor(null);
    setComposerOpen(false);
    setConstellationMode(false);
    setEditingConstellationId(null);
    setDraftConstellationName("");
    setDraftConstellationStarIds([]);
    setEditingSky(true);
    setSkyEditor({
      name: activeSky.name,
      theme: activeSky.theme,
    });
  }

  function cancelSkyEditor() {
    setEditingSky(false);
    setSkyEditor(null);
  }

  function saveSkyEditor() {
    if (!skyEditor) return;
    updateSky((current) => ({
      ...current,
      name: sanitizeSkyName(skyEditor.name),
      theme: skyEditor.theme,
    }));
    setEditingSky(false);
    setSkyEditor(null);
  }

  function beginEditSelectedStar() {
    if (!selectedStar) return;
    setEditingSky(false);
    setSkyEditor(null);
    setStarSymbolPickerOpen(false);
    setStarEditor({
      id: selectedStar.id,
      title: selectedStar.title,
      note: selectedStar.note,
      showTitle: selectedStar.showTitle,
      color: selectedStar.color,
      customColor: selectedStar.customColor,
      size: selectedStar.size,
      shape: selectedStar.shape,
    });
  }

  function cancelStarEditor() {
    setStarSymbolPickerOpen(false);
    setStarEditor(null);
  }

  function saveStarEditor() {
    if (!starEditor) return;
    updateStar(starEditor.id, (current) => ({
      ...current,
      title: safeTitle(starEditor.title, starEditor.note),
      note: sanitizeNote(starEditor.note),
      showTitle: starEditor.showTitle,
      color: starEditor.color,
      customColor: starEditor.color === "custom" ? normalizeCustomColor(starEditor.customColor) ?? "#ff8dc9" : null,
      size: starEditor.size,
      shape: starEditor.shape,
    }));
    setStarSymbolPickerOpen(false);
    setStarEditor(null);
  }

  const editorPreviewTitle = starEditor ? safeTitle(starEditor.title, starEditor.note) : "";
  const editorPreviewNote = starEditor ? sanitizeNote(starEditor.note) : "";

  function renderResonantText(value: string) {
    const tokens = Array.from(value.matchAll(/\{([^{}]+)\}/g));
    if (tokens.length === 0) return value;

    const parts: React.ReactNode[] = [];
    let cursor = 0;
    tokens.forEach((match, index) => {
      const start = match.index ?? 0;
      const end = start + match[0].length;
      const title = sanitizeTitle(match[1] ?? "");

      if (start > cursor) {
        parts.push(<span key={`text-${index}-${cursor}`}>{value.slice(cursor, start)}</span>);
      }

      parts.push(
        <span key={`resonance-${index}-${start}`} className="resonance-inline">
          {title || match[1]}
        </span>,
      );
      cursor = end;
    });

    if (cursor < value.length) {
      parts.push(<span key={`tail-${cursor}`}>{value.slice(cursor)}</span>);
    }

    return parts;
  }

  function renderResonanceSection(summary: ResonanceSummary | null) {
    if (!summary) return null;
    const hasItems = summary.outgoing.length > 0 || summary.incoming.length > 0 || summary.unresolved.length > 0;
    if (!hasItems) return null;

    return (
      <section className="resonance-section">
        <p className="panel-label">Resonancias</p>

        {summary.outgoing.length > 0 ? (
          <div className="resonance-group-list">
            <strong className="resonance-group-title">Apunta a</strong>
            <div className="resonance-chip-list">
              {summary.outgoing.map((link) => (
                <button
                  key={`out-${link.starId}`}
                  className={`resonance-chip resonance-chip-button${link.sameSky ? "" : " resonance-chip-other"}`}
                  onClick={() => jumpToResonance(link)}
                  type="button"
                >
                  {link.title}
                  {!link.sameSky ? <small>{link.skyName}</small> : null}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {summary.incoming.length > 0 ? (
          <div className="resonance-group-list">
            <strong className="resonance-group-title">Aparece en</strong>
            <div className="resonance-chip-list">
              {summary.incoming.map((link) => (
                <button
                  key={`in-${link.starId}`}
                  className={`resonance-chip resonance-chip-button resonance-chip-incoming${link.sameSky ? "" : " resonance-chip-other"}`}
                  onClick={() => jumpToResonance(link)}
                  type="button"
                >
                  {link.title}
                  {!link.sameSky ? <small>{link.skyName}</small> : null}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {summary.unresolved.length > 0 ? (
          <div className="resonance-group-list">
            <strong className="resonance-group-title">Sin resolver</strong>
            <div className="resonance-chip-list">
              {summary.unresolved.map((item) => (
                <span key={`missing-${item}`} className="resonance-chip resonance-chip-missing">
                  {item}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </section>
    );
  }

  function insertSymbolIntoStarNote(symbol: string) {
    if (!starEditor) return;

    const textarea = starNoteTextareaRef.current;
    const currentNote = starEditor.note;
    const selectionStart = textarea?.selectionStart ?? currentNote.length;
    const selectionEnd = textarea?.selectionEnd ?? currentNote.length;
    const nextNote = `${currentNote.slice(0, selectionStart)}${symbol}${currentNote.slice(selectionEnd)}`;

    setStarEditor((current) => (current ? { ...current, note: nextNote } : current));

    window.requestAnimationFrame(() => {
      const input = starNoteTextareaRef.current;
      if (!input) return;
      const nextCursor = selectionStart + symbol.length;
      input.focus();
      input.setSelectionRange(nextCursor, nextCursor);
    });
  }

  function renderStarEditorForm(prefix: string) {
    if (!starEditor) return null;

    return (
      <div className="editor-shell">
        <section className="editor-section">
          <div className="editor-section-head">
            <span className="editor-label">Contenido</span>
          </div>

          <label htmlFor={`${prefix}-edit-title`}>Titulo</label>
          <input
            id={`${prefix}-edit-title`}
            maxLength={MAX_TITLE}
            type="text"
            value={starEditor.title}
            onChange={(event) => setStarEditor((current) => (current ? { ...current, title: event.target.value } : current))}
          />

          <div className="editor-note-head">
            <label htmlFor={`${prefix}-edit-note`}>Nota</label>
            <button
              className={`mini-tool-button editor-symbol-trigger${starSymbolPickerOpen ? " editor-symbol-trigger-active" : ""}`}
              onClick={() => setStarSymbolPickerOpen((current) => !current)}
              type="button"
            >
              ✦ Símbolos
            </button>
          </div>
          {starSymbolPickerOpen ? (
            <div className="editor-symbol-picker" role="group" aria-label="Insertar símbolos en la nota">
              {STAR_NOTE_SYMBOLS.map((symbol) => (
                <button
                  key={symbol}
                  className="editor-symbol-chip"
                  onClick={() => insertSymbolIntoStarNote(symbol)}
                  type="button"
                >
                  {symbol}
                </button>
              ))}
            </div>
          ) : null}
          <textarea
            id={`${prefix}-edit-note`}
            maxLength={MAX_NOTE}
            ref={starNoteTextareaRef}
            rows={6}
            value={starEditor.note}
            onChange={(event) => setStarEditor((current) => (current ? { ...current, note: event.target.value } : current))}
          />

          <div className="field-meta">
            <span className={starEditor.title.length > SOFT_TITLE ? "field-warning" : ""}>Titulo {starEditor.title.length}/{MAX_TITLE}</span>
            <span className={starEditor.note.length > SOFT_NOTE ? "field-warning" : ""}>Nota {starEditor.note.length}/{MAX_NOTE}</span>
          </div>
        </section>

        <section className="editor-section">
          <div className="editor-section-head">
            <span className="editor-label">Aspecto</span>
          </div>

          <div className="swatch-row">
            {COLORS.map((color) => (
              <button
                key={color}
                aria-label={`Color ${toneText(color)}`}
                aria-pressed={starEditor.color === color}
                className={`swatch-button swatch-${color}${starEditor.color === color ? " swatch-button-active" : ""}`}
                onClick={() => setStarEditor((current) => (current ? { ...current, color, customColor: current.customColor } : current))}
                title={toneText(color)}
                type="button"
              />
            ))}
          </div>

          <div className="editor-custom-row">
            <label htmlFor={`${prefix}-custom-color`}>Color personalizado</label>
            <input
              className="editor-color-picker"
              id={`${prefix}-custom-color`}
              type="color"
              value={starEditor.customColor ?? "#ff8dc9"}
              onChange={(event) => setStarEditor((current) => (current ? { ...current, color: "custom", customColor: event.target.value } : current))}
            />
          </div>

          <div className="editor-select-grid">
            <div className="editor-select-field">
              <label htmlFor={`${prefix}-edit-shape`}>Forma</label>
              <select
                id={`${prefix}-edit-shape`}
                value={starEditor.shape}
                onChange={(event) => setStarEditor((current) => (current ? { ...current, shape: event.target.value as StarShape } : current))}
              >
                {EDITOR_SHAPES.map((shape) => (
                  <option key={shape} value={shape}>
                    {shapeText(shape)}
                  </option>
                ))}
              </select>
            </div>

            <div className="editor-select-field">
              <label htmlFor={`${prefix}-edit-size`}>Tamano</label>
              <select
                id={`${prefix}-edit-size`}
                value={starEditor.size}
                onChange={(event) => setStarEditor((current) => (current ? { ...current, size: event.target.value as StarSize } : current))}
              >
                {EDITOR_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {sizeText(size)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="editor-section">
          <div className="editor-section-head">
            <span className="editor-label">Visibilidad</span>
          </div>

          <button
            className={`inline-toggle${starEditor.showTitle ? " inline-toggle-active" : ""}`}
            onClick={() => setStarEditor((current) => (current ? { ...current, showTitle: !current.showTitle } : current))}
            type="button"
          >
            {starEditor.showTitle ? "Ocultar titulo en el cielo" : "Mostrar titulo en el cielo"}
          </button>
        </section>

        <section className="editor-preview-card editor-preview-card-final">
          <div className="editor-section-head">
            <span className="editor-label">Vista previa</span>
          </div>

          <div className="editor-preview-scene">
            <span
              className={`atlas-star editor-preview-star atlas-star-${starEditor.size} atlas-star-${starEditor.shape}`}
              style={{ color: starColorValue(starEditor.color, starEditor.customColor) }}
            />
            <div className="editor-preview-copy">
              <strong>{editorPreviewTitle}</strong>
              <span>{excerpt(editorPreviewNote || editorPreviewTitle, 72)}</span>
            </div>
          </div>
        </section>

        <div className="button-row button-row-editor">
          <button className="toolbar-button toolbar-button-primary" onClick={saveStarEditor} type="button">
            Guardar cambios
          </button>
          <button className="toolbar-button toolbar-button-ghost" onClick={cancelStarEditor} type="button">
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  function saveConstellation() {
    if (draftConstellationStarIds.length < 2) return;
    if (editingConstellationId) {
      setConstellations((current) =>
        current.map((constellation) =>
          constellation.id === editingConstellationId
            ? {
                ...constellation,
                name: draftConstellationName.trim() || constellation.name,
                starIds: Array.from(new Set(draftConstellationStarIds)),
              }
            : constellation,
        ),
      );
    } else {
      setConstellations((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          skyId: activeSkyId,
          name: draftConstellationName.trim() || `Constelacion ${activeConstellations.length + 1}`,
          starIds: Array.from(new Set(draftConstellationStarIds)),
        },
      ]);
    }
    resetConstellationDraft(true);
  }

  function startConstellationMode() {
    setSurfaceMode("sky");
    setDismissedSkyGuides((current) => (current.includes(activeSkyId) ? current : [...current, activeSkyId]));
    setConstellationMode(true);
    setComposerOpen(false);
    setSelectedStarId(null);
    setStarEditor(null);
    resetConstellationDraft();
  }

  function beginEditConstellation(constellationId: string) {
    const target = activeConstellations.find((constellation) => constellation.id === constellationId);
    if (!target) return;
    setSurfaceMode("sky");
    setDismissedSkyGuides((current) => (current.includes(activeSkyId) ? current : [...current, activeSkyId]));
    setConstellationMode(true);
    setComposerOpen(false);
    setSelectedStarId(null);
    setStarEditor(null);
    setEditingConstellationId(target.id);
    setDraftConstellationName(target.name);
    setDraftConstellationStarIds(target.starIds);
  }

  function joinStarToConstellation(constellationId: string, starId: string) {
    setConstellations((current) =>
      current.map((constellation) =>
        constellation.id === constellationId && !constellation.starIds.includes(starId)
          ? { ...constellation, starIds: [...constellation.starIds, starId] }
          : constellation,
      ),
    );
  }

  function confirmJoinConstellation() {
    if (!pendingConstellationJoin) {
      closeOverlay();
      return;
    }
    joinStarToConstellation(pendingConstellationJoin.constellationId, pendingConstellationJoin.starId);
    setSelectedStarId(pendingConstellationJoin.starId);
    setPendingConstellationJoin(null);
    setOverlayPanel(null);
  }

  function removeStarFromConstellation(constellationId: string, starId: string) {
    setConstellations((current) =>
      current
        .map((constellation) =>
          constellation.id === constellationId
            ? { ...constellation, starIds: constellation.starIds.filter((id) => id !== starId) }
            : constellation,
        )
        .filter((constellation) => constellation.starIds.length >= 2),
    );
  }

  function toggleSkyTitles(skyId: string) {
    updateSkyById(skyId, (current) => ({ ...current, showTitles: !current.showTitles }));
    setSkyMenuId(null);
    setSkyMenuCoords(null);
  }

  function openSkyMenuAction(skyId: string, mode: "composer" | "constellation") {
    setSkyMenuId(null);
    setSkyMenuCoords(null);
    requestNavigation({ type: "activate-sky", skyId, afterSwitch: { skyId, mode }, surfaceMode: "sky" });
  }

  function handleSkyDragStart(event: ReactDragEvent<HTMLDivElement>, skyId: string) {
    setDraggedSkyId(skyId);
    setDropSkyId(skyId);
    setSkyMenuId(null);
    setSkyMenuCoords(null);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", skyId);
  }

  function handleSkyDragOver(event: ReactDragEvent<HTMLDivElement>, skyId: string) {
    event.preventDefault();
    if (draggedSkyId && draggedSkyId !== skyId) {
      setDropSkyId(skyId);
    }
  }

  function handleSkyDrop(event: ReactDragEvent<HTMLDivElement>, skyId: string) {
    event.preventDefault();
    const sourceId = draggedSkyId || event.dataTransfer.getData("text/plain");
    if (sourceId) {
      reorderSkies(sourceId, skyId);
    }
    setDraggedSkyId(null);
    setDropSkyId(null);
  }

  function handleSkyDragEnd() {
    setDraggedSkyId(null);
    setDropSkyId(null);
  }

  function exportAtlas() {
    const payload = {
      version: 4,
      exportedAt: new Date().toISOString(),
      data: {
        skies,
        stars,
        constellations,
        activeSkyId,
        labelMode,
      },
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `atlas-de-luz-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setImportMessage("Copia exportada como archivo .json");
  }

  async function handleImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const raw = JSON.parse(await file.text());
      const nextState = normalizeAtlasState(raw);
      if (!nextState) throw new Error("Archivo no compatible");
      setPendingImportState(nextState);
      setOverlayPanel("confirm-import");
    } catch {
      setImportMessage("No pude leer ese archivo. Prueba con un backup exportado por Setestrelo.");
    }
  }

  function requestDeleteConstellation(id: string) {
    setPendingConstellationId(id);
    setOverlayPanel("delete-constellation");
  }

  function requestMoveSelectedStar() {
    if (!selectedStar) return;
    const firstAvailable = moveTargets.find((target) => !target.full)?.sky.id ?? "";
    setMoveTargetSkyId(firstAvailable);
    setOverlayPanel("move-star");
  }

  function moveSelectedStar() {
    if (!selectedStar || !moveTargetSkyId) {
      closeOverlay();
      return;
    }

    const destination = skies.find((sky) => sky.id === moveTargetSkyId);
    if (!destination || destination.id === selectedStar.skyId) {
      closeOverlay();
      return;
    }

    const destinationStars = stars.filter((star) => star.skyId === destination.id && star.id !== selectedStar.id);
    if (destinationStars.length >= destination.capacity) return;

    const nextSpot = findSpot(selectedStar.title, destinationStars);
    setStars((current) =>
      current.map((star) =>
        star.id === selectedStar.id
          ? { ...star, skyId: destination.id, x: nextSpot.x, y: nextSpot.y }
          : star,
      ),
    );
    setConstellations((current) =>
      current
        .map((constellation) =>
          constellation.starIds.includes(selectedStar.id)
            ? { ...constellation, starIds: constellation.starIds.filter((id) => id !== selectedStar.id) }
            : constellation,
        )
        .filter((constellation) => constellation.starIds.length >= 2),
    );
    setSurfaceMode("sky");
    setActiveSkyId(destination.id);
    setPendingSkySelectionId(selectedStar.id);
    setDismissedSkyGuides((current) => (current.includes(destination.id) ? current : [...current, destination.id]));
    closeOverlay();
  }

  return (
    <main className="app-shell" data-surface={surfaceMode}>
      <header className="top-toolbar">
        <div className="brand-block">
          <div className="brand-mark" aria-hidden="true">
            <span className="brand-mark-star">✷</span>
          </div>
          <div className="brand-copy">
            <p className="eyebrow">Setestrelo</p>
            <strong>Diario de cielos</strong>
          </div>
        </div>

        <div className="toolbar-trail" aria-label="Ubicacion actual">
          <div className="toolbar-context">
            <div className="toolbar-trail-main">
              <button
                className={`toolbar-trail-link${toolbarContextLabel ? "" : " toolbar-trail-link-static"}`}
                disabled={!toolbarContextLabel}
                onClick={() => requestNavigation({ type: "show-sky-root" })}
                type="button"
              >
                {displaySkyName(activeSky.name)}
              </button>
              {toolbarContextLabel ? (
                <>
                  <span className="toolbar-trail-separator" aria-hidden="true">
                    {"\u203A"}
                  </span>
                  <span className="toolbar-trail-current">{toolbarContextLabel}</span>
                </>
              ) : null}
            </div>
            <div className="toolbar-meta" aria-label="Fecha, hora y luna actual">
              <span className="toolbar-meta-item">{toolbarDateText}</span>
              <span className="toolbar-meta-item">{toolbarTimeText}</span>
              <span className="toolbar-meta-phase">{moonPhase.name}</span>
              <div className="toolbar-meta-tags" aria-label="Palabras asociadas a la fase lunar">
                {toolbarMoonTags.map((tag) => (
                  <span key={tag} className="toolbar-meta-tag">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="toolbar-actions">
          {surfaceMode === "sky" ? (
            <div className={`toolbar-viewport-wrap${viewportControlsOpen ? " toolbar-viewport-wrap-open" : ""}`}>
              <button
                className={`toolbar-button toolbar-button-ghost toolbar-viewport-trigger${viewportControlsOpen ? " toolbar-button-active" : ""}`}
                onClick={() => setViewportControlsOpen((current) => !current)}
                type="button"
              >
                {viewportControlsOpen ? "✕ Visor" : "☰ Visor"}
              </button>
              {viewportControlsOpen ? (
                <div className="toolbar-viewport-panel">
                  <button
                    className={`toolbar-button toolbar-button-ghost toolbar-viewport-toggle${activeSky.showTitles ? " toolbar-button-active" : ""}`}
                    onClick={() => toggleSkyTitles(activeSkyId)}
                    type="button"
                  >
                    {activeSky.showTitles ? "🏷 Titulos on" : "🏷 Titulos off"}
                  </button>
                  <button
                    className={`toolbar-button toolbar-button-ghost toolbar-viewport-toggle${showConstellations ? " toolbar-button-active" : ""}`}
                    onClick={() => setShowConstellations((current) => !current)}
                    type="button"
                  >
                    {showConstellations ? "☄ Constelaciones on" : "☄ Constelaciones off"}
                  </button>
                  <button
                    className={`toolbar-button toolbar-button-ghost toolbar-viewport-toggle${showResonances ? " toolbar-button-active" : ""}`}
                    onClick={() => setShowResonances((current) => !current)}
                    type="button"
                  >
                    {showResonances ? "↔ Resonancias on" : "↔ Resonancias off"}
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
          <button
            className={`toolbar-button toolbar-button-violet${surfaceMode === "journal" ? " toolbar-button-active" : ""}`}
            onClick={() => (surfaceMode === "journal" ? setSurfaceMode("sky") : openJournal())}
            type="button"
          >
            {surfaceMode === "journal" ? "\u{1F30C} Cielo" : "\u{1F4DD} Diario"}
          </button>
          <button
            className={`toolbar-button toolbar-button-help${surfaceMode === "guide" ? " toolbar-button-active" : ""}`}
            onClick={() => setSurfaceMode((current) => (current === "guide" ? "sky" : "guide"))}
            type="button"
          >
            {surfaceMode === "guide" ? "✕ Guía" : "\u2754 Ayuda"}
          </button>
          <button className="toolbar-button toolbar-button-gold" onClick={() => setOverlayPanel("backup")} type="button">
            {"\u2B07 Backup"}
          </button>
        </div>
      </header>

      {storageNotice ? (
        <section className="storage-notice">
          <p>{storageNotice}</p>
          <button className="mini-tool-button" onClick={() => setStorageNotice("")} type="button">
            Entendido
          </button>
        </section>
      ) : null}

      <div className="atlas-layout">
        <aside className="sky-rail">
          <div className="sky-rail-body">
            <div className="sky-rail-list" ref={skyRailRef}>
              {skies.map((sky) => {
                const summary = skySummaries.find((item) => item.id === sky.id);
                return (
                  <div
                    key={sky.id}
                    className={`sky-tab-shell${sky.id === activeSkyId ? " sky-tab-shell-active" : ""}${draggedSkyId === sky.id ? " sky-tab-shell-dragging" : ""}${dropSkyId === sky.id && draggedSkyId !== sky.id ? " sky-tab-shell-drop" : ""}`}
                    data-sky-id={sky.id}
                    data-theme={sky.theme}
                    draggable
                    onDragEnd={handleSkyDragEnd}
                    onDragOver={(event) => handleSkyDragOver(event, sky.id)}
                    onDragStart={(event) => handleSkyDragStart(event, sky.id)}
                    onDrop={(event) => handleSkyDrop(event, sky.id)}
                  >
                    <button
                      className={`sky-tab sky-tab-rail${sky.id === activeSkyId ? " sky-tab-active" : ""}`}
                      data-sky-id={sky.id}
                      data-theme={sky.theme}
                      onClick={() => requestNavigation({ type: "activate-sky", skyId: sky.id, surfaceMode })}
                      type="button"
                    >
                      <span className="sky-tab-copy">
                        <strong>{displaySkyName(sky.name)}</strong>
                        <span>
                          {summary?.stars ?? 0} estrellas · {summary?.constellations ?? 0} constelaciones
                        </span>
                      </span>
                    </button>
                    <button
                      aria-label={`Opciones de ${displaySkyName(sky.name)}`}
                      className={`sky-tab-menu-button${skyMenuId === sky.id ? " sky-tab-menu-button-active" : ""}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (skyMenuId === sky.id) {
                          setSkyMenuId(null);
                          setSkyMenuCoords(null);
                          return;
                        }
                        const railBounds = skyRailRef.current?.getBoundingClientRect();
                        const triggerBounds = event.currentTarget.getBoundingClientRect();
                        const estimatedMenuHeight = 170;
                        const estimatedMenuWidth = 158;
                        const spaceBelow = railBounds ? railBounds.bottom - triggerBounds.bottom : estimatedMenuHeight;
                        const spaceAbove = railBounds ? triggerBounds.top - railBounds.top : 0;
                        const placement = spaceBelow < estimatedMenuHeight && spaceAbove > spaceBelow ? "up" : "down";
                        setSkyMenuPlacement(placement);
                        setSkyMenuCoords({
                          top: placement === "up" ? triggerBounds.top - estimatedMenuHeight + 6 : triggerBounds.bottom - 6,
                          left: Math.max(16, triggerBounds.right - estimatedMenuWidth),
                        });
                        setSkyMenuId(sky.id);
                      }}
                      type="button"
                    >
                      ⋯
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="sky-rail-footer">
            <button className="toolbar-button toolbar-button-primary sky-rail-create" onClick={handleCreateSky} type="button">
              {"\uFF0B Nuevo cielo"}
            </button>
          </div>
        </aside>

        <div className="surface-shell">
      {surfaceMode === "journal" ? (
        <section className="journal-shell">
          <div className="journal-header">
            <div>
              <p className="panel-label">Diario de manifestaciones</p>
              <h1>{displaySkyName(activeSky.name)}</h1>
            </div>
            <div className="journal-header-side">
              <div className="journal-header-actions">
                <button className="toolbar-button toolbar-button-ghost" onClick={() => setSurfaceMode("sky")} type="button">
                  {"\u{1F30C} Volver al cielo"}
                </button>
                <button className="toolbar-button toolbar-button-primary" onClick={focusComposer} type="button">
                  {"\u2726 Nueva estrella"}
                </button>
              </div>
            </div>
          </div>

          <div className="journal-layout">
            <section className="journal-list-card">
              <div className="journal-list-head">
                <p className="panel-label">Cuaderno</p>
                <strong>{journalEntries.length === 1 ? "1 entrada" : `${journalEntries.length} entradas`}</strong>
              </div>

              <div className="journal-list">
                {journalEntries.length > 0 ? (
                  journalEntries.map((star) => (
                    <button
                      key={star.id}
                      className={`journal-entry${selectedStarId === star.id ? " journal-entry-active" : ""}`}
                      onClick={() => {
                        setSelectedStarId(star.id);
                        setStarEditor(null);
                      }}
                      type="button"
                    >
                      <span className="journal-entry-star" style={{ color: starColorValue(star.color, star.customColor) }} />
                      <div className="journal-entry-copy">
                        <strong>{star.title}</strong>
                        <span className="journal-entry-date">{formatDate(star.createdAt)}</span>
                        <span className="journal-entry-preview">{excerpt(stripResonanceMarkup(star.note) || star.title)}</span>
                      </div>
                    </button>
                  ))
                ) : (
                  <p className="selection-empty">Este cielo aun no tiene entradas.</p>
                )}
              </div>
            </section>

            <section className="journal-detail-card">
              {selectedStar ? (
                <>
                  <div className="card-title-row">
                    <div>
                      <p className="panel-label">{editingSelectedStar ? "Editar entrada" : "Entrada abierta"}</p>
                      <h2>{editingSelectedStar ? editorPreviewTitle : selectedStar.title}</h2>
                    </div>
                    {editingSelectedStar ? (
                      <div className="card-title-actions">
                        <button className="mini-tool-button mini-tool-button-danger mini-tool-button-icon" onClick={() => setOverlayPanel("delete-star")} title="Borrar estrella" type="button">
                          {"\u{1F5D1}"}
                        </button>
                        <button className="mini-tool-button" onClick={cancelStarEditor} type="button">
                          ✕ Cerrar
                        </button>
                      </div>
                    ) : (
                      <button className="mini-tool-button" onClick={beginEditSelectedStar} type="button">
                        ✎ Editar
                      </button>
                    )}
                  </div>

                  {editingSelectedStar && starEditor ? (
                    renderStarEditorForm("journal")
                  ) : (
                    <>
                      <div className="journal-meta-row">
                        <span>{formatDate(selectedStar.createdAt)}</span>
                        <span>{displaySkyName(activeSky.name)}</span>
                        <span>{toneText(selectedStar.color)}</span>
                      </div>

                      <div className="journal-note-sheet">
                        <p>{selectedStar.note ? renderResonantText(selectedStar.note) : "Esta entrada aun no tiene una nota larga asociada."}</p>
                      </div>

                      {renderResonanceSection(selectedStarResonances)}

                      <div className="button-row">
                        <button className="toolbar-button toolbar-button-ghost" onClick={() => setSurfaceMode("sky")} type="button">
                          Volver al cielo
                        </button>
                      </div>

                      <div className="subtle-link-row">
                        <button className="subtle-link-button" onClick={requestMoveSelectedStar} type="button">
                          {"\u2197 Enviar a otro cielo"}
                        </button>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <>
                  <p className="panel-label">Diario vacio</p>
                  <h2>Aun no hay entradas en este cielo.</h2>
                  <p className="journal-copy">Crea una estrella y despues podras verla aqui como una pagina de tu cuaderno.</p>
                  <button className="toolbar-button" onClick={focusComposer} type="button">
                    {"\u2726 Crear primera estrella"}
                  </button>
                </>
              )}
            </section>
          </div>
        </section>
      ) : surfaceMode === "guide" ? (
        <section className="guide-shell">
          <header className="guide-header">
            <div className="guide-header-copy">
              <p className="panel-label">Guía de uso · About</p>
              <h1>Setestrelo</h1>
              <p className="guide-intro">
                Un observatorio personal para visualizar ideas, tareas, deseos y transiciones mentales con más calma.
              </p>
            </div>
            <div className="guide-header-actions">
              <button className="toolbar-button toolbar-button-ghost" onClick={() => setSurfaceMode("sky")} type="button">
                {"\u{1F30C} Volver al cielo"}
              </button>
            </div>
          </header>

          <article className="guide-flow">
            <section className="guide-section">
              <p className="panel-label">Qué es</p>
              <h2>Un atlas visual para pensar antes de actuar</h2>
              <p>
                Setestrelo puede usarse como diario poético, mapa emocional o archivo de deseos. Pero también puede funcionar como una forma suave de
                hacer visible lo que todavía cuesta iniciar.
              </p>
              <p>
                Una de las maneras en las que se está probando consiste en crear cielos para tareas, ideas o bloques de acción que producen bloqueo,
                dividirlos en estrellas más pequeñas y visualizarlos antes de actuar.
              </p>
            </section>

            <section className="guide-section">
              <p className="panel-label">Cómo empezar</p>
              <ol className="guide-steps">
                <li>
                  <strong>Crea un cielo.</strong> Cada cielo puede reunir un tema, una tarea grande, una intención o un contexto de foco.
                </li>
                <li>
                  <strong>Añade estrellas.</strong> Cada estrella combina un título corto para el visor y una nota más amplia para el diario.
                </li>
                <li>
                  <strong>Teje constelaciones.</strong> Usa <em>Nueva constelación</em> y selecciona estrellas en el orden que quieras.
                </li>
                <li>
                  <strong>Abre el diario.</strong> Ahí puedes leer, editar y trabajar tus notas con más detalle.
                </li>
              </ol>
            </section>

            <section className="guide-section">
              <p className="panel-label">Resonancias</p>
              <h2>Relaciones semánticas entre notas</h2>
              <p>
                En el diario puedes nombrar otra nota entre llaves, por ejemplo <em>{"{Nombre de otra nota}"}</em>. Cuando esa referencia encuentra una
                estrella existente, Setestrelo crea una resonancia.
              </p>
              <p>
                Si activas las resonancias en el panel del planetario, verás un flujo de micropartículas entre las estrellas relacionadas.
              </p>
            </section>

            <section className="guide-section">
              <p className="panel-label">Contemplar</p>
              <h2>Ver aparecer las palabras con calma</h2>
              <p>
                El modo contemplativo muestra a intervalos pausados el contenido de tus estrellas en el centro del cielo. No busca meter prisa ni
                productividad, sino ayudar a sostener una imagen mental de lo que quieres acercar.
              </p>
            </section>

            <section className="guide-section">
              <p className="panel-label">Persistencia y backups</p>
              <h2>Dónde viven tus datos</h2>
              <p>
                Setestrelo guarda el atlas en este navegador usando varias capas locales de persistencia: <strong>IndexedDB</strong>,
                <strong> localStorage</strong>, copia de recuperación e historial reciente.
              </p>
              <p>
                Si cambias de navegador, de perfil o de origen, no verás necesariamente el mismo atlas. Por eso sigue siendo recomendable exportar
                copias <code>.json</code>.
              </p>
            </section>

            <section className="guide-section">
              <p className="panel-label">About</p>
              <h2>Una herramienta para imaginar, ordenar y acercar lo que cuesta iniciar</h2>
              <p>
                La intención del proyecto no es sustituir apoyo clínico ni prometer efectos terapéuticos, sino ofrecer una superficie visual y escrita
                donde externalizar pasos, descargar memoria de trabajo y preparar cambios de foco con más suavidad.
              </p>
              <p>
                Esta línea está desarrollada con más detalle en el documento <strong>ABOUT</strong> del proyecto y se apoya en bibliografía sobre
                función ejecutiva, inicio de tareas, externalización cognitiva e imaginería prospectiva.
              </p>
              <p className="guide-signoff">Idea, diseño y universo visual de Sira Perriki.</p>
            </section>
          </article>
        </section>
      ) : (
      <section className="workspace">
        <div className="sky-frame">
          <div
            key={`${activeSkyId}-${showPendingConnectionView ? "neutral" : "active"}`}
            className={`sky-panel${showPendingConnectionView ? " sky-panel-neutral" : ""}`}
            data-theme={showPendingConnectionView ? undefined : liveSkyTheme}
            onPointerDown={handleSkyBackgroundPointerDown}
            ref={skyPanelRef}
          >
            {showPendingConnectionView ? (
              <div className="sky-connection-state">
                <div className="sky-connection-grid" />
                <div className="sky-connection-scan" />
                {NEUTRAL_DUST.map((particle) => (
                  <motion.span
                    key={particle.id}
                    className="sky-connection-dust"
                    style={{ left: `${particle.x}%`, top: `${particle.y}%`, "--dust-scale": particle.scale } as CSSProperties}
                    animate={{
                      opacity: [0.14, 0.5, 0.2],
                      x: [0, particle.driftX, 0],
                      y: [0, particle.driftY, 0],
                      scale: [particle.scale, particle.scale * 1.18, particle.scale],
                    }}
                    transition={{ duration: 10 + (particle.id.length % 5) * 2.6, delay: particle.delay, repeat: Infinity, ease: "easeInOut" }}
                  />
                ))}
                {NEUTRAL_GLOW_MOTES.map((mote) => (
                  <motion.span
                    key={mote.id}
                    className="sky-connection-glow"
                    style={{ left: `${mote.x}%`, top: `${mote.y}%` }}
                    animate={{ opacity: [0.04, 0.16, 0.05], x: [0, mote.span * 0.22, 0], y: [0, -mote.span * 0.18, 0], scale: [0.9, 1.06, 0.92] }}
                    transition={{ duration: 18 + mote.span, delay: mote.delay, repeat: Infinity, ease: "easeInOut" }}
                  />
                ))}
                <div className="sky-connection-rings">
                  <span className="sky-connection-ring sky-connection-ring-a" />
                  <span className="sky-connection-ring sky-connection-ring-b" />
                  <span className="sky-connection-ring sky-connection-ring-c" />
                </div>
                <div className="sky-connection-nodes">
                  <span className="sky-connection-node sky-connection-node-a" />
                  <span className="sky-connection-node sky-connection-node-b" />
                  <span className="sky-connection-node sky-connection-node-c" />
                  <span className="sky-connection-node sky-connection-node-d" />
                </div>
                <div className="sky-connection-copy">
                  <p className="panel-label">Visor en espera</p>
                  <strong>Pendiente de conexión con un cielo.</strong>
                  <span>Primero elige un cielo en la columna izquierda. Después podrás abrir sus estrellas desde el visor o desde el diario.</span>
                </div>
              </div>
            ) : (
              <>
                <div className="sky-gradient" />
                <div className="sky-photo sky-photo-main" />
                <div className="sky-photo sky-photo-texture" />
                <div className="sky-veil" />
                <div className={`sky-orbital-body sky-orbital-body-moon moon-phase-${moonPhase.key}`} style={moonPhaseStyle} title={moonPhase.name} />
                <div className="sky-orbital-body sky-orbital-body-saturn" />
                <div className="sky-orbital-body sky-orbital-body-earth" />
                <div className="sky-orbital-body sky-orbital-body-neptune" />
                <div className="sky-orbital-body sky-orbital-body-jupiter" />
                <div className="sky-orbital-body sky-orbital-body-venus" />
                <div className="sky-orbital-body sky-orbital-body-mercury" />
                <div className="sky-nebula sky-nebula-a" />
                <div className="sky-nebula sky-nebula-b" />
                <div className="sky-nebula sky-nebula-c" />

                {showSkyGuide ? (
              <div
                className="sky-focus-guide"
                onClick={(event) => event.stopPropagation()}
                onPointerDown={(event) => event.stopPropagation()}
              >
                <button
                  aria-label="Cerrar ayuda del cielo"
                  className="sky-guide-close"
                  onPointerDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  onClick={(event) => {
                    event.stopPropagation();
                    setDismissedSkyGuides((current) => (current.includes(activeSkyId) ? current : [...current, activeSkyId]));
                  }}
                  type="button"
                >
                  ×
                </button>
                <strong>Tu cielo ya respira</strong>
                <span>Haz clic en una estrella para leerla.</span>
                <span>Usa Nueva constelacion para dibujar relaciones entre varias luces.</span>
              </div>
                ) : null}

                {constellationMode ? <div className="sky-mode-banner">Selecciona estrellas en orden y guarda la nueva constelacion.</div> : null}

                {showEmptySkyState ? (
              <div className="empty-sky-state">
                <p className="panel-label">Cielo vacio</p>
                <strong>Este cielo esta esperando su primera nota.</strong>
                <span>Crea una estrella con un titulo breve y una nota asociada.</span>
              </div>
                ) : null}

                {FLOATING_MOTES.map((mote) => (
              <motion.span
                key={mote.id}
                className="floating-mote"
                style={{ left: `${mote.x}%`, top: `${mote.y}%` }}
                animate={{ opacity: [0.06, 0.24, 0.08], y: [0, -mote.span, 0], x: [0, 4, 0], scale: [0.8, 1.1, 0.9] }}
                transition={{ duration: 10 + mote.span, delay: mote.delay, repeat: Infinity, ease: "easeInOut" }}
              />
                ))}

                {BG_STARS.map((star) => (
              <motion.span
                key={star.id}
                className="bg-star"
                style={{ left: `${star.x}%`, top: `${star.y}%` }}
                animate={{ opacity: [0.18, 0.72, 0.18], scale: [star.scale, star.scale + 0.22, star.scale] }}
                transition={{ duration: 6.2, delay: star.delay, repeat: Infinity, ease: "easeInOut" }}
              />
                ))}

                <span className="shooting-star shooting-star-a" />
                <span className="shooting-star shooting-star-b" />
                <span className="shooting-star shooting-star-c" />

                <AnimatePresence mode="sync">
              {meditationRunning ? (
                <div className="meditation-layer" key={`meditation-${activeSkyId}`}>
                  {meditationLines.map((line) => (
                    <motion.div
                      key={line.key}
                      className={`meditation-line meditation-line-${line.motion} meditation-line-${line.emphasis}`}
                      style={{
                        top: `${line.top}%`,
                        left: "50%",
                      }}
                      initial={{ x: "-50%", y: 16, opacity: 0, filter: "blur(10px)", scale: 0.985 }}
                      animate={{
                        x: ["-50%", "-50%", "-50%", "-50%", "-50%"],
                        y: [16, 5, 0, -4, -14],
                        opacity: [0, 0.26, 0.72, 0.7, 0],
                        filter: ["blur(10px)", "blur(1px)", "blur(0px)", "blur(0px)", "blur(10px)"],
                        scale: [0.985, 1, 1.008, 1.01, 0.996],
                      }}
                      exit={{ opacity: 0, filter: "blur(8px)", transition: { duration: 2.4, ease: "easeInOut" } }}
                      transition={{ duration: line.duration, delay: line.delay, ease: "easeInOut", times: [0, 0.18, 0.38, 0.78, 1] }}
                    >
                      <span>{line.text}</span>
                    </motion.div>
                  ))}
                </div>
              ) : null}
                </AnimatePresence>

                <svg className="constellation-lines" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                <filter id="constellation-glow">
                  <feGaussianBlur stdDeviation="0.32" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {showConstellations
                ? constellationPaths.map((path, index) => (
                    <g key={`constellation-${index}`} className="constellation-group">
                      <path className="constellation-glow" d={path} />
                      <path className="constellation-core" d={path} />
                    </g>
                  ))
                : null}

              {showConstellations && draftPath ? (
                <g className="constellation-group constellation-preview">
                  <path className="constellation-glow" d={draftPath} />
                  <path className="constellation-core" d={draftPath} />
                </g>
              ) : null}

                </svg>

                {showResonances && visibleResonancePaths.length > 0 ? (
              <div className={`resonance-layer${selectedStarId ? " resonance-layer-focused" : ""}`}>
                {visibleResonancePaths.map((item, index) => {
                  const particleCount = selectedStarId ? 11 : 8;
                  const streams: Array<{ key: string; className: string; from: { x: number; y: number }; to: { x: number; y: number } }> = [];
                  if (item.outgoing) {
                    streams.push({ key: "outgoing", className: "resonance-stream-outgoing", from: item.from, to: item.to });
                  }
                  if (item.incoming) {
                    streams.push({ key: "incoming", className: item.outgoing ? "resonance-stream-return" : "resonance-stream-incoming", from: item.to, to: item.from });
                  }
                  return streams.map((stream, streamIndex) => (
                    <div
                      key={`resonance-stream-${index}-${stream.key}`}
                      className={`resonance-stream ${stream.className}${item.outgoing && item.incoming ? " resonance-stream-mutual" : ""}`}
                      style={
                        {
                          "--from-x": `${stream.from.x}%`,
                          "--from-y": `${stream.from.y}%`,
                          "--to-x": `${stream.to.x}%`,
                          "--to-y": `${stream.to.y}%`,
                        } as CSSProperties
                      }
                    >
                      {Array.from({ length: particleCount }, (_, particleIndex) => (
                        <span
                          key={`resonance-drift-${index}-${stream.key}-${particleIndex}`}
                          className="resonance-drift"
                          style={
                            {
                              "--drift-delay": `${particleIndex * (selectedStarId ? 0.42 : 0.56) + streamIndex * 0.22}s`,
                              "--drift-duration": `${selectedStarId ? 8.8 + particleIndex * 0.16 : 10.8 + particleIndex * 0.2}s`,
                              "--drift-size": `${particleIndex % 5 === 0 ? 3.4 : particleIndex % 2 === 0 ? 2.3 : 1.7}px`,
                            } as CSSProperties
                          }
                        />
                      ))}
                    </div>
                  ));
                })}
              </div>
                ) : null}

                {renderedStars.map((star, index) => (
              <motion.button
                key={star.id}
                className={`atlas-star atlas-star-${star.size} atlas-star-${star.color} atlas-star-${star.shape}${selectedStarId === star.id ? " atlas-star-selected" : ""}${draftConstellationStarIds.includes(star.id) ? " atlas-star-linked" : ""}${selectedResonanceActive && selectedResonanceStarIds.has(star.id) ? " atlas-star-resonant" : ""}${selectedResonanceActive && selectedStarId !== star.id && !selectedResonanceStarIds.has(star.id) ? " atlas-star-muted" : ""}${draggingStarId === star.id ? " atlas-star-dragging" : ""}`}
                style={{ left: `${star.x}%`, top: `${star.y}%`, color: starColorValue(star.color, star.customColor), "--twinkle-delay": `${(index % 7) * 0.34}s`, "--twinkle-duration": `${3.8 + (index % 4) * 0.52}s` } as CSSProperties}
                title={star.title}
                type="button"
                onPointerDown={(event) => handleStarPointerDown(event, star)}
                onKeyDown={(event) => handleStarKeyDown(event, star)}
              >
                {activeSky.showTitles && star.showTitle ? <span className={`star-label label-${titleSides[star.id] ?? "bottom"}`}>{star.title}</span> : null}
              </motion.button>
                ))}

                <AnimatePresence>
              {birthEffect && birthEffect.star.skyId === activeSkyId ? (
                <div key={birthEffect.star.id} className="ritual-layer">
                  <motion.div
                    className="launch-seed"
                    initial={{ left: `${birthEffect.startX}%`, top: `${birthEffect.startY}%`, opacity: 0, scale: 0.16 }}
                    style={{ "--ritual-color": starColorValue(birthEffect.star.color, birthEffect.star.customColor) } as CSSProperties}
                    animate={{
                      left: [`${birthEffect.startX}%`, `${birthEffect.star.x * 0.72 + 12}%`, `${birthEffect.star.x}%`],
                      top: [`${birthEffect.startY}%`, `${birthEffect.star.y + 12}%`, `${birthEffect.star.y}%`],
                      opacity: [0, 1, 0.08],
                      scale: [0.16, 1, 0.25],
                    }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.3, times: [0, 0.78, 1], ease: "easeInOut" }}
                  />

                  {Array.from({ length: 16 }, (_, index) => {
                    const sx = (index % 4) * 1.2 - 1.8;
                    const sy = Math.floor(index / 4) * 0.4;
                    return (
                      <motion.span
                        key={`${birthEffect.star.id}-${index}`}
                        className="trail-dust"
                        style={{ left: `${birthEffect.startX + sx}%`, top: `${birthEffect.startY + sy}%`, "--ritual-color": starColorValue(birthEffect.star.color, birthEffect.star.customColor) } as CSSProperties}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{
                          left: [`${birthEffect.startX + sx}%`, `${birthEffect.star.x * 0.54 + 22 + sx}%`, `${birthEffect.star.x}%`],
                          top: [`${birthEffect.startY + sy}%`, `${birthEffect.star.y + 15 - index * 0.18}%`, `${birthEffect.star.y}%`],
                          opacity: [0, 0.95, 0],
                          scale: [0, 1, 0.14],
                        }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.18, delay: index * 0.022, ease: "easeIn" }}
                      />
                    );
                  })}

                  <motion.div
                    className="arrival-ring"
                    style={{ left: `${birthEffect.star.x}%`, top: `${birthEffect.star.y}%`, "--ritual-color": starColorValue(birthEffect.star.color, birthEffect.star.customColor) } as CSSProperties}
                    initial={{ opacity: 0, scale: 0.2 }}
                    animate={{ opacity: [0, 0.9, 0], scale: [0.2, 1.2, 1.8] }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.88, delay: 1.04, ease: "easeOut" }}
                  />

                  <motion.div
                    className="arrival-core"
                    style={{ left: `${birthEffect.star.x}%`, top: `${birthEffect.star.y}%`, "--ritual-color": starColorValue(birthEffect.star.color, birthEffect.star.customColor) } as CSSProperties}
                    initial={{ opacity: 0, scale: 0.1 }}
                    animate={{ opacity: [0, 1, 0], scale: [0.1, 1.14, 0.16] }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.82, delay: 1.08, ease: "easeOut" }}
                  />
                </div>
              ) : null}
                </AnimatePresence>
              </>
            )}
          </div>
        </div>

        <aside className={`inspector-panel${inspectorEditingMode ? " inspector-panel-editing" : ""}`}>
          <div className={`inspector-panel-body${inspectorEditingMode ? " inspector-panel-body-editing" : ""}`}>
          {constellationMode ? (
            <>
              <section className="inspector-card">
                  <p className="panel-label">{editingConstellation ? "Editar constelacion" : "Nueva constelacion"}</p>

                <label htmlFor="constellation-name">Nombre</label>
                <input
                  id="constellation-name"
                  placeholder={`Constelacion ${activeConstellations.length + 1}`}
                  type="text"
                  value={draftConstellationName}
                  onChange={(event) => setDraftConstellationName(event.target.value)}
                />

                <div className="field-meta">
                  <span>{draftConstellationStarIds.length} elegidas</span>
                  <span>{activeConstellations.length} guardadas</span>
                </div>

                <div className="selection-list">
                  {draftConstellationStarIds.length > 0 ? (
                    draftConstellationStarIds.map((starId) => {
                      const star = activeStars.find((item) => item.id === starId);
                      return star ? (
                        <button key={star.id} className="selection-pill" onClick={() => setDraftConstellationStarIds((current) => current.filter((id) => id !== star.id))} type="button">
                          <span className="selection-pill-text">{star.title}</span>
                          <span aria-hidden="true" className="selection-pill-remove">
                            ×
                          </span>
                        </button>
                      ) : null;
                    })
                  ) : (
                    <p className="selection-empty">Todavia no has elegido estrellas.</p>
                  )}
                </div>

                <div className="button-row">
                  <button className="toolbar-button" disabled={draftConstellationStarIds.length < 2} onClick={saveConstellation} type="button">
                    {editingConstellation ? "Guardar cambios" : "Guardar constelacion"}
                  </button>
                  {editingConstellation ? (
                    <button className="toolbar-button toolbar-button-ghost" onClick={() => resetConstellationDraft()} type="button">
                      Nueva constelacion
                    </button>
                  ) : null}
                  <button
                    className="toolbar-button toolbar-button-ghost"
                    onClick={() => {
                      resetConstellationDraft(true);
                    }}
                    type="button"
                  >
                    Cancelar
                  </button>
                </div>
              </section>

              <section className="inspector-card">
                <p className="panel-label">Ya guardadas</p>
                <div className="constellation-list">
                  {activeConstellations.length > 0 ? (
                    activeConstellations.map((constellation) => (
                      <div key={constellation.id} className="constellation-item">
                        <div className="constellation-item-copy">
                          <strong>{constellation.name}</strong>
                          <span>{constellation.starIds.length} estrellas</span>
                        </div>
                        <div className="constellation-item-actions">
                        <button className="mini-tool-button constellation-item-action" onClick={() => beginEditConstellation(constellation.id)} type="button">
                          ✎ Editar
                        </button>
                          <button className="mini-tool-button constellation-item-action" onClick={() => requestDeleteConstellation(constellation.id)} type="button">
                            {"\u{1F5D1} Borrar"}
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="selection-empty">Aun no hay constelaciones en este cielo.</p>
                  )}
                </div>
              </section>
            </>
          ) : selectedStar ? (
            <>
              <section className="inspector-card">
                <div className="card-title-row card-title-row-stack">
                  <div>
                    <p className="panel-label">{editingSelectedStar ? "Editar estrella" : "Estrella seleccionada"}</p>
                    <h2>{editingSelectedStar ? editorPreviewTitle : selectedStar.title}</h2>
                  </div>
                  {editingSelectedStar ? (
                    <div className="card-title-actions">
                      <button className="mini-tool-button mini-tool-button-danger mini-tool-button-icon" onClick={() => setOverlayPanel("delete-star")} title="Borrar estrella" type="button">
                        {"\u{1F5D1}"}
                      </button>
                      <button className="mini-tool-button" onClick={cancelStarEditor} type="button">
                        ✕ Cerrar
                      </button>
                    </div>
                  ) : (
                    <div className="card-title-actions">
                      <button className="mini-tool-button" onClick={beginEditSelectedStar} type="button">
                        ✎ Editar
                      </button>
                      <button
                        className="mini-tool-button"
                        onClick={() => {
                          setSelectedStarId(null);
                          setInspectorHomeView("neutral");
                        }}
                        type="button"
                      >
                        ✕ Cerrar
                      </button>
                    </div>
                  )}
                </div>

                {editingSelectedStar && starEditor ? (
                  renderStarEditorForm("inspector")
                ) : (
                  <>
                    {selectedStarHasDistinctNote ? (
                      <div className="reading-note">
                        <p>{renderResonantText(selectedStar.note)}</p>
                      </div>
                    ) : null}

                    <div className="info-lines">
                      <p><strong>Color:</strong> {toneText(selectedStar.color)}</p>
                      <p><strong>Forma:</strong> {shapeText(selectedStar.shape)} · <strong>Tamano:</strong> {sizeText(selectedStar.size)}</p>
                      <p><strong>Creada:</strong> {formatDate(selectedStar.createdAt)}</p>
                    </div>
                  </>
                )}
              </section>

              {!editingSelectedStar ? renderResonanceSection(selectedStarResonances) : null}

              {!editingSelectedStar ? (
                <section className="inspector-card inspector-actions-card">
                  <p className="panel-label">Acciones</p>
                  <div className="subtle-link-row subtle-link-row-actions">
                    <button className="subtle-link-button" onClick={requestMoveSelectedStar} type="button">
                      {"\u2197 Mover de cielo"}
                    </button>
                    <button className="subtle-link-button subtle-link-button-accent" onClick={openJournal} type="button">
                      {"\u{1F4DD} Abrir en diario"}
                    </button>
                  </div>
                </section>
              ) : null}

              <section className="inspector-card">
                <p className="panel-label">Relacion con el cielo</p>
                <div className="constellation-list">
                  {selectedStarConstellations.length > 0 ? (
                    selectedStarConstellations.map((constellation) => (
                      <div key={constellation.id} className="constellation-item">
                        <div className="constellation-item-copy">
                          <strong>{constellation.name}</strong>
                          <span>Incluye esta estrella</span>
                        </div>
                        <div className="constellation-item-actions">
                          <button className="mini-tool-button constellation-item-action" onClick={() => beginEditConstellation(constellation.id)} type="button">
                            ✎ Editar
                          </button>
                          <button className="mini-tool-button constellation-item-action" onClick={() => removeStarFromConstellation(constellation.id, selectedStar.id)} type="button">
                            ↘ Quitar
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="selection-empty">Esta estrella aun no forma parte de una constelacion.</p>
                  )}
                </div>
              </section>
            </>
          ) : (
            <>
              {composerOpen ? (
                <section className="inspector-card">
                  <div className="card-title-row">
                    <div>
                      <p className="panel-label">Nueva estrella</p>
                      <h2>Sembrar una nueva estrella</h2>
                      <p className="inspector-helper">Deja una nota en este cielo y desarrolla la idea con un poco mas de espacio si lo necesitas.</p>
                    </div>
                    <button className="mini-tool-button" onClick={() => setComposerOpen(false)} type="button">
                      ✕ Cerrar
                    </button>
                  </div>

                  <form className="composer-form" onSubmit={handleSubmit}>
                    <label htmlFor="composer-title">Titulo</label>
                    <input
                      id="composer-title"
                      ref={composerTitleRef}
                      maxLength={MAX_TITLE}
                      placeholder="Ej. Casa tibia"
                      type="text"
                      value={composer.title}
                      onChange={(event) => setComposer((current) => ({ ...current, title: event.target.value }))}
                    />

                    <label htmlFor="composer-note">Nota asociada</label>
                    <textarea
                      id="composer-note"
                      maxLength={MAX_NOTE}
                      rows={6}
                      placeholder="Describe con un poco mas de detalle la sensacion o el deseo que quieres guardar."
                      value={composer.note}
                      onChange={(event) => setComposer((current) => ({ ...current, note: event.target.value }))}
                    />

                    {activeConstellations.length > 0 ? (
                      <>
                        <label htmlFor="composer-constellation">Constelacion</label>
                        <select
                          id="composer-constellation"
                          value={composer.constellationId}
                          onChange={(event) => setComposer((current) => ({ ...current, constellationId: event.target.value }))}
                        >
                          <option value="">No anadir a ninguna</option>
                          {activeConstellations.map((constellation) => (
                            <option key={constellation.id} value={constellation.id}>
                              {constellation.name}
                            </option>
                          ))}
                        </select>
                      </>
                    ) : null}

                    <div className="field-meta">
                      <span className={composer.title.length > SOFT_TITLE ? "field-warning" : ""}>{composer.title.length}/{MAX_TITLE}</span>
                      <span className={composer.note.length > SOFT_NOTE ? "field-warning" : ""}>{composer.note.length}/{MAX_NOTE}</span>
                    </div>

                    <div className="button-row">
                      <button className="toolbar-button toolbar-button-primary" disabled={!canCreateStar} type="submit">
                        {birthEffect ? "Sembrando luz..." : "Crear estrella"}
                      </button>
                      <button className="toolbar-button toolbar-button-ghost" onClick={() => setComposerOpen(false)} type="button">
                        Cancelar
                      </button>
                    </div>
                  </form>
                </section>
              ) : null}

              {editingSky ? (
                <section className="inspector-card">
                  <div className="card-title-row">
                    <div>
                      <h2>{displaySkyName(activeSky.name)}</h2>
                    </div>
                    <div className="card-title-actions">
                      <button
                        className="mini-tool-button mini-tool-button-danger mini-tool-button-icon"
                        disabled={skies.length <= 1}
                        onClick={() => setOverlayPanel("delete-sky")}
                        title="Borrar cielo"
                        type="button"
                      >
                        {"\u{1F5D1}"}
                      </button>
                      <button className="mini-tool-button" onClick={cancelSkyEditor} type="button">
                        ✕ Cerrar
                      </button>
                    </div>
                  </div>

                  {skyEditor ? (
                    <div className="editor-shell">
                      <section className="editor-section">
                        <div className="editor-section-head">
                          <span className="editor-label">Nombre</span>
                        </div>

                        <input
                          aria-label="Nombre del cielo"
                          id="sky-name"
                          maxLength={MAX_SKY_NAME}
                          placeholder="Nombre del cielo"
                          type="text"
                          value={skyEditor.name}
                          onChange={(event) => setSkyEditor((current) => (current ? { ...current, name: event.target.value } : current))}
                        />

                        <div className="field-meta">
                          <span className={skyEditor.name.length > SOFT_SKY_NAME ? "field-warning" : ""}>
                            {skyEditor.name.length}/{MAX_SKY_NAME}
                          </span>
                        </div>
                      </section>

                      <section className="editor-section">
                        <div className="editor-section-head">
                          <span className="editor-label">Tema</span>
                        </div>

                        <div className="theme-current-row" data-theme={skyEditor.theme}>
                          <span className="theme-current-marker" aria-hidden="true" />
                          <div className="theme-preview-copy">
                            <strong>{themeText(skyEditor.theme)}</strong>
                            <span>{themeMoodText(skyEditor.theme)}</span>
                          </div>
                          <span className="theme-swatch-status">Activa</span>
                        </div>

                        <div className="theme-catalog">
                          {THEME_GROUPS.map((group) => (
                            <div key={group.label} className="theme-group">
                              <span className="editor-label">{group.label}</span>
                              <div className="theme-grid">
                                {group.themes.map((theme) => (
                                  <button
                                    key={theme}
                                    aria-pressed={skyEditor.theme === theme}
                                    className={`theme-swatch-card${skyEditor.theme === theme ? " theme-swatch-card-active" : ""}`}
                                    data-theme={theme}
                                    onClick={() => setSkyEditor((current) => (current ? { ...current, theme } : current))}
                                    type="button"
                                  >
                                    <span className="theme-swatch-marker" aria-hidden="true" />
                                    <span className="theme-swatch-copy">
                                      <strong>{themeText(theme)}</strong>
                                      <span>{themeMoodText(theme)}</span>
                                    </span>
                                    <span className={`theme-swatch-check${skyEditor.theme === theme ? " theme-swatch-check-active" : ""}`} aria-hidden="true">
                                      {skyEditor.theme === theme ? "✓" : ""}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>

                      <div className="button-row button-row-editor">
                        <button className="toolbar-button toolbar-button-primary" onClick={saveSkyEditor} type="button">
                          Guardar cambios
                        </button>
                        <button className="toolbar-button toolbar-button-ghost" onClick={cancelSkyEditor} type="button">
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : null}
                </section>
              ) : inspectorHomeView === "sky" ? (
                <>
                  <section className="inspector-card">
                    <div className="card-title-row">
                      <div>
                        <h2>{displaySkyName(activeSky.name)}</h2>
                      </div>
                      <div className="card-title-actions">
                        <button className="mini-tool-button" onClick={beginEditSky} type="button">
                          ✎ Editar
                        </button>
                        <button className="mini-tool-button" onClick={() => setInspectorHomeView("neutral")} type="button">
                          ✕ Cerrar
                        </button>
                      </div>
                    </div>

                    <div className="info-lines">
                      <p><strong>Capacidad:</strong> {activeStars.length}/{activeSky.capacity} estrellas.</p>
                      <p><strong>Constelaciones:</strong> {activeConstellations.length} tejidas.</p>
                      <p><strong>Tema:</strong> {themeText(activeSky.theme)}.</p>
                    </div>
                  </section>

                  <section className="inspector-card inspector-actions-card">
                    <p className="panel-label">Acciones</p>
                    <div className="subtle-link-row subtle-link-row-actions">
                      <button className="subtle-link-button subtle-link-button-accent" onClick={focusComposer} type="button">
                        {"\u2726 Nueva estrella"}
                      </button>
                      <button className="subtle-link-button" onClick={startConstellationMode} type="button">
                        ☄ Nueva constelacion
                      </button>
                    </div>
                  </section>

                  <section className="inspector-card">
                    {activeConstellations.length > 0 ? (
                      <>
                        <p className="panel-label">Constelaciones</p>
                        <div className="constellation-list">
                          {activeConstellations.map((constellation) => (
                            <div key={constellation.id} className="constellation-item">
                              <div className="constellation-item-copy">
                                <strong>{constellation.name}</strong>
                                <span>{constellation.starIds.length} estrellas</span>
                              </div>
                              <div className="constellation-item-actions">
                                <button className="mini-tool-button constellation-item-action" onClick={() => beginEditConstellation(constellation.id)} type="button">
                                  ✎ Editar
                                </button>
                                <button className="mini-tool-button constellation-item-action" onClick={() => requestDeleteConstellation(constellation.id)} type="button">
                                  {"\u{1F5D1} Borrar"}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <p className="selection-empty">Aun no has tejido constelaciones en este cielo.</p>
                    )}
                  </section>
                </>
              ) : (
                <section className="inspector-card inspector-neutral-card">
                  <p className="panel-label">SETESTRELO</p>
                  <h2>Tu panel de cielo está libre.</h2>
                  <div className="neutral-guide-list">
                    <p><strong>1. Crea un cielo.</strong> Empieza por abrir uno nuevo en la columna izquierda. Cada cielo puede reunir tareas, ideas, deseos o temas que quieras visualizar.</p>
                    <p><strong>2. Habítalo.</strong> Dentro de ese cielo puedes añadir estrellas, tejer una nueva constelación o abrir el diario para trabajar tus notas con más calma.</p>
                    <p><strong>3. Entra en detalle.</strong> Haz clic en una estrella dentro del visor para cargar aquí sus opciones, relaciones y acciones posibles.</p>
                    <p><strong>4. Activa resonancias.</strong> En el diario puedes escribir referencias como <em>{"{Nombre de otra nota}"}</em> para vincular estrellas y ver sus flujos en el visor.</p>
                    <p><strong>5. Contempla.</strong> El modo contemplativo hace aparecer tus palabras en el centro del cielo a un ritmo pausado.</p>
                  </div>
                  <div className="info-lines">
                    <p><strong>Propósito:</strong> imaginar, ordenar y acercar lo que todavía cuesta iniciar.</p>
                    <p><strong>Contacto:</strong> idea y universo visual de Sira Perriki.</p>
                  </div>
                </section>
              )}
            </>
          )}
          </div>

          {!inspectorEditingMode ? (
            <div className="inspector-panel-footer">
              <button
                className={`toolbar-button toolbar-button-sky inspector-rail-secondary${meditationMode ? " toolbar-button-active" : ""}`}
                disabled={activeStars.length === 0 && !meditationMode}
                onClick={() => setMeditationMode((current) => !current)}
                type="button"
              >
                {meditationButtonText}
              </button>
              <button
                className={`toolbar-button toolbar-button-primary inspector-rail-create${composerOpen ? " inspector-rail-create-active" : ""}`}
                disabled={Boolean(birthEffect) || skyFull}
                onClick={focusComposer}
                type="button"
              >
                {birthEffect ? "Sembrando luz..." : skyFull ? "✦ Cielo lleno" : "✦ Nueva estrella"}
              </button>
            </div>
          ) : null}
        </aside>
      </section>
      )}
        </div>
      </div>

      <AnimatePresence>
        {overlayPanel ? (
          <motion.div animate={{ opacity: 1 }} className="overlay-shell" exit={{ opacity: 0 }} initial={{ opacity: 0 }} onClick={closeOverlay}>
            <motion.section animate={{ opacity: 1, y: 0, scale: 1 }} className="overlay-card" exit={{ opacity: 0, y: 12, scale: 0.98 }} initial={{ opacity: 0, y: 18, scale: 0.98 }} onClick={(event) => event.stopPropagation()}>
              {overlayPanel === "help" ? (
                <>
                  <p className="panel-label">Ayuda</p>
                  <h2>Como funciona Setestrelo</h2>
                  <div className="help-copy">
                    <p>Un cielo es una pagina de tu diario. Dentro de cada cielo guardas estrellas, que son notas breves de manifestacion.</p>
                    <p>Cada estrella tiene un titulo corto para verse en el cielo y una nota mas larga para darle contexto cuando la abres.</p>
                    <p>Puedes mover las estrellas, cambiar su color y forma, y seleccionar varias para tejer una nueva constelacion manual.</p>
                    <p>Tambien puedes abrir el modo diario para ver tus entradas como notas ordenadas por fecha y editarlas fuera del cielo.</p>
                    <p>Los datos viven en este navegador. Si borras el almacenamiento local del navegador, el atlas puede perderse.</p>
                    <p>Por eso existe el backup: puedes exportar un archivo .json y volver a importarlo despues.</p>
                  </div>
                  <button className="toolbar-button" onClick={closeOverlay} type="button">
                    Cerrar ayuda
                  </button>
                </>
              ) : overlayPanel === "create-sky" ? (
                <>
                  <p className="panel-label">Nuevo cielo</p>
                  <h2>Crea una nueva pagina para tu atlas.</h2>
                  <div className="help-copy">
                    <p>Ponle un nombre breve para ubicar mejor tus manifestaciones. Luego podras ajustar el tema visual desde la ficha del cielo.</p>
                  </div>

                  <label htmlFor="new-sky-name">Nombre del cielo</label>
                  <input
                    autoFocus
                    id="new-sky-name"
                    maxLength={MAX_SKY_NAME}
                    placeholder={`Cielo ${skies.length + 1}`}
                    type="text"
                    value={newSkyName}
                    onChange={(event) => setNewSkyName(event.target.value)}
                  />

                  <div className="field-meta">
                    <span className={newSkyName.length > SOFT_SKY_NAME ? "field-warning" : ""}>{newSkyName.length}/{MAX_SKY_NAME}</span>
                  </div>

                  <div className="button-row">
                    <button className="toolbar-button toolbar-button-primary" onClick={confirmCreateSky} type="button">
                      {"\uFF0B Guardar cielo"}
                    </button>
                    <button className="toolbar-button toolbar-button-ghost" onClick={closeOverlay} type="button">
                      Cancelar
                    </button>
                  </div>
                </>
              ) : overlayPanel === "delete-sky" ? (
                <>
                  <p className="panel-label">Borrar cielo</p>
                  <h2>Quieres soltar este cielo completo?</h2>
                  <div className="help-copy">
                    <p>
                      Se borrara <strong>{displaySkyName(deleteTargetSky.name)}</strong> junto con sus {deleteTargetStars.length} estrellas y {deleteTargetConstellations.length} constelaciones.
                    </p>
                    <p>Esta accion no se puede deshacer desde la app. Si quieres conservarlo, exporta antes un backup.</p>
                    {skies.length <= 1 ? <p>Necesitas al menos un cielo en el atlas, asi que no puedes borrar el unico cielo disponible.</p> : null}
                  </div>

                  <div className="button-row">
                    <button className="toolbar-button toolbar-button-danger" disabled={skies.length <= 1} onClick={deletePendingSky} type="button">
                      {"\u{1F5D1} Si, borrar cielo"}
                    </button>
                    <button className="toolbar-button toolbar-button-ghost" onClick={closeOverlay} type="button">
                      Cancelar
                    </button>
                  </div>
                </>
              ) : overlayPanel === "delete-star" ? (
                <>
                  <p className="panel-label">Borrar estrella</p>
                  <h2>Quieres soltar esta estrella?</h2>
                  <div className="help-copy">
                    <p>
                      Se borrara <strong>{selectedStar?.title ?? "esta estrella"}</strong> y se retirara de las constelaciones que la incluyan.
                    </p>
                    <p>Si una constelacion se queda con menos de dos estrellas, tambien desaparecera.</p>
                  </div>

                  <div className="button-row">
                    <button className="toolbar-button toolbar-button-danger" onClick={deleteSelectedStar} type="button">
                      {"\u{1F5D1} Si, borrar estrella"}
                    </button>
                    <button className="toolbar-button toolbar-button-ghost" onClick={closeOverlay} type="button">
                      Cancelar
                    </button>
                  </div>
                </>
              ) : overlayPanel === "move-star" ? (
                <>
                  <p className="panel-label">Mover estrella</p>
                  <h2>Envia esta estrella a otro cielo.</h2>
                  <div className="help-copy">
                    <p>
                      <strong>{selectedStar?.title ?? "Esta estrella"}</strong> desaparecera de <strong>{displaySkyName(activeSky.name)}</strong> y aparecera recolocada en el cielo que elijas.
                    </p>
                    <p>Si formaba parte de una constelacion, se retirara de ella al moverse.</p>
                  </div>

                  {moveTargets.length > 0 ? (
                    <div className="overlay-choice-list">
                      {moveTargets.map((target) => (
                        <button
                          key={target.sky.id}
                          aria-pressed={moveTargetSkyId === target.sky.id}
                          className={`overlay-choice-button${moveTargetSkyId === target.sky.id ? " overlay-choice-button-active" : ""}`}
                          disabled={target.full}
                          onClick={() => setMoveTargetSkyId(target.sky.id)}
                          type="button"
                        >
                          <strong>{displaySkyName(target.sky.name)}</strong>
                          <span>
                            {target.used}/{target.sky.capacity} estrellas{target.full ? " · lleno" : ""}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="selection-empty">No hay otros cielos disponibles para recibir esta estrella.</p>
                  )}

                  <div className="button-row">
                    <button className="toolbar-button toolbar-button-primary" disabled={!moveTargetSkyId} onClick={moveSelectedStar} type="button">
                      {"\u2197 Mover estrella"}
                    </button>
                    <button className="toolbar-button toolbar-button-ghost" onClick={closeOverlay} type="button">
                      Cancelar
                    </button>
                  </div>
                </>
              ) : overlayPanel === "delete-constellation" ? (
                <>
                  <p className="panel-label">Borrar constelacion</p>
                  <h2>Quieres deshacer esta constelacion?</h2>
                  <div className="help-copy">
                    <p>
                      Se borrara <strong>{selectedConstellation?.name ?? "esta constelacion"}</strong>, pero las estrellas seguiran viviendo en el cielo.
                    </p>
                  </div>

                  <div className="button-row">
                    <button className="toolbar-button toolbar-button-danger" onClick={deletePendingConstellation} type="button">
                      {"\u{1F5D1} Si, borrar constelacion"}
                    </button>
                    <button className="toolbar-button toolbar-button-ghost" onClick={closeOverlay} type="button">
                      Cancelar
                    </button>
                  </div>
                </>
              ) : overlayPanel === "join-constellation" ? (
                <>
                  <p className="panel-label">Unir estrella</p>
                  <h2>Quieres sumar esta estrella a la constelacion?</h2>
                  <div className="help-copy">
                    <p>
                      <strong>{pendingJoinStar?.title ?? "Esta estrella"}</strong> puede unirse a <strong>{pendingJoinConstellation?.name ?? "la constelacion"}</strong>.
                    </p>
                    <p>Si confirmas, la estrella se anadira al trazado existente sin crear una constelacion nueva.</p>
                  </div>

                  <div className="button-row">
                    <button className="toolbar-button toolbar-button-primary" onClick={confirmJoinConstellation} type="button">
                      ✦ Si, unir estrella
                    </button>
                    <button className="toolbar-button toolbar-button-ghost" onClick={closeOverlay} type="button">
                      Cancelar
                    </button>
                  </div>
                </>
              ) : overlayPanel === "confirm-import" ? (
                <>
                  <p className="panel-label">Importar backup</p>
                  <h2>Quieres reemplazar tu atlas actual?</h2>
                  <div className="help-copy">
                    <p>El archivo importado sustituira los cielos, estrellas y constelaciones que hay ahora mismo en este navegador.</p>
                    <p>Si quieres conservar lo actual, exporta antes otra copia.</p>
                  </div>

                  <div className="button-row">
                    <button className="toolbar-button toolbar-button-gold" onClick={confirmImportAtlas} type="button">
                      {"\u2B07 Importar y reemplazar"}
                    </button>
                    <button className="toolbar-button toolbar-button-ghost" onClick={closeOverlay} type="button">
                      Cancelar
                    </button>
                  </div>
                </>
              ) : overlayPanel === "unsaved-changes" ? (
                <>
                  <p className="panel-label">Cambios sin guardar</p>
                  <h2>Quieres guardar antes de salir?</h2>
                  <div className="help-copy">
                    <p>
                      {dirtyContext === "sky"
                        ? "Has cambiado el nombre o el tema de este cielo."
                        : dirtyContext === "star"
                          ? "Has modificado el contenido o el aspecto de esta estrella."
                          : dirtyContext === "constellation"
                            ? "Has cambiado la constelacion que estabas tejiendo."
                            : "Hay una estrella nueva a medio sembrar."}
                    </p>
                    <p>Si sigues sin guardar, esos cambios se cerraran para mostrar el cielo seleccionado.</p>
                  </div>

                  <div className="button-row">
                    <button
                      className="toolbar-button toolbar-button-primary"
                      disabled={!canSaveDirtyContext}
                      onClick={() => {
                        if (!saveCurrentChanges()) return;
                        if (pendingNavigation) executePendingNavigation(pendingNavigation);
                        else closeOverlay();
                      }}
                      type="button"
                    >
                      Guardar y continuar
                    </button>
                    <button
                      className="toolbar-button toolbar-button-ghost"
                      onClick={() => {
                        discardCurrentChanges();
                        if (pendingNavigation) executePendingNavigation(pendingNavigation);
                        else closeOverlay();
                      }}
                      type="button"
                    >
                      Descartar cambios
                    </button>
                    <button
                      className="toolbar-button toolbar-button-ghost"
                      onClick={() => {
                        setPendingNavigation(null);
                        closeOverlay();
                      }}
                      type="button"
                    >
                      Seguir aqui
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="panel-label">Backup</p>
                  <h2>Exporta o recupera tu atlas.</h2>
                  <div className="help-copy">
                    <p>Setestrelo guarda tus cielos en este navegador. Exportar una copia te permite conservar un respaldo fuera del navegador.</p>
                    <p>La importacion no ocurre al instante: primero te pediremos confirmacion antes de reemplazar el atlas actual.</p>
                  </div>

                  <div className="button-row button-row-stack">
                    <button className="toolbar-button" onClick={exportAtlas} type="button">
                      Exportar .json
                    </button>
                    <button className="toolbar-button toolbar-button-ghost" onClick={() => importInputRef.current?.click()} type="button">
                      Importar backup
                    </button>
                  </div>

                  <div className="backup-diagnostics">
                    <p className="panel-label">Diagnostico local</p>
                    <div className="backup-diagnostics-grid">
                      <span>Origen</span>
                      <strong>{storageOriginText}</strong>
                      <span>Lectura actual</span>
                      <strong>{storageSourceText}</strong>
                      <span>Ultimo guardado</span>
                      <strong>{storageSavedAt ? formatDateTime(storageSavedAt) : "Aun sin sello"}</strong>
                      <span>Contenido</span>
                      <strong>
                        {skies.length} cielos · {stars.length} estrellas · {constellations.length} constelaciones
                      </strong>
                    </div>
                  </div>

                  {importMessage ? <p className="backup-message">{importMessage}</p> : null}

                  <button className="toolbar-button toolbar-button-ghost" onClick={closeOverlay} type="button">
                    Cerrar
                  </button>
                </>
              )}
            </motion.section>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <input accept="application/json" hidden ref={importInputRef} type="file" onChange={handleImportFile} />
      {skyMenuId ? (
        <div
          className={`sky-tab-menu sky-tab-menu-floating${skyMenuPlacement === "up" ? " sky-tab-menu-up" : ""}`}
          style={skyMenuCoords ? { top: skyMenuCoords.top, left: skyMenuCoords.left } : undefined}
        >
          {(() => {
            const menuSky = skies.find((item) => item.id === skyMenuId);
            if (!menuSky) return null;
            return (
              <>
                <button className="sky-tab-menu-item" onClick={() => openSkyMenuAction(menuSky.id, "composer")} type="button">
                  ✦ Nueva estrella
                </button>
                <button className="sky-tab-menu-item" onClick={() => openSkyMenuAction(menuSky.id, "constellation")} type="button">
                  ☄ Nueva constelacion
                </button>
                <button className="sky-tab-menu-item" onClick={() => toggleSkyTitles(menuSky.id)} type="button">
                  {menuSky.showTitles ? "🏷 Titulos: si" : "🏷 Titulos: no"}
                </button>
                <button className="sky-tab-menu-item" disabled={skies.length <= 1} onClick={() => requestDeleteSky(menuSky.id)} type="button">
                  {"\u{1F5D1} Eliminar cielo"}
                </button>
              </>
            );
          })()}
        </div>
      ) : null}
    </main>
  );
}
