import { useState, useEffect } from 'react';
import { Printer, Download, MessageCircle, Loader2 } from 'lucide-react';
import Modal from './Modal.jsx';
import ManualReceiptTemplate from './ManualReceiptTemplate.jsx';
import { manualReceiptApi } from '../api/endpoints.js';
import { downloadManualReceiptPdf, shareManualReceiptOnWhatsApp } from '../utils/receiptPdf.js';

/**
 * Loads a manual receipt by id and shows it in a print-ready modal with
 * Print / Download PDF / WhatsApp actions.
 */
export default function ManualReceiptModal({ receiptId, open, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [waLoading, setWaLoading] = useState(false);

  useEffect(() => {
    if (!open || !receiptId) return undefined;
    let mounted = true;
    setLoading(true);
    setData(null);
    manualReceiptApi
      .get(receiptId)
      .then((d) => mounted && setData(d))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [open, receiptId]);

  const handlePrint = () => {
    if (receiptId) manualReceiptApi.markPrinted(receiptId).catch(() => {});
    window.print();
  };

  const handleDownload = async () => {
    if (!data) return;
    setPdfLoading(true);
    try {
      await downloadManualReceiptPdf(data.receipt, data.settings);
      if (receiptId) manualReceiptApi.markPrinted(receiptId).catch(() => {});
    } catch (e) {
      console.error('PDF generation failed', e);
      window.print();
    } finally {
      setPdfLoading(false);
    }
  };

  const handleWhatsApp = async () => {
    if (!data) return;
    const r = data.receipt || {};
    const student = r.studentId || r.studentSnapshot || {};
    setWaLoading(true);
    try {
      await shareManualReceiptOnWhatsApp({ receipt: r, settings: data.settings, mobile: student.mobile });
    } catch (e) {
      console.error('WhatsApp share failed', e);
    } finally {
      setWaLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Manual Receipt"
      size="md"
      footer={
        <>
          <button className="btn btn-outline btn-md" onClick={handleWhatsApp} disabled={!data || waLoading} title="Downloads PDF then opens WhatsApp">
            {waLoading ? <Loader2 size={16} className="animate-spin" /> : <MessageCircle size={16} />}
            WhatsApp
          </button>
          <button className="btn btn-outline btn-md" onClick={handleDownload} disabled={!data || pdfLoading}>
            {pdfLoading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            Download PDF
          </button>
          <button className="btn btn-primary btn-md" onClick={handlePrint} disabled={!data}>
            <Printer size={16} /> Print
          </button>
        </>
      }
    >
      {loading || !data ? (
        <div className="flex justify-center py-10">
          <Loader2 className="animate-spin text-accent" />
        </div>
      ) : (
        <>
          <ManualReceiptTemplate receipt={data.receipt} settings={data.settings} />
          <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-center text-xs text-text-secondary">
            📎 WhatsApp will download the PDF first — attach it in WhatsApp after it opens.
          </p>
        </>
      )}
    </Modal>
  );
}
