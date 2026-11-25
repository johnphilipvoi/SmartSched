import {useEffect, useState} from 'react';
import {AlertTriangle, HelpCircle} from 'lucide-react';
import Modal from './Modal';

export type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

type Request = ConfirmOptions & {resolve: (value: boolean) => void};

let enqueue: ((request: Request) => void) | null = null;

/**
 * Promise-based confirmation that matches the app design instead of the
 * browser's native confirm dialog. Falls back to window.confirm if the host
 * has not mounted (for example, inside an isolated test render).
 */
export function confirmAction(options: ConfirmOptions): Promise<boolean> {
  if (!enqueue) return Promise.resolve(window.confirm(`${options.title}\n\n${options.message}`));
  return new Promise(resolve => enqueue!({...options, resolve}));
}

export function ConfirmHost() {
  const [queue, setQueue] = useState<Request[]>([]);
  const current = queue[0];

  useEffect(() => {
    enqueue = request => setQueue(old => [...old, request]);
    return () => { enqueue = null; };
  }, []);

  function close(value: boolean) {
    current?.resolve(value);
    setQueue(old => old.slice(1));
  }

  if (!current) return null;
  return (
    <Modal label={current.title} onClose={() => close(false)}>
      <div className="confirm-dialog">
        <span className={`confirm-icon ${current.danger ? 'danger' : ''}`} aria-hidden="true">
          {current.danger ? <AlertTriangle size={22} /> : <HelpCircle size={22} />}
        </span>
        <div>
          <h2>{current.title}</h2>
          <p>{current.message}</p>
        </div>
      </div>
      <div className="editor-actions">
        <button className="secondary" data-autofocus onClick={() => close(false)}>
          {current.cancelLabel ?? 'Cancel'}
        </button>
        <button className={current.danger ? 'primary danger' : 'primary'} onClick={() => close(true)}>
          {current.confirmLabel ?? 'Continue'}
        </button>
      </div>
    </Modal>
  );
}
