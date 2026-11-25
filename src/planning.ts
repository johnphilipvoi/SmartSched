import {minute, type ClassItem} from './database';

export const weekOrder = [1, 2, 3, 4, 5, 6, 0];
export const timeAt = (n: number) => `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;

/** Merge occupied intervals, then find gaps within the requested planning window. */
export function freeSlots(items: ClassItem[], day: number, minimum = 30, start = 480, end = 1080) {
  const busy = items.filter(c => c.day === day)
    .map(c => ({start: Math.max(start, minute(c.start)), end: Math.min(end, minute(c.end))}))
    .filter(c => c.end > c.start).sort((a, b) => a.start - b.start);
  const gaps: {start: number; end: number}[] = [];
  let cursor = start;
  for (const interval of busy) {
    if (interval.start - cursor >= minimum) gaps.push({start: cursor, end: interval.start});
    cursor = Math.max(cursor, interval.end);
  }
  if (end - cursor >= minimum) gaps.push({start: cursor, end});
  return gaps;
}

/** Assign overlapping classes separate lanes so every class remains clickable. */
export function layoutDay(items: ClassItem[]) {
  const result: {item: ClassItem; lane: number; lanes: number}[] = [];
  let group: typeof result = [];
  let ends: number[] = [];
  let groupEnd = -1;
  const flush = () => {
    group.forEach(entry => { entry.lanes = ends.length; });
    result.push(...group);
    group = []; ends = [];
  };
  for (const item of [...items].sort((a, b) => minute(a.start) - minute(b.start))) {
    const start = minute(item.start);
    if (start >= groupEnd) flush();
    let lane = ends.findIndex(end => end <= start);
    if (lane < 0) lane = ends.length;
    ends[lane] = minute(item.end);
    groupEnd = Math.max(...ends);
    group.push({item, lane, lanes: 1});
  }
  flush();
  return result;
}
