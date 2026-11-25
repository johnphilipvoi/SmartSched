import {useEffect, useRef, useState, type FormEvent} from 'react';
import {useLiveQuery} from 'dexie-react-hooks';
import {CalendarDays, Plus, Trash2, Pencil, MapPin, BookOpen, LayoutDashboard, Upload, ArrowUpRight, ShieldCheck, CalendarClock, Search, Sun, Moon, Monitor, X, Clock3, Coffee, ArrowRight, Check, AlertTriangle, Download, Bell, BellRing, Info, WifiOff} from 'lucide-react';
import {db, days, minute, pretty, overlaps, type ClassItem, type Weekday} from './database';
import {freeSlots, layoutDay, timeAt, weekOrder} from './planning';
import {useTheme} from './theme';
import Modal from './Modal';
import ImportPage from './ImportPage';
import InstallApp from './InstallApp';
import SourceTimetable from './SourceTimetable';
import RepairSchedule from './RepairSchedule';
import ClassReminders from './ClassReminders';
import {useClassReminders} from './useClassReminders';
import {PageSkeleton} from './Skeleton';
import {ConfirmHost, confirmAction} from './ConfirmDialog';
import {useOnlineStatus} from './useOnlineStatus';

type Page = 'today' | 'weekly' | 'manage';
type Toast = {id: number; message: string; kind: 'success' | 'error' | 'info'; undo?: ClassItem};
const blank: ClassItem = {subject: '', room: '', instructor: '', day: 1, start: '08:00', end: '09:00', color: '#2dd4bf'};
const palette = ['#2dd4bf', '#a78bfa', '#fb923c', '#60a5fa', '#f472b6'];
const navigation = [['today', 'Overview', LayoutDashboard], ['weekly', 'Weekly timetable', CalendarDays], ['manage', 'My classes', BookOpen]] as const;
const pad = (n: number) => String(n).padStart(2, '0');
const count = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function Timetable({items, day, onEdit}: {items: ClassItem[]; day: number; onEdit: (item: ClassItem) => void}) {
  const columns = day >= 0 ? [day] : weekOrder.filter(d => d < 6 && d > 0 || items.some(c => c.day === d));
  const start = Math.floor(Math.min(480, ...items.map(c => minute(c.start))) / 60) * 60;
  const end = Math.ceil(Math.max(1080, ...items.map(c => minute(c.end))) / 60) * 60;
  const height = (end - start) * 1.3;
  return <div className="table-scroll"><div className="week-table" style={{gridTemplateColumns: `72px repeat(${columns.length}, minmax(140px, 1fr))`, minWidth: columns.length === 1 ? 260 : undefined}}>
    <div className="week-heading time-heading">TIME</div>
    {columns.map(d => <div className={`week-heading ${d === new Date().getDay() ? 'is-today' : ''}`} key={d}>{days[d]}{d === new Date().getDay() && <span>Today</span>}</div>)}
    <div className="time-axis" style={{height}}>{Array.from({length: (end - start) / 60}, (_, i) => <span key={i} style={{top: i * 78}}>{pretty(timeAt(start + i * 60))}</span>)}</div>
    {columns.map(d => <div key={d} className={`week-column ${d === new Date().getDay() ? 'is-today' : ''}`} style={{height}}>
      {layoutDay(items.filter(c => c.day === d)).map(({item: c, lane, lanes}) => <button key={c.id} className="schedule-event" onClick={() => onEdit(c)}
        title={`${c.subject} · ${pretty(c.start)}–${pretty(c.end)}${c.room ? ` · ${c.room}` : ''}${c.instructor ? ` · ${c.instructor}` : ''}`}
        style={{top: (minute(c.start) - start) * 1.3, height: (minute(c.end) - minute(c.start)) * 1.3, left: `calc(${lane / lanes * 100}% + 3px)`, width: `calc(${100 / lanes}% - 6px)`, borderLeftColor: c.color, background: `color-mix(in srgb, ${c.color} 15%, var(--surface))`}}>
        <strong>{c.subject}</strong><small>{pretty(c.start)} – {pretty(c.end)}</small>{c.room && <span><MapPin size={12}/>{c.room}</span>}{c.instructor&&<span className="event-instructor">{c.instructor}</span>}
      </button>)}
    </div>)}
  </div></div>;
}

export default function App() {
  const result = useLiveQuery(() => db.classes.toArray(), []);
  const sourceLayout = useLiveQuery(() => db.settings.get('layout'))?.layout;
  const items = result ?? [];
  const reminders = useClassReminders(items);
  const [page, setPage] = useState<Page>('today');
  const [editorOpen, setEditorOpen] = useState(false);
  const [form, setForm] = useState<ClassItem>(blank);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const saveLock = useRef(false);
  const [now, setNow] = useState(new Date());
  const [importOpen, setImportOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);
  const [query, setQuery] = useState('');
  const [manageDay, setManageDay] = useState(-1);
  const [weekDay, setWeekDay] = useState(() => window.innerWidth <= 800 ? now.getDay() : -1);
  const [tableView,setTableView]=useState<'source'|'cards'>('source');
  const [freeDay, setFreeDay] = useState(now.getDay());
  const [duration, setDuration] = useState(30);
  const [theme, setTheme] = useTheme();
  const [remindersOpen, setRemindersOpen] = useState(false);
  const online = useOnlineStatus();
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30000);
    const params = new URLSearchParams(window.location.search);
    if (params.get('import') === '1') setImportOpen(true);
    return () => clearInterval(id);
  }, []);
  useEffect(() => { window.scrollTo({top: 0}); }, [page]);
  const sorted = [...items].sort((a, b) => weekOrder.indexOf(a.day) - weekOrder.indexOf(b.day) || minute(a.start) - minute(b.start));
  const today = sorted.filter(c => c.day === now.getDay());
  const current = now.getHours() * 60 + now.getMinutes();
  const active = today.find(c => minute(c.start) <= current && minute(c.end) > current);
  const next = items.map(c => ({item: c, offset: (c.day - now.getDay() + 7) % 7}))
    .map(c => ({...c, offset: c.offset === 0 && minute(c.item.start) <= current ? 7 : c.offset}))
    .sort((a, b) => a.offset - b.offset || minute(a.item.start) - minute(b.item.start))[0];
  const conflicts = sorted.filter(c => sorted.some(other => other.id !== c.id && overlaps(c, other)));
  const formConflicts = sorted.filter(c => c.id !== form.id && overlaps(c, form));
  const gaps = freeSlots(items, freeDay, duration);
  const filtered = sorted.filter(c => (manageDay < 0 || c.day === manageDay) && `${c.subject} ${c.room} ${c.instructor}`.toLowerCase().includes(query.trim().toLowerCase()));
  const hours = items.reduce((sum, c) => sum + minute(c.end) - minute(c.start), 0) / 60;

  function toast(message: string, kind: Toast['kind'] = 'success', undo?: ClassItem) {
    const id = ++seq.current;
    setToasts(old => [...old, {id, message, kind, undo}].slice(-3));
    window.setTimeout(() => setToasts(old => old.filter(t => t.id !== id)), undo ? 10000 : 4500);
  }
  function open(item?: ClassItem) {
    setForm(item ? {...item} : {...blank, day: now.getDay() as Weekday});
    setError(''); setEditorOpen(true);
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (saveLock.current) return;
    if (!form.subject.trim()) { setError('Please enter a subject or course name.'); return; }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(form.start) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(form.end) || minute(form.start) >= minute(form.end)) {
      setError('Choose an end time later than the start time.'); return;
    }
    if (formConflicts.length) {
      const saveAnyway = await confirmAction({
        title: 'This class overlaps another',
        message: `It overlaps ${formConflicts.map(c => c.subject).join(', ')}. Both sessions will still appear on your timetable.`,
        confirmLabel: 'Save anyway'
      });
      if (!saveAnyway) return;
    }
    saveLock.current = true; setSaving(true);
    try {
      const entry = {...form, subject: form.subject.trim(), room: form.room.trim(), instructor: form.instructor.trim()};
      const isEdit = entry.id !== undefined;
      if (isEdit) await db.classes.put(entry); else await db.classes.add(entry);
      setEditorOpen(false); toast(isEdit ? 'Class updated.' : 'Your new class is on the schedule.');
    } catch { setError('Could not save. Check your browser’s storage permissions and try again.'); }
    finally { saveLock.current = false; setSaving(false); }
  }
  async function remove(item: ClassItem) {
    try { await db.classes.delete(item.id!); toast(`${item.subject} deleted.`, 'info', item); }
    catch { toast('Could not delete this class. Please try again.', 'error'); }
  }
  async function undo(t: Toast) {
    if (!t.undo) return;
    try { await db.classes.put(t.undo); setToasts(old => old.filter(x => x.id !== t.id)); toast('Class restored.'); }
    catch { toast('Could not restore the class. Please try again.', 'error'); }
  }
  function exportCalendar() {
    const escape = (s: string) => s.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
    const events = sorted.map(c => {
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      date.setDate(date.getDate() + (c.day - date.getDay() + 7) % 7);
      const datepart = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
      const dt = (t: string) => datepart + 'T' + t.replace(':', '') + '00';
      return ['BEGIN:VEVENT', `UID:smartsched-${c.id}@local`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`, `DTSTART:${dt(c.start)}`, `DTEND:${dt(c.end)}`, `RRULE:FREQ=WEEKLY;BYDAY=${['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'][c.day]}`, `SUMMARY:${escape(c.subject)}`, `LOCATION:${escape(c.room)}`, `DESCRIPTION:${escape(c.instructor)}`, 'END:VEVENT'].join('\r\n');
    });
    const content = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//SmartSched//Class Planner//EN', 'CALSCALE:GREGORIAN', ...events, 'END:VCALENDAR', ''].join('\r\n');
    const url = URL.createObjectURL(new Blob([content], {type: 'text/calendar;charset=utf-8'}));
    const a = document.createElement('a'); a.href = url; a.download = 'smartsched-calendar.ics'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000); toast('Weekly calendar exported.');
  }

  const reminderLead = reminders.settings.leadMinutes === 0 ? 'at class start' : `${reminders.settings.leadMinutes} min before`;
  const addButton = <button className="primary add-class" onClick={() => open()}><Plus size={17}/><span>Add class</span></button>;
  return <div className="app">
    <a className="skip-link" href="#main">Skip to content</a>
    <aside className="sidebar">
      <a className="brand" href="./"><div className="brand-icon"><CalendarDays size={23}/></div><div><b>SmartSched<span>.</span></b><small>A little more organized.</small></div></a>
      <span className="nav-caption">WORKSPACE</span>
      <nav className="nav" aria-label="Main navigation">{navigation.map(([id, label, Icon]) => <button key={id} className={page === id ? 'active' : ''} aria-current={page === id ? 'page' : undefined} onClick={() => setPage(id)}><Icon size={19}/>{label}{page === id && <span className="nav-dot"/>}</button>)}</nav>
      <div className="sidebar-tip"><div className="tip-icon"><Upload size={19}/></div><strong>Already have a schedule?</strong><p>Bring it all together in just a few clicks.</p><button className="secondary" onClick={() => setImportOpen(true)}>Import schedule <ArrowUpRight size={15}/></button></div>
      <div className="sidebar-footer"><ShieldCheck size={19}/><div><strong>Your space. Your data.</strong><small>Saved locally on this device</small></div></div>
    </aside>
    <main id="main" className="main" aria-busy={result === undefined}>
      <header className="topbar"><div><span className="eyebrow">YOUR STUDENT WORKSPACE</span><h1>{{today: 'A clear view of your day', weekly: 'Your week, at a glance', manage: 'A home for every class'}[page]}</h1></div>
        <div className="topbar-actions"><div className="theme-switch" role="group" aria-label="Color theme">{([['light', Sun, 'Light'], ['dark', Moon, 'Dark'], ['system', Monitor, 'System']] as const).map(([value, Icon, label]) => <button key={value} aria-label={`${label} theme`} title={`${label} theme`} aria-pressed={theme === value} className={theme === value ? 'selected' : ''} onClick={() => setTheme(value)}><Icon size={16}/></button>)}</div><button className={`icon-button reminder-button ${reminders.settings.enabled ? 'active' : ''}`} aria-label="Class reminders" title={reminders.settings.enabled ? `Class reminders on · ${reminderLead}` : 'Set up class reminders'} onClick={() => { reminders.clearError(); setRemindersOpen(true); }}>{reminders.settings.enabled ? <BellRing size={17}/> : <Bell size={17}/>}{reminders.settings.enabled && <span className="reminder-dot" aria-hidden="true"/>}</button><InstallApp/><button className="secondary import-top" onClick={() => setImportOpen(true)}><Upload size={16}/><span>Import</span></button>{addButton}</div>
      </header>
      {!online && <div className="offline-banner" role="status"><WifiOff size={15}/><span><strong>Offline mode</strong> Your schedule is saved on this device. Changes stay local.</span></div>}
      {result === undefined ? <PageSkeleton page={page}/> : <div className="page" key={page}>
      {page === 'today' && <>
        <RepairSchedule items={items}/>
        <section className="welcome"><div className="welcome-content"><span className="hero-date"><span className="status-pulse"/>{now.toLocaleDateString('en-US', {weekday: 'long', month: 'long', day: 'numeric'})}</span><h2>A little planning.<br/>A lot more peace of mind.</h2><p>Your classes, your time, your rhythm. Let’s make room for what matters.</p><button className="hero-cta" onClick={() => setPage('weekly')}>See my week <ArrowRight size={17}/></button></div>
          <div className="hero-next"><span className="eyebrow"><span className="status-pulse"/>{active ? 'HAPPENING NOW' : 'UP NEXT'}</span>{active || next ? <><h3>{(active ?? next.item).subject}</h3><p><Clock3 size={15}/>{pretty((active ?? next.item).start)} – {pretty((active ?? next.item).end)}</p><p><MapPin size={15}/>{(active ?? next.item).room || 'Room not set'}</p><div className="hero-next-footer"><span>{active ? 'You’re right on time.' : next.offset === 0 ? 'Later today' : next.offset === 1 ? 'Tomorrow' : days[next.item.day]}</span><button className="icon-button" aria-label="Edit upcoming class" onClick={() => open(active ?? next.item)}><ArrowUpRight size={18}/></button></div></> : <><h3>Your next chapter starts here.</h3><p>Add a class or import your timetable to get going.</p><button className="link" onClick={() => open()}>Add your first class <ArrowRight size={16}/></button></>}</div>
        </section>
        <div className="stats">
          <div className="stat"><div><span>Classes today</span><strong>{today.length}<small>{today.filter(c => minute(c.end) <= current).length} completed</small></strong></div><div className="stat-icon"><CalendarDays size={21}/></div></div>
          <div className="stat"><div><span>Weekly sessions</span><strong>{items.length}<small>Across {count(new Set(items.map(c => c.day)).size, 'day')}</small></strong></div><div className="stat-icon violet"><BookOpen size={21}/></div></div>
          <div className="stat"><div><span>Weekly class time</span><strong>{Number(hours.toFixed(1))}<small>hours of learning</small></strong></div><div className="stat-icon amber"><Clock3 size={21}/></div></div>
        </div>
        <div className="dashboard-columns"><section className="panel agenda-panel"><div className="section-heading"><div><span className="eyebrow">ONE THING AT A TIME</span><h2>Today’s agenda <span className="count-badge">{today.length}</span></h2></div><button className="link" onClick={() => setPage('weekly')}>Full week <ArrowUpRight size={16}/></button></div>
          {today.length ? today.map(c => {
            const live = minute(c.start) <= current && minute(c.end) > current;
            const done = minute(c.end) <= current;
            return <div className={`timeline ${live ? 'timeline-active' : ''} ${done ? 'timeline-done' : ''}`} key={c.id}><div className="timeline-time">{pretty(c.start)}<small>{pretty(c.end)}</small></div><button className="timeline-card" style={{borderLeftColor: c.color}} onClick={() => open(c)}><div><strong>{c.subject}</strong><span><MapPin size={13}/>{c.room || 'Room not set'}{c.instructor && ` · ${c.instructor}`}</span></div>{live ? <span className="now-pill">Live</span> : done ? <Check size={17}/> : <ArrowUpRight size={17}/>}</button></div>;
          }) : <div className="empty agenda-empty"><div className="empty-icon"><Coffee size={28}/></div><h3>{items.length ? 'A little breathing room.' : 'Let’s shape your week.'}</h3><p>{items.length ? 'No classes today. Enjoy the space to study, recharge, or do your own thing.' : 'Add your first class, or import your existing schedule. We’ll take care of the overview.'}</p><button className="secondary" onClick={() => items.length ? setPage('weekly') : setImportOpen(true)}>{items.length ? 'Explore your week' : 'Import a schedule'}<ArrowRight size={16}/></button></div>}
          {today.length > 0 && today.every(c => minute(c.end) <= current) && <p className="agenda-note"><Check size={15}/> All classes finished. You’ve earned a break.</p>}
        </section>
        <section className="panel free-panel"><div className="section-heading"><div><span className="eyebrow">MAKE TIME FOR YOU</span><h2><Coffee size={19}/> Free-time finder</h2></div><span className="new-badge">NEW</span></div><p className="section-description">Find a quiet window for studying, lunch, or a well-earned break.</p>
          <div className="free-controls"><label>Day<select value={freeDay} onChange={e => setFreeDay(Number(e.target.value))}>{weekOrder.map(d => <option key={d} value={d}>{days[d]}</option>)}</select></label><label>At least<select value={duration} onChange={e => setDuration(Number(e.target.value))}><option value={30}>30 minutes</option><option value={60}>1 hour</option><option value={90}>1½ hours</option><option value={120}>2 hours</option></select></label></div>
          <div className="free-results" aria-live="polite">{gaps.length ? gaps.map(gap => <div className="free-slot" key={gap.start}><span className="free-slot-icon"><Clock3 size={16}/></span><div><strong>{pretty(timeAt(gap.start))} – {pretty(timeAt(gap.end))}</strong><small>{gap.end - gap.start} minutes available</small></div></div>) : <p className="section-description">No gaps this long. Try a shorter duration or a different day.</p>}</div><p className="note">Based on your recurring classes, 8 AM–6 PM.</p>
        </section></div>
        {conflicts.length > 0 && <div className="conflict-banner"><AlertTriangle size={20}/><div><strong>Some classes overlap</strong><p>{count(conflicts.length, 'session')} {conflicts.length === 1 ? 'needs' : 'need'} a second look.</p></div><button className="link" onClick={() => setPage('manage')}>Review classes <ArrowRight size={16}/></button></div>}
      </>}
      {page === 'weekly' && <><RepairSchedule items={items}/><section className="panel timetable-panel"><div className="section-heading"><div><h2>Weekly timetable</h2><p className="section-description">{tableView==='source'?'Source-style rows: subject, room, instructor. Click a cell to edit the full session.':'Your recurring schedule. Select any class to edit it.'}</p></div><div className="toolbar-actions"><select aria-label="Timetable layout" value={tableView} onChange={e=>setTableView(e.target.value as 'source'|'cards')}><option value="source">Original table layout</option><option value="cards">Calendar cards</option></select><select aria-label="Timetable day" value={weekDay} onChange={e => setWeekDay(Number(e.target.value))}><option value={-1}>Full week</option>{weekOrder.map(d => <option key={d} value={d}>{days[d]}</option>)}</select><button className="secondary" onClick={exportCalendar} disabled={!items.length}><Download size={16}/> Export calendar</button></div></div>
        {!items.length && <div className="schedule-empty"><CalendarClock size={22}/><span>Your week is a blank canvas. Add a class or import a schedule to fill it in.</span><button className="link" onClick={() => setImportOpen(true)}>Import <ArrowUpRight size={15}/></button></div>}
        {weekDay < 0 && items.length > 0 && <p className="table-scroll-hint">Swipe sideways to see every day</p>}
        {tableView==='source'?<SourceTimetable items={sorted} source={sourceLayout} day={weekDay} onEdit={open}/>:<Timetable items={sorted} day={weekDay} onEdit={open}/>}<div className="table-footer"><span><span className="status-pulse"/> {count(items.length, 'weekly session')}</span><span>{sourceLayout?.sourceName?`Layout from ${sourceLayout.sourceName}`:'Import a timetable to preserve its original time rows.'}</span></div>
      </section></>}
      {page === 'manage' && <section className="panel manage-panel"><div className="section-heading"><div><h2>My classes <span className="count-badge">{items.length}</span></h2><p className="section-description">Keep the details in order. Make the week your own.</p></div><button className="secondary" onClick={() => setImportOpen(true)}><Upload size={16}/> Import schedule</button></div>
        <div className="manage-toolbar"><label className="search-field"><Search size={18}/><input aria-label="Search classes" placeholder="Search subject, room, or instructor…" value={query} onChange={e => setQuery(e.target.value)}/>{query && <button className="icon-button" aria-label="Clear search" onClick={() => setQuery('')}><X size={15}/></button>}</label><select aria-label="Filter classes by day" value={manageDay} onChange={e => setManageDay(Number(e.target.value))}><option value={-1}>All days</option>{weekOrder.map(d => <option key={d} value={d}>{days[d]}</option>)}</select></div>
        <div className="manage-table-head"><span>SUBJECT & DETAILS</span><span>ACTIONS</span></div>
        {filtered.length ? filtered.map(c => <div className="manage-row" key={c.id}><div className="subject-icon" style={{background: `color-mix(in srgb, ${c.color} 18%, var(--surface))`, borderColor: c.color}}><BookOpen size={19}/></div><div className="manage-info"><strong>{c.subject}{conflicts.some(x => x.id === c.id) && <span className="conflict-label"><AlertTriangle size={12}/> Overlap</span>}</strong><small>{days[c.day]} · {pretty(c.start)}–{pretty(c.end)}{c.room && ` · ${c.room}`}</small>{c.instructor && <small>{c.instructor}</small>}</div><button className="icon-button" onClick={() => open(c)} aria-label={`Edit ${c.subject}`}><Pencil size={17}/></button><button className="icon-button danger" onClick={() => remove(c)} aria-label={`Delete ${c.subject}`}><Trash2 size={17}/></button></div>) : <div className="empty"><div className="empty-icon"><BookOpen size={27}/></div><h3>{items.length ? 'No matching classes' : 'Your schedule starts here'}</h3><p>{items.length ? 'Try a different search or day filter.' : 'Add a class manually or bring in your school timetable.'}</p>{items.length ? <button className="secondary" onClick={() => {setQuery(''); setManageDay(-1);}}>Clear filters</button> : addButton}</div>}
        <div className="table-footer"><span>{filtered.length} of {count(items.length, 'class', 'classes')}</span><span>Saved on this device · Deleted classes can be undone for 10 seconds</span></div>
      </section>}
      </div>}
      <footer className="workspace-footer"><span><ShieldCheck size={14}/> Private by design. Ready offline.</span><span>Less planning. More living.</span></footer>
    </main>
    <nav className="bottom-nav" aria-label="Mobile navigation">{navigation.map(([id, label, Icon]) => <button key={id} aria-current={page === id ? 'page' : undefined} className={page === id ? 'active' : ''} onClick={() => setPage(id)}><Icon size={20}/><span>{label}</span></button>)}<button className="nav-add" onClick={() => open()} aria-label="Add a class"><span className="nav-add-icon"><Plus size={19}/></span><span>Add</span></button></nav>
    {editorOpen && <Modal label={form.id !== undefined ? 'Edit class' : 'Add class'} onClose={() => {if (!saving) setEditorOpen(false);}}><div className="section-heading"><div><span className="eyebrow">BUILD YOUR WEEK</span><h2>{form.id !== undefined ? 'Edit class' : 'Add a new class'}</h2></div><button className="icon-button" aria-label="Close class editor" disabled={saving} onClick={() => setEditorOpen(false)}><X size={20}/></button></div><p className="section-description editor-description">Add the essentials. This session repeats every week.</p><form onSubmit={save}>
      <label>Subject / course name<input data-autofocus required maxLength={150} value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} placeholder="e.g. Introduction to Computer Science"/></label>
      <div className="form-two"><label>Day<select value={form.day} onChange={e => setForm({...form, day: Number(e.target.value) as Weekday})}>{weekOrder.map(d => <option key={d} value={d}>{days[d]}</option>)}</select></label><label>Room <span className="optional">optional</span><input maxLength={150} value={form.room} onChange={e => setForm({...form, room: e.target.value})} placeholder="e.g. Room 204"/></label></div>
      <div className="form-two"><label>Starts at<input type="time" required value={form.start} onChange={e => setForm({...form, start: e.target.value})}/></label><label>Ends at<input type="time" required value={form.end} onChange={e => setForm({...form, end: e.target.value})}/></label></div>
      <label>Instructor <span className="optional">optional</span><input maxLength={150} value={form.instructor} onChange={e => setForm({...form, instructor: e.target.value})} placeholder="Instructor’s name"/></label>
      <fieldset className="color-field"><legend>Class color</legend><div className="palette">{palette.map((color, i) => <button type="button" key={color} aria-label={['Teal', 'Purple', 'Orange', 'Blue', 'Pink'][i]} aria-pressed={form.color === color} className={form.color === color ? 'selected' : ''} style={{background: color}} onClick={() => setForm({...form, color})}>{form.color === color && <Check size={16}/>}</button>)}</div></fieldset>
      {formConflicts.length > 0 && <p className="inline-warning" role="status"><AlertTriangle size={16}/> Overlaps {formConflicts.map(c => c.subject).join(', ')}. You can still save after confirming.</p>}{error && <p className="error" role="alert">{error}</p>}
      <div className="editor-actions"><button type="button" className="secondary" disabled={saving} onClick={() => setEditorOpen(false)}>Cancel</button><button className="primary" type="submit" disabled={saving}>{saving ? <span className="spinner"/> : <Check size={17}/>}{saving ? 'Saving…' : 'Save class'}</button></div>
    </form></Modal>}
    {importOpen && <Modal wide label="Import schedule" onClose={() => setImportOpen(false)}><ImportPage onSaved={() => {setPage('weekly'); setWeekDay(window.innerWidth <= 800 ? new Date().getDay() : -1);setTableView('source'); toast('Your schedule is ready.');}} onClose={() => setImportOpen(false)}/></Modal>}
    {remindersOpen && <ClassReminders settings={reminders.settings} permission={reminders.permission} error={reminders.error} onClose={() => setRemindersOpen(false)} onEnable={reminders.enable} onDisable={reminders.disable} onLeadChange={reminders.setLeadMinutes} onTest={reminders.test}/>}
    <div className="toast-stack" aria-live="polite">{toasts.map(t => <div key={t.id} className={`toast toast-${t.kind}`} role="status">
      <span className="toast-icon" aria-hidden="true">{t.kind === 'success' ? <Check size={15}/> : t.kind === 'error' ? <AlertTriangle size={15}/> : <Info size={15}/>}</span>
      <span className="toast-message">{t.message}</span>
      {t.undo && <button className="link toast-action" onClick={() => undo(t)}>Undo</button>}
      {t.undo && <span className="toast-timer" aria-hidden="true"/>}
      <button className="icon-button toast-close" aria-label="Dismiss notification" onClick={() => setToasts(old => old.filter(x => x.id !== t.id))}><X size={14}/></button>
    </div>)}</div>
    <ConfirmHost/>
  </div>;
}
