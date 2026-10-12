'use client';

/**
 * Conway Game of Life signature band rendered in the apps/web footer.
 *
 * Decorative only, not content. `<ConwayBand />` is the entry point
 * imported by the footer. It renders the visual grid (`<ConwayGrid />`,
 * aria-hidden).
 *
 * Wiring rules:
 *   - Navigation reseeds: `<ConwayGrid />` is keyed by `pathname` in
 *     `<ConwayBand />`. Every client-side navigation remounts the grid,
 *     resetting all state and seeding with a fresh `Math.random` draw.
 *     Query strings do NOT change `pathname` and therefore do NOT reseed.
 *   - `useReducedMotion()` freezes the grid when the user has the OS
 *     reduced-motion flag on. The simulation and the injection timer are
 *     both suspended. The seed runs so the band has a frozen initial frame.
 *   - `IntersectionObserver` suspends when scrolled off-screen.
 *   - `document.visibilityState` suspends when the tab is hidden.
 *   - The simulation reaches a fixed point when `stepGrid(current)`
 *     equals `current` cell-by-cell. The reducer switches `mode` to
 *     `"stable"`; the next Conway step is a no-op until the next
 *     injection reactivates it.
 *   - Pattern injection: every 8-15 seconds (first injection 8-12s after
 *     seed), the timer attempts to drop a glider, LWSS, or R-pentomino
 *     into an empty rectangle (with a 2-cell margin) anywhere in the
 *     grid. The placement is rejected if no such rectangle exists after
 *     5 attempts; in that case the next attempt is rescheduled in 1s.
 *     Injection is orthogonal to `mode`: oscillators and still lives both
 *     receive injections on the same schedule.
 *   - Suspension preserves the remaining delay. The countdown only
 *     decrements when the component is not suspended.
 *
 * Performance: at 1200px wide, the grid is `~150 cols × 30 rows`
 * (~4 500 cells, ~4.4 KiB `Uint8Array`). The live-cell count varies by
 * seed but is roughly bounded by the cell count. The timer calls
 * `dispatch` with a pure reducer; the countdown and grid are mirrored
 * to refs so the interval is set up once per (cols, visibility)
 * change — not on every tick.
 *
 * Exports:
 *   - `<ConwayBand />`            — the only thing the footer imports.
 *   - `<ConwayGrid />`             — visual grid (aria-hidden).
 *   - `seedGrid` / `stepGrid` / `gridsEqual` / `centerIndex` / `countLive`
 *     — pure functions, unit-testable in isolation.
 *   - `patternCells` / `canPlaceEmpty` / `injectPattern` / `pickInjection`
 *     — pure functions used by the injection path, also unit-testable.
 *
 * Note: the `errors` repo does not depend on `motion/react`. The FP
 * version uses `useReducedMotion` from that package; this file uses a
 * hand-rolled `useReducedMotion()` over `matchMedia` so the same
 * behavior is preserved without adding a dependency.
 */

import * as React from 'react';
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';

const CELL_SIZE = 8;
const HEIGHT = 240;
const ROWS = Math.floor(HEIGHT / CELL_SIZE);
const TICK_MS = 100;
const INJECTION_MARGIN = 2;
const INJECTION_ATTEMPTS = 5;
const INJECTION_RETRY_DELAY = 1_000;
const INJECTION_RETRY_TICKS = Math.round(INJECTION_RETRY_DELAY / TICK_MS);
const FIRST_INJECTION_TICKS_MIN = 80;
const FIRST_INJECTION_TICKS_MAX = 120;
const NEXT_INJECTION_TICKS_MIN = 80;
const NEXT_INJECTION_TICKS_MAX = 150;

/**
 * Hand-rolled `useReducedMotion` — returns the OS-level reduced-motion
 * preference. The `motion/react` package is not a dependency here, so
 * we wrap `window.matchMedia('(prefers-reduced-motion: reduce)')`
 * directly. Returns `false` during SSR, then subscribes to changes.
 *
 * The initial value is read lazily through `useSyncExternalStore` so
 * the effect doesn't call `setState` synchronously on mount (which
 * the React hooks lint rule flags as a cascading-render risk).
 */
function useReducedMotion(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window === 'undefined' || !window.matchMedia) return () => undefined;
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      const handler = () => onChange();
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    },
    () =>
      typeof window === 'undefined' || !window.matchMedia
        ? false
        : window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    () => false
  );
}

export function centerIndex(cols: number, rows: number): number {
  return Math.floor(rows / 2) * cols + Math.floor(cols / 2);
}

export function countLive(grid: Uint8Array): number {
  let n = 0;
  for (let i = 0; i < grid.length; i++) if (grid[i] === 1) n++;
  return n;
}

export function pointerToCell(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number },
  cols: number,
  rows: number
): { col: number; row: number } | null {
  if (cols <= 0 || rows <= 0) return null;
  if (rect.width <= 0 || rect.height <= 0) return null;
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  if (x < 0 || y < 0 || x >= rect.width || y >= rect.height) return null;
  const col = Math.floor((x / rect.width) * cols);
  const row = Math.floor((y / rect.height) * rows);
  if (!Number.isInteger(col) || !Number.isInteger(row)) return null;
  if (col < 0 || col >= cols || row < 0 || row >= rows) return null;
  return { col, row };
}

export function drawLine(x0: number, y0: number, x1: number, y1: number): Array<[number, number]> {
  if (x0 === x1 && y0 === y1) return [[x0, y0]];
  const cells: Array<[number, number]> = [[x0, y0]];
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  let x = x0;
  let y = y0;
  const maxIter = dx + dy + 2;
  let i = 0;
  while (i++ < maxIter) {
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
    cells.push([x, y]);
  }
  return cells;
}

export function seedGrid(cols: number, rows: number, rng: () => number): Uint8Array {
  const grid = new Uint8Array(cols * rows);
  const centerCol = cols > 0 ? (cols - 1) / 2 : 0;
  const maxDistance = Math.max(centerCol, 1);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const distance = Math.abs(c - centerCol) / maxDistance;
      const probability = 0.05 + (1 - distance ** 2) * 0.45;
      grid[r * cols + c] = rng() < probability ? 1 : 0;
    }
  }

  if (countLive(grid) === 0 && grid.length > 0) {
    grid[centerIndex(cols, rows)] = 1;
  }

  return grid;
}

export function stepGrid(grid: Uint8Array, cols: number, rows: number): Uint8Array {
  return stepWithTopology(grid, createTopology(cols, rows)).grid;
}

export type ConwayTopology = {
  cols: number;
  rows: number;
  left: Int32Array;
  right: Int32Array;
  above: Int32Array;
  below: Int32Array;
};

export function createTopology(cols: number, rows: number): ConwayTopology {
  const left = new Int32Array(cols);
  const right = new Int32Array(cols);
  const above = new Int32Array(rows);
  const below = new Int32Array(rows);

  for (let c = 0; c < cols; c++) {
    left[c] = c === 0 ? cols - 1 : c - 1;
    right[c] = c === cols - 1 ? 0 : c + 1;
  }

  for (let r = 0; r < rows; r++) {
    above[r] = (r === 0 ? rows - 1 : r - 1) * cols;
    below[r] = (r === rows - 1 ? 0 : r + 1) * cols;
  }

  return { cols, rows, left, right, above, below };
}

export function stepWithTopology(
  grid: Uint8Array,
  topology: ConwayTopology
): { grid: Uint8Array; changed: boolean } {
  const { cols, rows, left, right, above, below } = topology;
  const next = new Uint8Array(grid.length);
  let changed = false;

  for (let r = 0; r < rows; r++) {
    const row = r * cols;
    const up = above[r] ?? 0;
    const down = below[r] ?? 0;

    for (let c = 0; c < cols; c++) {
      const l = left[c] ?? 0;
      const rr = right[c] ?? 0;
      const idx = row + c;

      const neighbours =
        (grid[up + l] ?? 0) +
        (grid[up + c] ?? 0) +
        (grid[up + rr] ?? 0) +
        (grid[row + l] ?? 0) +
        (grid[row + rr] ?? 0) +
        (grid[down + l] ?? 0) +
        (grid[down + c] ?? 0) +
        (grid[down + rr] ?? 0);

      const alive = grid[idx] ?? 0;
      const value = neighbours === 3 || (alive === 1 && neighbours === 2) ? 1 : 0;

      next[idx] = value;
      if (value !== alive) changed = true;
    }
  }

  return { grid: next, changed };
}

export function gridsEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

export type ConwayPattern = 'glider' | 'lwss-h' | 'r-pentomino';

const PATTERN_META: Readonly<
  Record<
    ConwayPattern,
    {
      cells: ReadonlyArray<readonly [number, number]>;
      width: number;
      height: number;
    }
  >
> = (() => {
  const build = (
    cells: ReadonlyArray<readonly [number, number]>
  ): { cells: ReadonlyArray<readonly [number, number]>; width: number; height: number } => {
    let width = 0;
    let height = 0;
    for (const [c, r] of cells) {
      if (c + 1 > width) width = c + 1;
      if (r + 1 > height) height = r + 1;
    }
    return { cells, width, height };
  };
  return {
    glider: build([
      [1, 0],
      [2, 1],
      [0, 2],
      [1, 2],
      [2, 2],
    ]),
    'lwss-h': build([
      [1, 0],
      [4, 0],
      [0, 1],
      [0, 2],
      [4, 2],
      [0, 3],
      [1, 3],
      [2, 3],
      [3, 3],
    ]),
    'r-pentomino': build([
      [1, 0],
      [2, 0],
      [0, 1],
      [1, 1],
      [1, 2],
    ]),
  };
})();

export function patternCells(pattern: ConwayPattern): ReadonlyArray<readonly [number, number]> {
  return PATTERN_META[pattern].cells;
}

export function patternWidth(pattern: ConwayPattern): number {
  return PATTERN_META[pattern].width;
}

export function patternHeight(pattern: ConwayPattern): number {
  return PATTERN_META[pattern].height;
}

export function canPlaceEmpty(
  grid: Uint8Array,
  cols: number,
  rows: number,
  x: number,
  y: number,
  pattern: ConwayPattern,
  margin: number
): boolean {
  const meta = PATTERN_META[pattern];
  const x0 = x - margin;
  const y0 = y - margin;
  const x1 = x + meta.width + margin;
  const y1 = y + meta.height + margin;
  if (x0 < 0 || y0 < 0 || x1 > cols || y1 > rows) return false;
  for (let r = y0; r < y1; r++) {
    for (let c = x0; c < x1; c++) {
      if (grid[r * cols + c] === 1) return false;
    }
  }
  return true;
}

export function injectPattern(
  grid: Uint8Array,
  cols: number,
  rows: number,
  x: number,
  y: number,
  pattern: ConwayPattern
): Uint8Array {
  const next = new Uint8Array(grid);
  for (const [dc, dr] of PATTERN_META[pattern].cells) {
    const c = x + dc;
    const r = y + dr;
    if (r < 0 || r >= rows || c < 0 || c >= cols) continue;
    next[r * cols + c] = 1;
  }
  return next;
}

const PATTERN_KEYS: ReadonlyArray<ConwayPattern> = ['glider', 'lwss-h', 'r-pentomino'];

export function pickInjection(
  grid: Uint8Array,
  cols: number,
  rows: number,
  rng: () => number,
  maxAttempts: number = INJECTION_ATTEMPTS
): { pattern: ConwayPattern; x: number; y: number } | null {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const pattern = PATTERN_KEYS[Math.floor(rng() * PATTERN_KEYS.length)];
    if (!pattern) continue;
    const meta = PATTERN_META[pattern];
    const xRange = cols - meta.width - 2 * INJECTION_MARGIN + 1;
    const yRange = rows - meta.height - 2 * INJECTION_MARGIN + 1;
    if (xRange <= 0 || yRange <= 0) continue;
    const x = Math.floor(rng() * xRange) + INJECTION_MARGIN;
    const y = Math.floor(rng() * yRange) + INJECTION_MARGIN;
    if (canPlaceEmpty(grid, cols, rows, x, y, pattern, INJECTION_MARGIN)) {
      return { pattern, x, y };
    }
  }
  return null;
}

type SimState = {
  cols: number;
  rows: number;
  grid: Uint8Array;
  mode: 'active' | 'stable';
  topology: ConwayTopology;
};

type SimAction =
  | { type: 'STEP' }
  | { type: 'INJECT'; pattern: ConwayPattern; x: number; y: number }
  | { type: 'SEED'; grid: Uint8Array; cols: number; rows: number }
  | { type: 'DRAW'; cells: ReadonlyArray<readonly [number, number]> };

function simReducer(state: SimState, action: SimAction): SimState {
  switch (action.type) {
    case 'SEED':
      return {
        cols: action.cols,
        rows: action.rows,
        grid: action.grid,
        mode: 'active',
        topology: createTopology(action.cols, action.rows),
      };
    case 'STEP': {
      if (state.mode !== 'active') return state;
      if (state.cols < 3 || state.rows < 3) return state;
      const result = stepWithTopology(state.grid, state.topology);
      if (!result.changed) {
        return { ...state, mode: 'stable' };
      }
      return { ...state, grid: result.grid };
    }
    case 'INJECT': {
      if (
        !canPlaceEmpty(
          state.grid,
          state.cols,
          state.rows,
          action.x,
          action.y,
          action.pattern,
          INJECTION_MARGIN
        )
      ) {
        return state;
      }
      const next = injectPattern(
        state.grid,
        state.cols,
        state.rows,
        action.x,
        action.y,
        action.pattern
      );
      if (gridsEqual(state.grid, next)) {
        return state;
      }
      return { ...state, grid: next, mode: 'active' };
    }
    case 'DRAW': {
      let next: Uint8Array | null = null;
      for (const cell of action.cells) {
        const col = cell[0];
        const row = cell[1];
        if (!Number.isInteger(col) || !Number.isInteger(row)) continue;
        if (col < 0 || col >= state.cols || row < 0 || row >= state.rows) continue;
        const idx = row * state.cols + col;
        if (state.grid[idx] === 1) continue;
        if (next === null) next = new Uint8Array(state.grid);
        next[idx] = 1;
      }
      if (next === null) return state;
      return { ...state, grid: next, mode: 'active' };
    }
  }
}

const INITIAL_SIM: SimState = {
  cols: 0,
  rows: 0,
  grid: new Uint8Array(0),
  mode: 'active',
  topology: createTopology(0, 0),
};

function randomInRange(min: number, max: number, rng: () => number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

type LiveCellsProps = {
  grid: Uint8Array;
  cols: number;
  rows: number;
  columnOpacity: Float64Array;
};

const LiveCells = React.memo(function LiveCells({
  grid,
  cols,
  rows,
  columnOpacity,
}: LiveCellsProps) {
  const paths = useMemo(() => {
    if (cols === 0 || rows === 0 || grid.length !== cols * rows) {
      return [] as Array<{ col: number; d: string }>;
    }
    const out: Array<{ col: number; d: string }> = [];
    for (let c = 0; c < cols; c++) {
      const x = c * CELL_SIZE;
      const commands: string[] = [];
      for (let r = 0; r < rows; r++) {
        if (grid[r * cols + c] !== 1) continue;
        const y = r * CELL_SIZE;
        commands.push(`M${x},${y}h${CELL_SIZE}v${CELL_SIZE}h-${CELL_SIZE}Z`);
      }
      if (commands.length > 0) {
        out.push({ col: c, d: commands.join('') });
      }
    }
    return out;
  }, [grid, cols, rows]);

  return (
    <g fill="currentColor" pointerEvents="none">
      {paths.map(({ col, d }) => (
        <path key={col} d={d} fillOpacity={columnOpacity[col] ?? 0} />
      ))}
    </g>
  );
});

export function ConwayGrid({ className }: { className?: string }) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  const [sim, dispatch] = useReducer(simReducer, INITIAL_SIM);
  const cols = sim.cols;
  const rows = sim.rows;
  const grid = sim.grid;

  const [isInView, setIsInView] = useState(true);
  const [docVisible, setDocVisible] = useState<boolean>(
    typeof document === 'undefined' ? true : document.visibilityState === 'visible'
  );

  const gridRef = useRef<Uint8Array>(sim.grid);
  const modeRef = useRef<SimState['mode']>(sim.mode);
  const countdownRef = useRef<number>(0);

  const columnOpacity = useMemo<Float64Array>(() => {
    const out = new Float64Array(cols);
    if (cols === 0) return out;
    const centerCol = (cols - 1) / 2;
    const maxDistance = Math.max(centerCol, 1);
    for (let c = 0; c < cols; c++) {
      const distance = Math.abs(c - centerCol) / maxDistance;
      out[c] = 0.05 + (1 - distance * distance) * 0.95;
    }
    return out;
  }, [cols]);

  useEffect(() => {
    gridRef.current = sim.grid;
    modeRef.current = sim.mode;
  }, [sim.grid, sim.mode]);

  const svgRef = useRef<SVGSVGElement>(null);
  const isDrawingRef = useRef(false);
  const lastCellRef = useRef<[number, number] | null>(null);
  const pointerIdRef = useRef<number | null>(null);

  const [cursor, setCursor] = useState<[number, number] | null>(null);

  const endGesture = () => {
    const id = pointerIdRef.current;
    if (id !== null) {
      const svg = svgRef.current;
      if (svg && svg.hasPointerCapture(id)) {
        try {
          svg.releasePointerCapture(id);
        } catch {
          // ignore
        }
      }
    }
    pointerIdRef.current = null;
    isDrawingRef.current = false;
    lastCellRef.current = null;
  };

  useLayoutEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const w = el.getBoundingClientRect().width;
    const measured = Math.floor(w / CELL_SIZE);
    if (measured >= 3) {
      dispatch({
        type: 'SEED',
        grid: seedGrid(measured, ROWS, Math.random),
        cols: measured,
        rows: ROWS,
      });
      countdownRef.current = randomInRange(
        FIRST_INJECTION_TICKS_MIN,
        FIRST_INJECTION_TICKS_MAX,
        Math.random
      );
    }
  }, []);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      const w = el.getBoundingClientRect().width;
      const measured = Math.floor(w / CELL_SIZE);
      if (measured === cols) return;
      endGesture();
      if (measured >= 3) {
        dispatch({
          type: 'SEED',
          grid: seedGrid(measured, ROWS, Math.random),
          cols: measured,
          rows: ROWS,
        });
        countdownRef.current = randomInRange(
          FIRST_INJECTION_TICKS_MIN,
          FIRST_INJECTION_TICKS_MAX,
          Math.random
        );
        setCursor((cur) => {
          if (!cur) return cur;
          return [Math.min(cur[0], measured - 1), Math.min(cur[1], ROWS - 1)];
        });
      } else {
        dispatch({ type: 'SEED', grid: new Uint8Array(0), cols: 0, rows: ROWS });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [cols]);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) setIsInView(entry.isIntersecting);
      },
      { threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onVis = () => setDocVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  useEffect(() => {
    if (cols < 3) return;
    if (!isInView || !docVisible || reduceMotion) return;

    const interval = window.setInterval(() => {
      const current = gridRef.current;

      if (modeRef.current === 'active') {
        dispatch({ type: 'STEP' });
      }

      const remaining = countdownRef.current > 0 ? countdownRef.current - 1 : 0;
      countdownRef.current = remaining;

      if (remaining > 0) return;

      const pick = pickInjection(current, cols, rows, Math.random);
      if (!pick) {
        countdownRef.current = INJECTION_RETRY_TICKS;
        return;
      }

      dispatch({
        type: 'INJECT',
        pattern: pick.pattern,
        x: pick.x,
        y: pick.y,
      });
      countdownRef.current = randomInRange(
        NEXT_INJECTION_TICKS_MIN,
        NEXT_INJECTION_TICKS_MAX,
        Math.random
      );
    }, TICK_MS);

    return () => window.clearInterval(interval);
  }, [cols, rows, isInView, docVisible, reduceMotion]);

  const handleFocus = () => {
    if (cols >= 3 && rows >= 1 && cursor === null) {
      setCursor([Math.floor(cols / 2), Math.floor(rows / 2)]);
    }
  };

  return (
    <div
      ref={wrapperRef}
      role="application"
      aria-label="Conway grid. Click or drag to add live cells. Use arrow keys to move the cursor and Space to add a cell at the cursor."
      tabIndex={0}
      onFocus={handleFocus}
      onKeyDown={(e) => handleKeyDown(e, cols, rows, cursor, setCursor, dispatch)}
      className={cn(
        'relative h-60 overflow-hidden touch-none focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        className
      )}
    >
      {cols > 0 && grid.length === cols * rows && (
        <svg
          ref={svgRef}
          width={cols * CELL_SIZE}
          height={rows * CELL_SIZE}
          viewBox={`0 0 ${cols * CELL_SIZE} ${rows * CELL_SIZE}`}
          aria-hidden="true"
          className="block cursor-crosshair text-foreground"
          onPointerDown={(e) =>
            handlePointerDown(
              e,
              cols,
              rows,
              isDrawingRef,
              lastCellRef,
              pointerIdRef,
              svgRef,
              dispatch
            )
          }
          onPointerMove={(e) =>
            handlePointerMove(e, cols, rows, isDrawingRef, lastCellRef, pointerIdRef, dispatch)
          }
          onPointerUp={(e) => handlePointerEnd(e, isDrawingRef, lastCellRef, pointerIdRef, svgRef)}
          onPointerCancel={(e) =>
            handlePointerEnd(e, isDrawingRef, lastCellRef, pointerIdRef, svgRef)
          }
          onLostPointerCapture={(e) =>
            handlePointerEnd(e, isDrawingRef, lastCellRef, pointerIdRef, svgRef)
          }
        >
          <LiveCells grid={grid} cols={cols} rows={rows} columnOpacity={columnOpacity} />
          {cursor && (
            <rect
              x={cursor[0] * CELL_SIZE}
              y={cursor[1] * CELL_SIZE}
              width={CELL_SIZE}
              height={CELL_SIZE}
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeDasharray="2 2"
              pointerEvents="none"
              data-testid="conway-cursor"
            />
          )}
        </svg>
      )}
    </div>
  );
}

const handlePointerDown = (
  e: React.PointerEvent<SVGSVGElement>,
  cols: number,
  rows: number,
  isDrawingRef: React.MutableRefObject<boolean>,
  lastCellRef: React.MutableRefObject<[number, number] | null>,
  pointerIdRef: React.MutableRefObject<number | null>,
  svgRef: React.RefObject<SVGSVGElement | null>,
  dispatch: React.Dispatch<SimAction>
) => {
  if (pointerIdRef.current !== null) return;
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  const rect = e.currentTarget.getBoundingClientRect();
  const cell = pointerToCell(e.clientX, e.clientY, rect, cols, rows);
  if (!cell) return;
  e.preventDefault();
  try {
    e.currentTarget.setPointerCapture(e.pointerId);
  } catch {
    // ignore
  }
  pointerIdRef.current = e.pointerId;
  isDrawingRef.current = true;
  const tuple: [number, number] = [cell.col, cell.row];
  lastCellRef.current = tuple;
  dispatch({ type: 'DRAW', cells: [tuple] });
};

const handlePointerMove = (
  e: React.PointerEvent<SVGSVGElement>,
  cols: number,
  rows: number,
  isDrawingRef: React.MutableRefObject<boolean>,
  lastCellRef: React.MutableRefObject<[number, number] | null>,
  pointerIdRef: React.MutableRefObject<number | null>,
  dispatch: React.Dispatch<SimAction>
) => {
  if (!isDrawingRef.current) return;
  if (pointerIdRef.current !== e.pointerId) return;
  const rect = e.currentTarget.getBoundingClientRect();
  const cell = pointerToCell(e.clientX, e.clientY, rect, cols, rows);
  if (!cell) {
    lastCellRef.current = null;
    return;
  }
  const next: [number, number] = [cell.col, cell.row];
  const last = lastCellRef.current;
  if (last) {
    if (last[0] === next[0] && last[1] === next[1]) {
      dispatch({ type: 'DRAW', cells: [next] });
      lastCellRef.current = next;
      return;
    }
    dispatch({
      type: 'DRAW',
      cells: drawLine(last[0], last[1], next[0], next[1]),
    });
  } else {
    dispatch({ type: 'DRAW', cells: [next] });
  }
  lastCellRef.current = next;
};

const handlePointerEnd = (
  e: React.PointerEvent<SVGSVGElement>,
  isDrawingRef: React.MutableRefObject<boolean>,
  lastCellRef: React.MutableRefObject<[number, number] | null>,
  pointerIdRef: React.MutableRefObject<number | null>,
  svgRef: React.RefObject<SVGSVGElement | null>
) => {
  if (pointerIdRef.current !== e.pointerId) return;
  const svg = svgRef.current;
  if (svg && svg.hasPointerCapture(e.pointerId)) {
    try {
      svg.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  }
  pointerIdRef.current = null;
  isDrawingRef.current = false;
  lastCellRef.current = null;
};

const handleKeyDown = (
  e: React.KeyboardEvent<HTMLDivElement>,
  cols: number,
  rows: number,
  cursor: [number, number] | null,
  setCursor: React.Dispatch<React.SetStateAction<[number, number] | null>>,
  dispatch: React.Dispatch<SimAction>
) => {
  if (cols < 3 || rows < 1) return;
  const isArrow =
    e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight';
  const isActivate = e.key === ' ' || e.key === 'Enter';
  if (!isArrow && !isActivate) return;
  e.preventDefault();
  const current: [number, number] = cursor ?? [Math.floor(cols / 2), Math.floor(rows / 2)];
  if (isActivate) {
    dispatch({ type: 'DRAW', cells: [current] });
    setCursor(current);
    return;
  }
  let next: [number, number] = current;
  if (e.key === 'ArrowUp') next = [current[0], Math.max(0, current[1] - 1)];
  else if (e.key === 'ArrowDown') next = [current[0], Math.min(rows - 1, current[1] + 1)];
  else if (e.key === 'ArrowLeft') next = [Math.max(0, current[0] - 1), current[1]];
  else if (e.key === 'ArrowRight') next = [Math.min(cols - 1, current[0] + 1), current[1]];
  setCursor(next);
};

export function ConwayBand({ className }: { className?: string }) {
  const pathname = usePathname();
  return (
    <div className={cn('flex flex-col', className)}>
      <ConwayGrid key={pathname} />
    </div>
  );
}
