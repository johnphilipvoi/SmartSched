import {useEffect, useState} from 'react';
import type {ClassItem} from './database';
import {
  dueReminders,
  loadReminderSettings,
  prepareReminderAudio,
  readReminderLog,
  reminderPermission,
  saveReminderSettings,
  showClassReminder,
  showTestReminder,
  writeReminderLog,
  type ReminderPermission,
  type ReminderSettings
} from './notifications';

export function useClassReminders(items: ClassItem[]) {
  const [settings, setSettings] = useState<ReminderSettings>(loadReminderSettings);
  const [permission, setPermission] = useState<ReminderPermission>(reminderPermission);
  const [error, setError] = useState('');

  useEffect(() => { saveReminderSettings(settings); }, [settings]);

  useEffect(() => {
    if (!settings.enabled || !settings.sound) return;
    const unlock = () => prepareReminderAudio();
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, [settings.enabled, settings.sound]);

  useEffect(() => {
    const sync = () => setPermission(reminderPermission());
    window.addEventListener('focus', sync);
    document.addEventListener('visibilitychange', sync);
    return () => {
      window.removeEventListener('focus', sync);
      document.removeEventListener('visibilitychange', sync);
    };
  }, []);

  // A reminder cannot run without permission. Keep the stored preference honest
  // when permission is revoked or the app moves to a browser without support.
  useEffect(() => {
    if (settings.enabled && permission !== 'granted') {
      setSettings(old => old.enabled ? {...old, enabled: false} : old);
    }
  }, [permission, settings.enabled]);

  useEffect(() => {
    if (!settings.enabled || permission !== 'granted') return;
    let cancelled = false;
    let busy = false;
    const check = async () => {
      if (busy || cancelled) return;
      busy = true;
      try {
        const log = readReminderLog();
        const due = dueReminders(items, new Date(), settings.leadMinutes, log);
        for (const reminder of due) {
          if (cancelled) return;
          if (!await showClassReminder(reminder, settings)) {
            if (!cancelled) setError('Your browser blocked the reminder. Check its notification settings and try again.');
            return;
          }
          log[reminder.key] = Date.now();
          writeReminderLog(log);
        }
      } finally { busy = false; }
    };
    check();
    const timer = window.setInterval(check, 15_000);
    const wake = () => { if (document.visibilityState !== 'hidden') check(); };
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', wake);
    return () => {
      cancelled = true;
      clearInterval(timer);
      window.removeEventListener('focus', check);
      document.removeEventListener('visibilitychange', wake);
    };
  }, [items, settings, permission]);

  async function enable() {
    if (settings.sound) prepareReminderAudio();
    setError('');
    if (typeof Notification === 'undefined') {
      setPermission('unsupported');
      setError('This browser does not support notifications. On iPhone or iPad, add SmartSched to your Home Screen and open the installed app.');
      return false;
    }
    let result = Notification.permission;
    if (result === 'default') result = await Notification.requestPermission();
    setPermission(result);
    if (result === 'granted') {
      setSettings(old => ({...old, enabled: true}));
      return true;
    }
    setSettings(old => ({...old, enabled: false}));
    setError(result === 'denied'
      ? 'Notifications are blocked. Allow them for this site in your browser settings, then try again.'
      : 'Notification permission was not granted.');
    return false;
  }

  function disable() {
    setError('');
    setSettings(old => ({...old, enabled: false}));
  }

  function setLeadMinutes(leadMinutes: number) {
    setError('');
    setSettings(old => ({...old, leadMinutes}));
  }

  async function test() {
    if (settings.sound) prepareReminderAudio();
    setError('');
    if (typeof Notification === 'undefined') {
      setPermission('unsupported');
      setError('This browser does not support notifications. On iPhone or iPad, add SmartSched to your Home Screen and open the installed app.');
      return;
    }
    let result = Notification.permission;
    if (result === 'default') result = await Notification.requestPermission();
    setPermission(result);
    if (result !== 'granted') {
      setError(result === 'denied'
        ? 'Notifications are blocked. Allow them for this site in your browser settings, then try again.'
        : 'Notification permission was not granted.');
      return;
    }
    if (!await showTestReminder(settings)) setError('The test notification could not be shown. Check your browser’s notification settings.');
  }

  function setFeedback(key: 'sound' | 'vibrate', value: boolean) {
    if (key === 'sound' && value) prepareReminderAudio();
    setSettings(old => ({...old, [key]: value}));
  }

  return {settings, permission, error, enable, disable, setLeadMinutes, setFeedback, test, clearError: () => setError('')};
}
