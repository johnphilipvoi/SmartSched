/**
 * Layout-matched loading placeholders.
 * Shapes mirror the real dashboard so the page does not jump when data arrives.
 */

const bar = (width: string, height: string, className = '') => (
  <span className={`skel-bar ${className}`} style={{width, height}} aria-hidden="true" />
);

const StatCard = () => (
  <div className="skel-stat" aria-hidden="true">
    {bar('52%', '11px')}
    {bar('34%', '26px')}
    {bar('68%', '10px')}
  </div>
);

const AgendaRow = () => (
  <div className="skel-row" aria-hidden="true">
    {bar('54px', '11px', 'skel-row-time')}
    <span className="skel-row-card skel-block" />
  </div>
);

const ManageRow = () => (
  <div className="skel-manage-row" aria-hidden="true">
    <span className="skel-block skel-manage-icon" />
    <div className="skel-manage-copy">
      {bar('46%', '13px')}
      {bar('66%', '10px')}
    </div>
    {bar('32px', '32px', 'skel-pill')}
    {bar('32px', '32px', 'skel-pill')}
  </div>
);

function TableSkeleton() {
  return (
    <div className="skel-table" aria-hidden="true">
      <div className="skel-table-head">
        {Array.from({length: 6}, (_, i) => (
          <span className="skel-block" key={i} />
        ))}
      </div>
      <div className="skel-table-body">
        {Array.from({length: 7}, (_, row) => (
          <div className="skel-table-row" key={row}>
            {Array.from({length: 6}, (_, col) => (
              <span className={`skel-block ${col > 0 && (row + col) % 4 === 0 ? 'is-filled' : ''}`} key={col} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function PageSkeleton({page}: {page: 'today' | 'weekly' | 'manage'}) {
  return (
    <div className="page-skeleton" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Loading your schedule…</span>
      {page === 'today' && (
        <>
          <div className="skel-welcome" aria-hidden="true">
            <div className="skel-stack">
              {bar('150px', '11px')}
              {bar('74%', '32px')}
              {bar('54%', '32px')}
              {bar('62%', '13px')}
              {bar('126px', '36px', 'skel-pill')}
            </div>
            <div className="skel-hero">
              {bar('82px', '10px')}
              {bar('86%', '19px')}
              {bar('62%', '11px')}
              {bar('48%', '11px')}
              {bar('100%', '1px')}
              {bar('40%', '10px')}
            </div>
          </div>
          <div className="skel-stats" aria-hidden="true">
            <StatCard />
            <StatCard />
            <StatCard />
          </div>
          <div className="skel-columns" aria-hidden="true">
            <div className="skel-panel">
              <div className="skel-row">
                {bar('42%', '18px')}
                {bar('70px', '11px', 'skel-push')}
              </div>
              <AgendaRow />
              <AgendaRow />
              <AgendaRow />
            </div>
            <div className="skel-panel">
              <div className="skel-row">
                {bar('58%', '18px')}
                {bar('34px', '18px', 'skel-pill')}
              </div>
              <div className="skel-row">
                {bar('100%', '40px', 'skel-field')}
                {bar('100%', '40px', 'skel-field')}
              </div>
              <AgendaRow />
              <AgendaRow />
            </div>
          </div>
        </>
      )}
      {page === 'weekly' && (
        <div className="skel-panel" aria-hidden="true">
          <div className="skel-row">
            <div className="skel-stack skel-stack-tight">
              {bar('180px', '18px')}
              {bar('60%', '11px')}
            </div>
            <div className="skel-toolbar skel-push">
              {bar('150px', '38px', 'skel-pill')}
              {bar('110px', '38px', 'skel-pill')}
              {bar('132px', '38px', 'skel-pill')}
            </div>
          </div>
          <TableSkeleton />
        </div>
      )}
      {page === 'manage' && (
        <div className="skel-panel" aria-hidden="true">
          <div className="skel-row">
            <div className="skel-stack skel-stack-tight">
              {bar('170px', '18px')}
              {bar('58%', '11px')}
            </div>
            {bar('132px', '38px', 'skel-pill skel-push')}
          </div>
          <div className="skel-toolbar">
            {bar('100%', '42px', 'skel-field skel-grow')}
            {bar('140px', '42px', 'skel-pill')}
          </div>
          <div>
            <ManageRow />
            <ManageRow />
            <ManageRow />
            <ManageRow />
            <ManageRow />
          </div>
        </div>
      )}
    </div>
  );
}

export function ImportSkeleton() {
  return (
    <div className="panel import-skeleton" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Reading and organizing your schedule…</span>
      <div className="skel-row" aria-hidden="true">
        <div className="skel-stack skel-stack-tight">
          {bar('220px', '18px')}
          {bar('48%', '11px')}
        </div>
        {bar('120px', '12px', 'skel-push')}
      </div>
      <TableSkeleton />
    </div>
  );
}

export function WidgetSkeleton({embedded = false}: {embedded?: boolean}) {
  return (
    <div className={`widget-root ${embedded ? 'widget-embedded' : ''} widget-skeleton`} role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Loading your schedule…</span>
      <div className="skel-row" aria-hidden="true">
        <span className="skel-block skel-widget-logo" />
        <div className="skel-stack skel-stack-tight">
          {bar('112px', '14px')}
          {bar('78px', '10px')}
        </div>
        {bar('32px', '32px', 'skel-pill skel-push')}
      </div>
      <span className="skel-bar" style={{width: '100%', height: '42px', borderRadius: '9px'}} aria-hidden="true" />
      {bar('54%', '11px')}
      <div className="skel-widget-cards" aria-hidden="true">
        {Array.from({length: 3}, (_, i) => (
          <div className="skel-widget-card" key={i}>
            {bar('62%', '14px')}
            {bar('44%', '10px')}
            {bar('38%', '10px')}
          </div>
        ))}
      </div>
    </div>
  );
}
