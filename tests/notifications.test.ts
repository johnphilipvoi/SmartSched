import {test} from 'node:test';
import assert from 'node:assert/strict';
import {dueReminders, reminderBody, reminderKey, reminderTitle, type ReminderLog} from '../src/notifications';
import type {ClassItem, Weekday} from '../src/database';

const evening = new Date(2026, 10, 25, 22, 0);
const at = (hour: number, minute: number, second = 0) => new Date(2026, 10, 25, hour, minute, second);
const classAt = (overrides: Partial<ClassItem> = {}): ClassItem => ({
  id: 1,
  subject: 'Evening Lab',
  room: 'Lab 1',
  instructor: 'Dr. Chen',
  day: evening.getDay() as Weekday,
  start: '22:00',
  end: '23:00',
  color: '#2dd4bf',
  ...overrides
});

test('a 10 PM class reminds 10 minutes before and not earlier', () => {
  const item = classAt();
  assert.equal(dueReminders([item], at(21, 49), 10).length, 0);
  const first = dueReminders([item], at(21, 50), 10);
  assert.equal(first.length, 1);
  assert.equal(first[0].startsIn, 10);
  assert.equal(dueReminders([item], at(21, 50, 30), 10)[0].startsIn, 10);
  assert.equal(dueReminders([item], at(21, 59, 30), 10)[0].startsIn, 1);
  assert.equal(dueReminders([item], at(22, 0, 30), 10)[0].startsIn, 0);
  assert.equal(dueReminders([item], at(22, 2, 1), 10).length, 0);
});

test('a reminder is not repeated after its occurrence is logged', () => {
  const item = classAt();
  const [due] = dueReminders([item], at(21, 55), 10);
  const log: ReminderLog = {[due.key]: Date.now()};
  assert.equal(dueReminders([item], at(21, 56), 10, log).length, 0);
  assert.equal(dueReminders([item], at(21, 56), 10).length, 1);
});

test('at-start reminders cover the first two minutes', () => {
  const item = classAt();
  assert.equal(dueReminders([item], at(22, 0, 30), 0).length, 1);
  assert.equal(dueReminders([item], at(22, 1, 30), 0).length, 1);
  assert.equal(dueReminders([item], at(22, 2, 30), 0).length, 0);
});

test('an evening reminder can cross midnight', () => {
  const nextDay = new Date(2026, 10, 26, 0, 10);
  const item = classAt({id: 2, subject: 'Late Lab', day: nextDay.getDay() as Weekday, start: '00:10', end: '01:00'});
  const due = dueReminders([item], new Date(2026, 10, 25, 23, 55), 20);
  assert.equal(due.length, 1);
  assert.equal(due[0].startsIn, 15);
});

test('a class on another weekday is ignored', () => {
  const item = classAt({day: ((evening.getDay() + 1) % 7) as Weekday});
  assert.equal(dueReminders([item], at(21, 55), 10).length, 0);
});

test('multiple reminders are ordered by start time', () => {
  const later = classAt({id: 3, subject: 'Later Lab', start: '22:05', end: '23:00'});
  const due = dueReminders([later, classAt()], at(21, 55), 10);
  assert.deepEqual(due.map(reminder => reminder.item.subject), ['Evening Lab', 'Later Lab']);
});

test('reminder keys are stable per occurrence and date', () => {
  const item = classAt();
  const first = reminderKey(item, new Date(2026, 10, 25, 22, 0));
  assert.equal(first, reminderKey(item, new Date(2026, 10, 25, 22, 0)));
  assert.notEqual(first, reminderKey(item, new Date(2026, 11, 2, 22, 0)));
});

test('reminder text includes the class, time, room, and instructor', () => {
  const item = classAt();
  assert.match(reminderTitle(item, 10), /Evening Lab starts in 10 min/);
  assert.match(reminderTitle(item, 0), /Starting now/);
  assert.match(reminderBody(item), /10:00/);
  assert.match(reminderBody(item), /Lab 1/);
  assert.match(reminderBody(item), /Dr\. Chen/);
});
