import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loadReminderSettings, reminderAlertOptions, type ReminderSettings} from '../src/notifications';

const settings: ReminderSettings = {enabled: true, leadMinutes: 10, sound: true, vibrate: true};

test('foreground chime suppresses duplicate system sound and invalid silent/vibrate combinations', () => {
  assert.deepEqual(reminderAlertOptions(settings, true), {silent: true});
});

test('background reminders request vibration and system alerts', () => {
  assert.deepEqual(reminderAlertOptions(settings, false), {silent: false, vibrate: [200, 100, 200]});
  assert.deepEqual(reminderAlertOptions({...settings, vibrate: false}, false), {silent: false, vibrate: []});
});

test('muting both preferences produces a silent visual notification', () => {
  assert.deepEqual(reminderAlertOptions({...settings, sound: false, vibrate: false}, false), {silent: true});
});

test('existing reminder preferences migrate without losing timing or enabled state', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  try {
    Object.defineProperty(globalThis, 'localStorage', {configurable: true, value: {
      getItem: () => JSON.stringify({enabled: true, leadMinutes: 30})
    }});
    assert.deepEqual(loadReminderSettings(), {enabled: true, leadMinutes: 30, sound: true, vibrate: true});
    Object.defineProperty(globalThis, 'localStorage', {configurable: true, value: {
      getItem: () => JSON.stringify({...settings, sound: false, vibrate: false})
    }});
    assert.deepEqual(loadReminderSettings(), {...settings, sound: false, vibrate: false});
  } finally {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});
