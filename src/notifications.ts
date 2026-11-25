import {pretty, type ClassItem} from './database';

export type ReminderSettings = {enabled: boolean; leadMinutes: number};
export type ReminderPermission = NotificationPermission | 'unsupported';
export type ReminderLog = Record<string, number>;
export type DueReminder = {item: ClassItem; key: string; startAt: number; startsIn: number};

export const REMINDER_LEAD_OPTIONS = [0, 5, 10, 15, 30, 60] as const;
const SETTINGS_KEY = 'smartsched-reminders';
const LOG_KEY = 'smartsched-reminder-log';
const AFTER_START_MS = 2 * 60_000;
const LOG_RETENTION_MS = 8 * 24 * 60 * 60_000;
const DEFAULT_SETTINGS: ReminderSettings = {enabled: false, leadMinutes: 10};

export function loadReminderSettings(): ReminderSettings {
  try {
    const raw = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? 'null') as Partial<ReminderSettings> | null;
    if (raw && typeof raw.enabled === 'boolean' && typeof raw.leadMinutes === 'number' && (REMINDER_LEAD_OPTIONS as readonly number[]).includes(raw.leadMinutes)) {
      return {enabled: raw.enabled, leadMinutes: raw.leadMinutes};
    }
  } catch {}
  return {...DEFAULT_SETTINGS};
}

export function saveReminderSettings(settings: ReminderSettings) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch {}
}

export function reminderPermission(): ReminderPermission {
  return typeof Notification === 'undefined' ? 'unsupported' : Notification.permission;
}

export function reminderKey(item: ClassItem, start: Date) {
  const date = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
  return `${item.id ?? `${item.subject}-${item.day}`}|${date}|${item.start}`;
}

/**
 * Find classes whose reminder window is open right now. The two-day scan covers
 * evening reminders that cross midnight, and the log prevents repeat alerts.
 */
export function dueReminders(items: ClassItem[], now: Date, leadMinutes: number, log: ReminderLog = {}): DueReminder[] {
  const nowMs = now.getTime();
  const leadMs = Math.max(0, leadMinutes) * 60_000;
  const due: DueReminder[] = [];
  for (const item of items) {
    const [hour, mins] = item.start.split(':').map(Number);
    for (const offset of [0, 1]) {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, hour, mins, 0, 0);
      if (start.getDay() !== item.day) continue;
      const startAt = start.getTime();
      if (nowMs < startAt - leadMs || nowMs >= startAt + AFTER_START_MS) continue;
      const key = reminderKey(item, start);
      if (log[key]) continue;
      due.push({item, key, startAt, startsIn: Math.max(0, Math.ceil((startAt - nowMs) / 60_000))});
      break;
    }
  }
  return due.sort((a, b) => a.startAt - b.startAt);
}

export function readReminderLog(now = Date.now()): ReminderLog {
  try {
    const raw = JSON.parse(localStorage.getItem(LOG_KEY) ?? '{}') as unknown;
    if (!raw || typeof raw !== 'object') return {};
    const cutoff = now - LOG_RETENTION_MS;
    const log: ReminderLog = {};
    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
      if (typeof value === 'number' && value >= cutoff) log[key] = value;
    }
    return log;
  } catch { return {}; }
}

export function writeReminderLog(log: ReminderLog) {
  try { localStorage.setItem(LOG_KEY, JSON.stringify(log)); } catch {}
}

export function reminderTitle(item: ClassItem, startsIn: number) {
  return startsIn <= 0 ? `Starting now · ${item.subject}` : `${item.subject} starts in ${startsIn} min`;
}

export function reminderBody(item: ClassItem) {
  return `${pretty(item.start)} – ${pretty(item.end)}${item.room ? ` · ${item.room}` : ''}${item.instructor ? ` · ${item.instructor}` : ''}`;
}

async function showReminder(title: string, options: NotificationOptions): Promise<boolean> {
  if (typeof Notification === 'undefined') return false;
  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.showNotification(title, options);
        return true;
      }
    }
  } catch {}
  try {
    const notification = new Notification(title, options);
    notification.onclick = () => { window.focus(); notification.close(); };
    return true;
  } catch { return false; }
}

export function showClassReminder(reminder: DueReminder) {
  return showReminder(reminderTitle(reminder.item, reminder.startsIn), {
    body: reminderBody(reminder.item),
    tag: reminder.key,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: {url: '/?view=today'}
  });
}

export function showTestReminder() {
  return showReminder('SmartSched reminders are on', {
    body: 'You’ll get one reminder before each class while SmartSched is open.',
    tag: 'smartsched-test',
    icon: '/icons/icon-192.png',
    data: {url: '/'}
  });
}
