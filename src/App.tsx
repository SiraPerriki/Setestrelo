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
  type PointerEvent as ReactPointerEvent,
} from "react";

type SkyTheme = "night" | "rose" | "dawn" | "aurora" | "midnight" | "ember" | "lagoon" | "eclipse";
type Tone = "gold" | "pearl" | "coral" | "sky" | "rose" | "mint" | "violet" | "custom";
type StarSize = "s" | "m" | "l";
type StarShape = "orb" | "diamond" | "spark" | "heart";
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
  | null;
type SurfaceMode = "sky" | "journal";
type PendingSkyAction = { skyId: string; mode: "composer" | "constellation" } | null;
type PendingConstellationJoin = { starId: string; constellationId: string } | null;

type DragSession = {
  starId: string;
  startClientX: number;
  startClientY: number;
  originX: number;
  originY: number;
  moved: boolean;
};

type Rect = { x1: number; y1: number; x2: number; y2: number };

const STORAGE_KEY = "atlas-de-luz-state-v4";
const LEGACY_STORAGE_KEY = "atlas-de-luz-state-v3";
const MAX_SKY_NAME = 36;
const SOFT_SKY_NAME = 24;
const MAX_TITLE = 48;
const SOFT_TITLE = 32;
const MAX_NOTE = 800;
const SOFT_NOTE = 420;
const MIN_DISTANCE = 12;
const CONSTELLATION_JOIN_THRESHOLD = 5.4;
const BIRTH_ADD_MS = 1320;
const BIRTH_END_MS = 2100;
const THEMES: SkyTheme[] = ["night", "rose", "dawn", "aurora", "midnight", "ember", "lagoon", "eclipse"];
const COLORS: Tone[] = ["pearl", "gold", "coral", "sky", "rose", "mint", "violet"];
const SIZES: StarSize[] = ["m", "s", "l", "m"];
const SHAPES: StarShape[] = ["orb", "diamond", "spark", "heart", "orb"];
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

const DATE_FORMAT = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "short",
  year: "numeric",
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

function hasDistinctNote(note: string, title: string) {
  const compactNote = note.replace(/\s+/g, " ").trim();
  const compactTitle = title.replace(/\s+/g, " ").trim();
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
  return ["orb", "diamond", "spark", "heart"].includes(String(value)) ? (value as StarShape) : "orb";
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

function shapeText(shape: StarShape) {
  if (shape === "orb") return "orbe";
  if (shape === "diamond") return "rombo";
  if (shape === "heart") return "corazon";
  return "chispa";
}

function themeText(theme: SkyTheme) {
  if (theme === "night") return "Noche";
  if (theme === "rose") return "Rosa";
  if (theme === "dawn") return "Alba";
  if (theme === "aurora") return "Aurora";
  if (theme === "midnight") return "Medianoche";
  if (theme === "ember") return "Brasa";
  if (theme === "lagoon") return "Laguna";
  return "Eclipse";
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

function readState(): AtlasState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    return normalizeAtlasState(JSON.parse(raw)) ?? DEFAULT_STATE;
  } catch {
    return DEFAULT_STATE;
  }
}

export function App() {
  const initial = useMemo(() => readState(), []);
  const [skies, setSkies] = useState(initial.skies);
  const [stars, setStars] = useState(initial.stars);
  const [constellations, setConstellations] = useState(initial.constellations);
  const [activeSkyId, setActiveSkyId] = useState(initial.activeSkyId);
  const [labelMode, setLabelMode] = useState<LabelMode>(initial.labelMode);
  const [composer, setComposer] = useState<ComposerDraft>({ title: "", note: "" });
  const [composerOpen, setComposerOpen] = useState(false);
  const [birthEffect, setBirthEffect] = useState<BirthEffect | null>(null);
  const [selectedStarId, setSelectedStarId] = useState<string | null>(null);
  const [starEditor, setStarEditor] = useState<StarEditorDraft | null>(null);
  const [editingSky, setEditingSky] = useState(false);
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
  const [draggedSkyId, setDraggedSkyId] = useState<string | null>(null);
  const [dropSkyId, setDropSkyId] = useState<string | null>(null);
  const [pendingSkyAction, setPendingSkyAction] = useState<PendingSkyAction>(null);

  const skyPanelRef = useRef<HTMLDivElement | null>(null);
  const skyRailRef = useRef<HTMLDivElement | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const composerTitleRef = useRef<HTMLInputElement | null>(null);
  const dragSessionRef = useRef<DragSession | null>(null);
  const renderedStarsRef = useRef<Star[]>([]);
  const activeConstellationsRef = useRef<Constellation[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      STORAGE_KEY,
        JSON.stringify({
          skies,
          stars,
          constellations,
          activeSkyId,
          labelMode: skies.find((sky) => sky.id === activeSkyId)?.showTitles === false ? "hidden" : "titles",
        }),
      );
  }, [activeSkyId, constellations, labelMode, skies, stars]);

  useEffect(() => {
    setSelectedStarId(null);
    setStarEditor(null);
    setEditingSky(false);
    setComposerOpen(false);
    setConstellationMode(false);
    setEditingConstellationId(null);
    setDraftConstellationName("");
    setDraftConstellationStarIds([]);
    setSkyMenuId(null);
    setPendingConstellationJoin(null);
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
  const activeConstellations = useMemo(() => constellations.filter((item) => item.skyId === activeSkyId), [activeSkyId, constellations]);
  const selectedStar = useMemo(() => renderedStars.find((star) => star.id === selectedStarId) ?? null, [renderedStars, selectedStarId]);
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
  const selectedStarConstellations = useMemo(
    () => (selectedStar ? activeConstellations.filter((constellation) => constellation.starIds.includes(selectedStar.id)) : []),
    [activeConstellations, selectedStar],
  );
  const selectedStarHasDistinctNote = useMemo(
    () => (selectedStar ? hasDistinctNote(selectedStar.note, selectedStar.title) : false),
    [selectedStar],
  );
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
  const canCreateStar =
    !birthEffect &&
    !skyFull &&
    sanitizeTitle(composer.title).length > 0 &&
    sanitizeTitle(composer.title).length <= MAX_TITLE &&
    composer.note.trim().length <= MAX_NOTE;

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
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (target.closest(".sky-tab-menu") || target.closest(".sky-tab-menu-button")) return;
      setSkyMenuId(null);
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

  function deleteActiveSky() {
    if (skies.length <= 1) {
      setOverlayPanel(null);
      return;
    }

    const remainingSkies = skies.filter((sky) => sky.id !== activeSkyId);
    const nextSky = remainingSkies[0];
    if (!nextSky) return;

    setSkies(remainingSkies);
    setStars((current) => current.filter((star) => star.skyId !== activeSkyId));
    setConstellations((current) => current.filter((item) => item.skyId !== activeSkyId));
    setActiveSkyId(nextSky.id);
    setSelectedStarId(null);
    setStarEditor(null);
    setConstellationMode(false);
    setEditingConstellationId(null);
    setDraftConstellationName("");
    setDraftConstellationStarIds([]);
    setBirthEffect((current) => (current?.star.skyId === activeSkyId ? null : current));
    setPendingConstellationJoin(null);
    setOverlayPanel(null);
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
    setDismissedSkyGuides((current) => current.filter((skyId) => skyId !== nextSky.id));
    closeOverlay();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canCreateStar) return;
    const title = safeTitle(composer.title, composer.note);
    const note = sanitizeNote(composer.note);
    const visualIndex = activeStars.length;
    const visual = {
      color: COLORS[visualIndex % COLORS.length],
      size: SIZES[visualIndex % SIZES.length],
      shape: SHAPES[visualIndex % SHAPES.length],
    };
    const spot = findSpot(title, activeStars);
    setBirthEffect({
      star: {
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
      },
      startX: 50,
      startY: 90,
    });
    setComposer({ title: "", note: "" });
    setComposerOpen(false);
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
  }

  function focusComposer() {
    setSurfaceMode("sky");
    setDismissedSkyGuides((current) => (current.includes(activeSkyId) ? current : [...current, activeSkyId]));
    setSelectedStarId(null);
    setStarEditor(null);
    setEditingSky(false);
    setComposerOpen(true);
    setConstellationMode(false);
    setEditingConstellationId(null);
    setDraftConstellationName("");
    setDraftConstellationStarIds([]);
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

  function beginEditSelectedStar() {
    if (!selectedStar) return;
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
    setStarEditor(null);
  }

  const editorPreviewTitle = starEditor ? safeTitle(starEditor.title, starEditor.note) : "";
  const editorPreviewNote = starEditor ? sanitizeNote(starEditor.note) : "";

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
  }

  function openSkyMenuAction(skyId: string, mode: "composer" | "constellation") {
    setSkyMenuId(null);

    if (skyId === activeSkyId) {
      if (mode === "composer") {
        focusComposer();
      } else {
        startConstellationMode();
      }
      return;
    }

    setPendingSkyAction({ skyId, mode });
    setActiveSkyId(skyId);
  }

  function handleSkyDragStart(event: ReactDragEvent<HTMLDivElement>, skyId: string) {
    setDraggedSkyId(skyId);
    setDropSkyId(skyId);
    setSkyMenuId(null);
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
    <main className="app-shell">
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

        <div className="toolbar-actions">
          <button
            className={`toolbar-button toolbar-button-violet${surfaceMode === "journal" ? " toolbar-button-active" : ""}`}
            onClick={() => (surfaceMode === "journal" ? setSurfaceMode("sky") : openJournal())}
            type="button"
          >
            {surfaceMode === "journal" ? "\u{1F30C} Cielo" : "\u{1F4DD} Diario"}
          </button>
          <button className="toolbar-button toolbar-button-help" onClick={() => setOverlayPanel("help")} type="button">
            {"\u2754 Ayuda"}
          </button>
          <button className="toolbar-button toolbar-button-gold" onClick={() => setOverlayPanel("backup")} type="button">
            {"\u2B07 Backup"}
          </button>
        </div>
      </header>

      <div className="atlas-layout">
        <aside className="sky-rail">
          <div className="sky-rail-head">
            <div>
              <span className="sky-rail-summary">{skies.length} cielos en tu archivo</span>
            </div>
          </div>

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
                      onClick={() => {
                        setActiveSkyId(sky.id);
                        setSkyMenuId(null);
                      }}
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
                        setSkyMenuId((current) => (current === sky.id ? null : sky.id));
                      }}
                      type="button"
                    >
                      ⋯
                    </button>
                    {skyMenuId === sky.id ? (
                      <div className="sky-tab-menu">
                        <button className="sky-tab-menu-item" onClick={() => openSkyMenuAction(sky.id, "composer")} type="button">
                          ✦ Nueva estrella
                        </button>
                        <button className="sky-tab-menu-item" onClick={() => openSkyMenuAction(sky.id, "constellation")} type="button">
                          ☄ Constelar
                        </button>
                        <button className="sky-tab-menu-item" onClick={() => toggleSkyTitles(sky.id)} type="button">
                          {sky.showTitles ? "🏷 Titulos: si" : "🏷 Titulos: no"}
                        </button>
                      </div>
                    ) : null}
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
              <p className="journal-copy">Entradas ordenadas por fecha, con lectura tranquila y edicion fuera del cielo.</p>
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
                        <span className="journal-entry-preview">{excerpt(star.note || star.title)}</span>
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
                    <button className="mini-tool-button" onClick={editingSelectedStar ? cancelStarEditor : beginEditSelectedStar} type="button">
                      {editingSelectedStar ? "✕ Cerrar" : "✎ Editar"}
                    </button>
                  </div>

                  {editingSelectedStar && starEditor ? (
                    <>
                      <label htmlFor="journal-edit-title">Titulo</label>
                      <input
                        id="journal-edit-title"
                        maxLength={MAX_TITLE}
                        type="text"
                        value={starEditor.title}
                        onChange={(event) => setStarEditor((current) => (current ? { ...current, title: event.target.value } : current))}
                      />

                      <label htmlFor="journal-edit-note">Nota</label>
                      <textarea
                        id="journal-edit-note"
                        maxLength={MAX_NOTE}
                        rows={6}
                        value={starEditor.note}
                        onChange={(event) => setStarEditor((current) => (current ? { ...current, note: event.target.value } : current))}
                      />

                      <div className="field-meta">
                        <span className={starEditor.title.length > SOFT_TITLE ? "field-warning" : ""}>{starEditor.title.length}/{MAX_TITLE}</span>
                        <span className={starEditor.note.length > SOFT_NOTE ? "field-warning" : ""}>{starEditor.note.length}/{MAX_NOTE}</span>
                      </div>

                      <div className="editor-preview-card">
                        <span className="editor-label">Vista previa</span>
                        <div className="editor-preview-scene">
                          <span
                            className={`atlas-star editor-preview-star atlas-star-${starEditor.size} atlas-star-${starEditor.shape}`}
                            style={{ color: starColorValue(starEditor.color, starEditor.customColor) }}
                          />
                          <div className="editor-preview-copy">
                            <strong>{editorPreviewTitle}</strong>
                            <span>{excerpt(editorPreviewNote || editorPreviewTitle, 54)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="editor-group">
                        <span className="editor-label">Aspecto</span>
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
                        <input
                          id="journal-custom-color"
                          type="color"
                          value={starEditor.customColor ?? "#ff8dc9"}
                          onChange={(event) => setStarEditor((current) => (current ? { ...current, color: "custom", customColor: event.target.value } : current))}
                        />
                        <div className="shape-row">
                          {(["orb", "diamond", "spark", "heart"] as StarShape[]).map((shape) => (
                            <button
                              key={shape}
                              aria-pressed={starEditor.shape === shape}
                              className={`shape-button${starEditor.shape === shape ? " shape-button-active" : ""}`}
                              onClick={() => setStarEditor((current) => (current ? { ...current, shape } : current))}
                              type="button"
                            >
                              {starEditor.shape === shape ? `✦ ${shapeText(shape)}` : shapeText(shape)}
                            </button>
                          ))}
                        </div>
                        <div className="shape-row">
                          {(["s", "m", "l"] as StarSize[]).map((size) => (
                            <button
                              key={size}
                              aria-pressed={starEditor.size === size}
                              className={`shape-button${starEditor.size === size ? " shape-button-active" : ""}`}
                              onClick={() => setStarEditor((current) => (current ? { ...current, size } : current))}
                              type="button"
                            >
                              {starEditor.size === size ? `✦ ${sizeText(size)}` : sizeText(size)}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="button-row">
                        <button className="toolbar-button" onClick={saveStarEditor} type="button">
                          Guardar cambios
                        </button>
                        <button className="toolbar-button toolbar-button-danger" onClick={() => setOverlayPanel("delete-star")} type="button">
                          {"\u{1F5D1} Borrar estrella"}
                        </button>
                        <button className="toolbar-button toolbar-button-ghost" onClick={cancelStarEditor} type="button">
                          Cancelar
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="journal-meta-row">
                        <span>{formatDate(selectedStar.createdAt)}</span>
                        <span>{displaySkyName(activeSky.name)}</span>
                        <span>{toneText(selectedStar.color)}</span>
                      </div>

                      <div className="journal-note-sheet">
                        <p>{selectedStar.note || "Esta entrada aun no tiene una nota larga asociada."}</p>
                      </div>

                      <div className="button-row">
                        <button className="toolbar-button toolbar-button-ghost" onClick={() => setSurfaceMode("sky")} type="button">
                          Volver al cielo
                        </button>
                        <button className="toolbar-button toolbar-button-danger" onClick={() => setOverlayPanel("delete-star")} type="button">
                          {"\u{1F5D1} Borrar estrella"}
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
      ) : (
      <section className="workspace">
        <div className="sky-frame">
          <div className="sky-header">
            <div className="sky-header-copy">
              <div className="sky-header-title-row">
                <strong>{displaySkyName(activeSky.name)}</strong>
                <span className="sky-header-summary">
                  {usedCapacity}/{activeSky.capacity} luces · {activeConstellations.length} constelaciones
                </span>
              </div>
            </div>
          </div>

          <div key={activeSkyId} className="sky-panel" data-theme={activeSky.theme} onPointerDown={handleSkyBackgroundPointerDown} ref={skyPanelRef}>
            <div className="sky-gradient" />
            <div className="sky-veil" />
            <div className="sky-nebula sky-nebula-a" />
            <div className="sky-nebula sky-nebula-b" />
            <div className="sky-nebula sky-nebula-c" />

            {showSkyGuide ? (
              <div className="sky-focus-guide">
                <button
                  aria-label="Cerrar ayuda del cielo"
                  className="sky-guide-close"
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
                <span>Usa Constelar para dibujar relaciones entre varias luces.</span>
              </div>
            ) : null}

            {constellationMode ? <div className="sky-mode-banner">Selecciona estrellas en orden y guarda la constelacion.</div> : null}

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

              {constellationPaths.map((path, index) => (
                <g key={`constellation-${index}`} className="constellation-group">
                  <path className="constellation-glow" d={path} />
                  <path className="constellation-core" d={path} />
                </g>
              ))}

              {draftPath ? (
                <g className="constellation-group constellation-preview">
                  <path className="constellation-glow" d={draftPath} />
                  <path className="constellation-core" d={draftPath} />
                </g>
              ) : null}
            </svg>

            {renderedStars.map((star, index) => (
              <motion.button
                key={star.id}
                className={`atlas-star atlas-star-${star.size} atlas-star-${star.color} atlas-star-${star.shape}${selectedStarId === star.id ? " atlas-star-selected" : ""}${draftConstellationStarIds.includes(star.id) ? " atlas-star-linked" : ""}${draggingStarId === star.id ? " atlas-star-dragging" : ""}`}
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
          </div>
        </div>

        <aside className="inspector-panel">
          <div className="inspector-panel-body">
          {constellationMode ? (
            <>
              <section className="inspector-card">
                <p className="panel-label">{editingConstellation ? "Editar constelacion" : "Modo constelacion"}</p>
                <p className="inspector-compact-lead">{editingConstellation ? "Ajusta una constelacion existente." : "Une estrellas en un orden propio."}</p>
                <p className="inspector-compact-copy">
                  {editingConstellation
                    ? "Puedes anadir o quitar estrellas y renombrar la constelacion desde aqui."
                    : "Selecciona dos o mas estrellas del cielo activo. La linea se dibuja recta entre sus centros."}
                </p>

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
                          {star.title}
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
                      <button className="mini-tool-button" onClick={() => setSelectedStarId(null)} type="button">
                        ✕ Cerrar
                      </button>
                    </div>
                  )}
                </div>

                {editingSelectedStar && starEditor ? (
                  <>
                    <label htmlFor="edit-title">Titulo</label>
                    <input
                      id="edit-title"
                      maxLength={MAX_TITLE}
                      type="text"
                      value={starEditor.title}
                      onChange={(event) => setStarEditor((current) => (current ? { ...current, title: event.target.value } : current))}
                    />

                    <label htmlFor="edit-note">Nota</label>
                    <textarea
                      id="edit-note"
                      maxLength={MAX_NOTE}
                      rows={6}
                      value={starEditor.note}
                      onChange={(event) => setStarEditor((current) => (current ? { ...current, note: event.target.value } : current))}
                    />

                    <div className="field-meta">
                      <span className={starEditor.title.length > SOFT_TITLE ? "field-warning" : ""}>{starEditor.title.length}/{MAX_TITLE}</span>
                      <span className={starEditor.note.length > SOFT_NOTE ? "field-warning" : ""}>{starEditor.note.length}/{MAX_NOTE}</span>
                    </div>

                    <div className="editor-preview-card">
                      <span className="editor-label">Vista previa</span>
                      <div className="editor-preview-scene">
                        <span
                          className={`atlas-star editor-preview-star atlas-star-${starEditor.size} atlas-star-${starEditor.shape}`}
                          style={{ color: starColorValue(starEditor.color, starEditor.customColor) }}
                        />
                        <div className="editor-preview-copy">
                          <strong>{editorPreviewTitle}</strong>
                          <span>{excerpt(editorPreviewNote || editorPreviewTitle, 54)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="editor-group">
                      <span className="editor-label">Aspecto</span>
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

                      <input
                        id="custom-color"
                        type="color"
                        value={starEditor.customColor ?? "#ff8dc9"}
                        onChange={(event) => setStarEditor((current) => (current ? { ...current, color: "custom", customColor: event.target.value } : current))}
                      />

                      <div className="shape-row">
                        {(["orb", "diamond", "spark", "heart"] as StarShape[]).map((shape) => (
                          <button
                            key={shape}
                            aria-pressed={starEditor.shape === shape}
                            className={`shape-button${starEditor.shape === shape ? " shape-button-active" : ""}`}
                            onClick={() => setStarEditor((current) => (current ? { ...current, shape } : current))}
                            type="button"
                          >
                            {starEditor.shape === shape ? `✦ ${shapeText(shape)}` : shapeText(shape)}
                          </button>
                        ))}
                      </div>

                      <div className="shape-row">
                        {(["s", "m", "l"] as StarSize[]).map((size) => (
                          <button
                            key={size}
                            aria-pressed={starEditor.size === size}
                            className={`shape-button${starEditor.size === size ? " shape-button-active" : ""}`}
                            onClick={() => setStarEditor((current) => (current ? { ...current, size } : current))}
                            type="button"
                          >
                            {starEditor.size === size ? `✦ ${sizeText(size)}` : sizeText(size)}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button className="inline-toggle" onClick={() => setStarEditor((current) => (current ? { ...current, showTitle: !current.showTitle } : current))} type="button">
                      {starEditor.showTitle ? "Ocultar titulo en el cielo" : "Mostrar titulo en el cielo"}
                    </button>

                    <div className="button-row">
                      <button className="toolbar-button" onClick={saveStarEditor} type="button">
                        Guardar
                      </button>
                      <button className="toolbar-button toolbar-button-ghost" onClick={cancelStarEditor} type="button">
                        Cancelar
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    {selectedStarHasDistinctNote ? (
                      <div className="reading-note">
                        <p>{selectedStar.note}</p>
                      </div>
                    ) : null}

                    <div className="info-lines">
                      <p><strong>Color:</strong> {toneText(selectedStar.color)}</p>
                      <p><strong>Forma:</strong> {shapeText(selectedStar.shape)} · <strong>Tamano:</strong> {sizeText(selectedStar.size)}</p>
                      <p><strong>Creada:</strong> {formatDate(selectedStar.createdAt)}</p>
                    </div>

                    <div className="subtle-link-row">
                      <button className="subtle-link-button" onClick={requestMoveSelectedStar} type="button">
                        {"\u2197 Mover de cielo"}
                      </button>
                      <button className="subtle-link-button" onClick={openJournal} type="button">
                        {"\u{1F4DD} Abrir en diario"}
                      </button>
                    </div>
                  </>
                )}
              </section>

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

              <section className="inspector-card">
                <div className="card-title-row">
                  <div>
                    <h2>{displaySkyName(activeSky.name)}</h2>
                  </div>
                  <button className="mini-tool-button" onClick={() => setEditingSky((current) => !current)} type="button">
                    {editingSky ? "✕ Cerrar" : "✎ Editar"}
                  </button>
                </div>

                {editingSky ? (
                  <>
                    <label htmlFor="sky-name">Nombre del cielo</label>
                    <input id="sky-name" type="text" value={activeSky.name} onChange={(event) => updateSky((current) => ({ ...current, name: event.target.value }))} />

                    <div className="editor-group">
                      <span className="editor-label">Tema visual</span>
                      <div className="shape-row">
                        {THEMES.map((theme) => (
                          <button
                            key={theme}
                            aria-pressed={activeSky.theme === theme}
                            className={`theme-button${activeSky.theme === theme ? " theme-button-active" : ""}`}
                            onClick={() => updateSky((current) => ({ ...current, theme }))}
                            type="button"
                          >
                            {activeSky.theme === theme ? `✦ ${themeText(theme)}` : themeText(theme)}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="button-row">
                      <button className="toolbar-button toolbar-button-danger" disabled={skies.length <= 1} onClick={() => setOverlayPanel("delete-sky")} type="button">
                        {"\u{1F5D1} Borrar cielo"}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="info-lines">
                      <p><strong>Capacidad:</strong> {activeStars.length}/{activeSky.capacity} estrellas.</p>
                      <p><strong>Constelaciones:</strong> {activeConstellations.length} tejidas.</p>
                      <p><strong>Tema:</strong> {themeText(activeSky.theme)}.</p>
                    </div>

                    <p className="inspector-helper">Constelaciones tejidas en este cielo</p>
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
                        <p className="selection-empty">Aun no has tejido constelaciones en este cielo.</p>
                      )}
                    </div>
                  </>
                )}
              </section>
            </>
          )}
          </div>

          <div className="inspector-panel-footer">
            <button
              className={`toolbar-button toolbar-button-primary inspector-rail-create${composerOpen ? " inspector-rail-create-active" : ""}`}
              disabled={Boolean(birthEffect) || skyFull}
              onClick={focusComposer}
              type="button"
            >
              {birthEffect ? "Sembrando luz..." : skyFull ? "✦ Cielo lleno" : "✦ Nueva estrella"}
            </button>
          </div>
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
                    <p>Puedes mover las estrellas, cambiar su color y forma, y seleccionar varias para tejer una constelacion manual.</p>
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
                      Se borrara <strong>{displaySkyName(activeSky.name)}</strong> junto con sus {activeStars.length} estrellas y {activeConstellations.length} constelaciones.
                    </p>
                    <p>Esta accion no se puede deshacer desde la app. Si quieres conservarlo, exporta antes un backup.</p>
                    {skies.length <= 1 ? <p>Necesitas al menos un cielo en el atlas, asi que no puedes borrar el unico cielo disponible.</p> : null}
                  </div>

                  <div className="button-row">
                    <button className="toolbar-button toolbar-button-danger" disabled={skies.length <= 1} onClick={deleteActiveSky} type="button">
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
    </main>
  );
}
