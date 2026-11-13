import { useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useToast } from '../../context/ToastContext.jsx';
import Modal from '../common/Modal.jsx';
import Field from '../common/Field.jsx';

/** QR code that opens the Start / Finish charging page for one station. */
export default function QrModal({ station, onClose }) {
  const toast = useToast();
  const boxRef = useRef(null);
  const [base, setBase] = useState(window.location.origin);
  const url = `${base.replace(/\/+$/, '')}/charge/${station.id}`;

  const print = () => {
    const svg = boxRef.current?.querySelector('svg');
    if (!svg) return toast('QR code is not ready', 'bad');
    const w = window.open('', '_blank');
    if (!w) return toast('Allow pop-ups to print', 'bad');
    const name = station.name.replace(/[&<>"']/g, '');
    w.document.write(
      `<title>QR - ${name}</title><body style="font-family:system-ui;text-align:center;padding:40px">` +
      `<h1>${name}</h1><div style="width:320px;margin:0 auto">${svg.outerHTML.replace('<svg', '<svg width="320" height="320"')}</div>` +
      '<h2>Scan to start or finish charging</h2><p>ChargeWay</p>',
    );
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  };

  return (
    <Modal title={`QR code for ${station.name}`} onClose={onClose}>
      <p className="muted small">Print this and stick it on the charger. Drivers scan it to open the Start / Finish charging page for this station.</p>
      <Field label="Website address the QR code opens" hint={'Use an address phones can reach (your server\'s network address or your live website), not "localhost".'}>
        <input value={base} onChange={(e) => setBase(e.target.value)} />
      </Field>
      <div ref={boxRef} style={{ display: 'grid', placeItems: 'center', padding: 14, background: '#fff', border: '1px solid var(--line)', borderRadius: 12 }}>
        <QRCodeSVG value={url} size={220} level="M" />
      </div>
      <p className="small muted" style={{ wordBreak: 'break-all' }}>{url}</p>
      <div className="row">
        <button className="btn spark" onClick={print}>Print</button>
        <button className="btn ghost" onClick={onClose}>Close</button>
      </div>
    </Modal>
  );
}
