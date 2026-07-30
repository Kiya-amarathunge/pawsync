'use client';

import { useEffect, useState } from 'react';

interface ActionDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: (reason: string) => Promise<void> | void;
  reasonLabel?: string;
  reasonPlaceholder?: string;
  minLength?: number;
  danger?: boolean;
}

export default function ActionDialog({ open, title, description, confirmLabel, onCancel, onConfirm, reasonLabel, reasonPlaceholder, minLength = 0, danger = false }: ActionDialogProps) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { if (!open) setReason(''); }, [open]);
  if (!open) return null;

  const submit = async () => {
    if (reasonLabel && reason.trim().length < minLength) return;
    setSubmitting(true);
    try { await onConfirm(reason.trim()); } finally { setSubmitting(false); }
  };

  return <div className="modal-overlay" role="presentation" onMouseDown={event => event.target === event.currentTarget && onCancel()}>
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="action-dialog-title" style={{ maxWidth: 500 }}>
      <h2 id="action-dialog-title" className="modal-title">{title}</h2>
      <p className="modal-subtitle">{description}</p>
      {reasonLabel && <label className="input-group"><span className="input-label">{reasonLabel}</span><textarea className="input" rows={4} value={reason} onChange={event => setReason(event.target.value)} placeholder={reasonPlaceholder} autoFocus /><small style={{ color: 'var(--text-muted)' }}>{minLength > 0 ? `At least ${minLength} characters` : 'Provide a clear reason for the audit record.'}</small></label>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 9, marginTop: 20 }}><button className="btn btn-secondary" onClick={onCancel} disabled={submitting}>Cancel</button><button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={() => void submit()} disabled={submitting || Boolean(reasonLabel && reason.trim().length < minLength)}>{submitting ? 'Saving...' : confirmLabel}</button></div>
    </div>
  </div>;
}
