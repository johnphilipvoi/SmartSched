import {pretty, type ClassItem} from './database';

export type ReminderSettings = {enabled: boolean; leadMinutes: number; sound: boolean; vibrate: boolean};
export type ReminderPermission = NotificationPermission | 'unsupported';
export type ReminderLog = Record<string, number>;
export type DueReminder = {item: ClassItem; key: string; startAt: number; startsIn: number};

export const REMINDER_LEAD_OPTIONS = [0, 5, 10, 15, 30, 60] as const;
const SETTINGS_KEY = 'smartsched-reminders';
const LOG_KEY = 'smartsched-reminder-log';
const AFTER_START_MS = 2 * 60_000;
const LOG_RETENTION_MS = 8 * 24 * 60 * 60_000;
const DEFAULT_SETTINGS: ReminderSettings = {enabled: false, leadMinutes: 10, sound: true, vibrate: true};

export function loadReminderSettings(): ReminderSettings {
  try {
    const raw = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? 'null') as Partial<ReminderSettings> | null;
    if (raw && typeof raw.enabled === 'boolean' && typeof raw.leadMinutes === 'number' && (REMINDER_LEAD_OPTIONS as readonly number[]).includes(raw.leadMinutes)) {
      return {enabled: raw.enabled, leadMinutes: raw.leadMinutes, sound: typeof raw.sound === 'boolean' ? raw.sound : true, vibrate: typeof raw.vibrate === 'boolean' ? raw.vibrate : true};
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

let audio: AudioContext | undefined;
const VIBRATION = [200, 100, 200];

// Must be called directly from a user gesture; autoplay rules apply after reload.
export function prepareReminderAudio() {
  try {
    audio ??= new AudioContext();
    if (audio.state === 'suspended') void audio.resume().catch(() => {});
  } catch {}
}

function playReminderFeedback(settings: ReminderSettings) {
  if (settings.vibrate && typeof navigator.vibrate === 'function') {
    try { navigator.vibrate(VIBRATION); } catch {}
  }
  if (!settings.sound || !audio || audio.state !== 'running') return;
  const context = audio;
  for (const [offset, frequency] of [[0, 660], [0.24, 880]]) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = context.currentTime + offset;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.18, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.3);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.32);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }
}

export function reminderAlertOptions(settings: ReminderSettings, inAppSound: boolean): NotificationOptions & {vibrate?: number[]} {
  // The Notifications API forbids vibration alongside silent:true.
  if (inAppSound || (!settings.sound && !settings.vibrate)) return {silent: true};
  return {silent: false, vibrate: settings.vibrate ? VIBRATION : []};
}

async function showReminder(title: string, options: NotificationOptions, settings: ReminderSettings): Promise<boolean> {
  if (typeof Notification === 'undefined') return false;
  const inAppSound = document.visibilityState === 'visible' && settings.sound && audio?.state === 'running';
  const alertOptions = {...options, ...reminderAlertOptions(settings, inAppSound)};
  const feedback = () => {
    if (inAppSound) {
      try { playReminderFeedback(settings); } catch {}
    }
  };
  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.showNotification(title, alertOptions);
        feedback();
        return true;
      }
    }
  } catch {}
  try {
    const notification = new Notification(title, alertOptions);
    feedback();
    notification.onclick = () => { window.focus(); notification.close(); };
    return true;
  } catch { return false; }
}

export function showClassReminder(reminder: DueReminder, settings: ReminderSettings) {
  return showReminder(reminderTitle(reminder.item, reminder.startsIn), {
    body: reminderBody(reminder.item),
    tag: reminder.key,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: {url: '/?view=today'}
  }, settings);
}

export function showTestReminder(settings: ReminderSettings) {
  return showReminder('SmartSched reminders are on', {
    body: 'You’ll get one reminder before each class while SmartSched is open.',
    tag: 'smartsched-test',
    icon: '/icons/icon-192.png',
    data: {url: '/'}
  }, settings);
}
