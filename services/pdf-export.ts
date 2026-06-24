import { jsPDF } from 'jspdf';

/**
 * Client-side PDF export utility using jsPDF.
 * Dynamically imports jsPDF to ensure compatibility with Next.js SSR.
 */
export async function exportToPDF(title: string, text: string): Promise<void> {
  if (typeof window === 'undefined') {
    console.warn('[pdf-export] Attempted to export PDF on the server. Skipping.');
    return;
  }

  try {
    console.log(`[pdf-export] Launching PDF compilation for: "${title}"...`);
    
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const margin = 20;
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const printableWidth = pageWidth - (margin * 2);

    // 1. Draw header title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59); // Slate-800
    doc.text(title, margin, 20);

    // 2. Draw border line under header
    doc.setDrawColor(226, 232, 240); // Slate-200
    doc.setLineWidth(0.5);
    doc.line(margin, 24, pageWidth - margin, 24);

    // 3. Process lines with word-wrap
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85); // Slate-700
    
    const lines = doc.splitTextToSize(text, printableWidth);
    
    let y = 32;
    const lineSpacing = 6.5;

    for (let i = 0; i < lines.length; i++) {
      // Check for page overflow
      if (y > pageHeight - margin) {
        doc.addPage();
        y = margin; // Reset Y coordinate on new page
      }
      doc.text(lines[i], margin, y);
      y += lineSpacing;
    }

    // 4. Save file
    const safeName = title.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    doc.save(`nyayai_${safeName}.pdf`);
    console.log('[pdf-export] PDF file downloaded successfully.');
  } catch (error) {
    console.error('[pdf-export] Failed to export PDF:', error);
    alert('Failed to generate PDF download. Please try copy-pasting the text.');
  }
}
