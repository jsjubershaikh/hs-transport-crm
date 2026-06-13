import { useState, useEffect } from 'react';
import { Printer, Download, MessageCircle, Loader2 } from 'lucide-react';
import Modal from './Modal.jsx';
import ReceiptTemplate from './ReceiptTemplate.jsx';
import BulkReceiptTemplate from './BulkReceiptTemplate.jsx';
import { receiptApi } from '../api/endpoints.js';
import { MONTH_LABELS } from '../utils/constants.js';
import { downloadReceiptPdf, shareReceiptOnWhatsApp } from '../utils/receiptPdf.js';

/**
 * Loads a populated receipt by id and shows it in a print-ready modal.
 * - Print        → browser print dialog (print-area CSS isolates the receipt)
 * - Download PDF → html2canvas + jsPDF saves a PDF file
 * - WhatsApp     → generates + downloads the PDF, then opens WhatsApp with
 *                  a pre-filled message (user attaches the file)
 */
export default function ReceiptModal({ receiptId, open, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [waLoading, setWaLoading] = useState(false);

  useEffect(() => {
    if (!open || !receiptId) return;
    let mounted = true;
    setLoading(true);
    receiptApi
      .get(receiptId)
      .then((d) => mounted && setData(d))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [open, receiptId]);

  const handlePrint = () => {
    if (receiptId) receiptApi.markPrinted(receiptId).catch(() => {});
    window.print();
  };

  const handleDownload = async () => {
    if (!data) return;
    setPdfLoading(true);
    try {
      await downloadReceiptPdf(data.receipt?.receiptNumber);
      if (receiptId) receiptApi.markPrinted(receiptId).catch(() => {});
    } catch (e) {
      console.error('PDF generation failed', e);
      // fallback to print-to-PDF
      window.print();
    } finally {
      setPdfLoading(false);
    }
  };

  const handleWhatsApp = async () => {
    if (!data) return;
    const r = data.receipt || {};
    const student = r.studentId || {};
    setWaLoading(true);
    try {
      await shareReceiptOnWhatsApp({
        receiptNumber: r.receiptNumber,
        studentName: student.name,
        month: MONTH_LABELS[r.month] || r.month,
        amount: r.amount,
        mobile: student.mobile,
        companyName: data.settings?.company?.name,
      });
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
      title="Receipt"
      size="md"
      footer={
        <>
          <button
            className="btn btn-outline btn-md"
            onClick={handleWhatsApp}
            disabled={!data || waLoading}
            title="Downloads PDF then opens WhatsApp"
          >
            {waLoading ? <Loader2 size={16} className="animate-spin" /> : <MessageCircle size={16} />}
            WhatsApp
          </button>
          <button
            className="btn btn-outline btn-md"
            onClick={handleDownload}
            disabled={!data || pdfLoading}
          >
            {pdfLoading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            Download PDF
          </button>
          <button className="btn btn-primary btn-md" onClick={handlePrint}>
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
          {data.receipt?.receiptType === 'bulk'
            ? <BulkReceiptTemplate receipt={data.receipt} settings={data.settings} />
            : <ReceiptTemplate receipt={data.receipt} settings={data.settings} />
          }
          {/* WhatsApp helper note */}
          <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-center text-xs text-text-secondary">
            📎 WhatsApp will download the PDF first — attach it in WhatsApp after it opens.
          </p>
        </>
      )}
    </Modal>
  );
}
