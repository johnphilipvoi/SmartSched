import {Bell, BellOff, BellRing, Send, ShieldCheck, X} from 'lucide-react';
import Modal from './Modal';
import {REMINDER_LEAD_OPTIONS, type ReminderPermission, type ReminderSettings} from './notifications';

export default function ClassReminders({settings, permission, error, onClose, onEnable, onDisable, onLeadChange, onFeedbackChange, onTest}: {
  settings: ReminderSettings;
  permission: ReminderPermission;
  error: string;
  onClose: () => void;
  onEnable: () => void;
  onDisable: () => void;
  onLeadChange: (minutes: number) => void;
  onTest: () => void;
  onFeedbackChange: (key: 'sound' | 'vibrate', value: boolean) => void;
}) {
  const active = settings.enabled && permission === 'granted';
  const statusDetail = settings.leadMinutes === 0 ? 'One reminder when each class starts.' : `One reminder ${settings.leadMinutes} minutes before each class.`;
  const exampleTime = new Date(2000, 0, 1, 22, -settings.leadMinutes).toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit'});
  return <Modal label="Class reminders" onClose={onClose}>
    <div className="section-heading"><div><span className="eyebrow">NEVER MISS A CLASS</span><h2>Class reminders</h2></div><button className="icon-button" aria-label="Close reminders" onClick={onClose}><X size={20}/></button></div>
    <p className="section-description">Get a browser notification before each class—including evening sessions like 10 PM.</p>
    <div className={`reminder-status ${active ? 'on' : ''}`} role="status" aria-live="polite">
      <span className="reminder-status-icon">{active ? <BellRing size={20}/> : <BellOff size={20}/>}</span>
      <div><strong>{active ? 'Reminders are on' : permission === 'denied' ? 'Notifications are blocked' : permission === 'unsupported' ? 'Not supported in this browser' : 'Reminders are off'}</strong><small>{active ? statusDetail : 'Turn them on to get a heads-up before class.'}</small></div>
    </div>
    <label className="reminder-lead">Remind me<select aria-label="Reminder timing" value={settings.leadMinutes} onChange={e => onLeadChange(Number(e.target.value))}>{REMINDER_LEAD_OPTIONS.map(minutes => <option key={minutes} value={minutes}>{minutes === 0 ? 'When class starts' : `${minutes} minutes before`}</option>)}</select></label>
    <p className="reminder-example"><Bell size={14}/> Example: a 10:00 PM class with this timing reminds you at {exampleTime}.</p>
    <fieldset className="reminder-feedback"><legend>Alert preferences</legend>
      <label><input type="checkbox" checked={settings.sound} onChange={e => onFeedbackChange('sound', e.target.checked)}/><span><strong>Sound</strong><small>Play a gentle chime while you’re using SmartSched.</small></span></label>
      <label><input type="checkbox" checked={settings.vibrate} onChange={e => onFeedbackChange('vibrate', e.target.checked)}/><span><strong>Vibration</strong><small>Request a short vibration on supported devices.</small></span></label>
    </fieldset>
    <p className="note">Tap “Send test” to check your alerts. After reopening the app, tap anywhere to allow the chime. Background sound and vibration follow your device’s notification settings; vibration-only may still use the system sound. Silent mode or Do Not Disturb can suppress alerts. iPhone browsers do not support custom vibration.</p>
    <p className="note reminder-note"><ShieldCheck size={14}/> Reminders run while SmartSched is open in a tab or installed window. Browsers cannot wake a fully closed web app without a push server.</p>
    {error && <p className="error" role="alert">{error}</p>}
    <div className="reminder-actions">{active ? <button className="secondary" onClick={onDisable}><BellOff size={16}/> Turn off reminders</button> : <button className="primary" onClick={onEnable} disabled={permission === 'unsupported'}><Bell size={16}/> Turn on reminders</button>}<button className="secondary" onClick={onTest} disabled={permission === 'unsupported'}><Send size={16}/> Send test</button></div>
    {permission === 'unsupported' && <p className="note">On iPhone or iPad, add SmartSched to your Home Screen and open the installed app to enable notifications.</p>}
    {permission === 'denied' && <p className="note">Allow notifications for this site in your browser settings, then reopen this panel.</p>}
  </Modal>;
}
