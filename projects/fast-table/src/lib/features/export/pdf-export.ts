import { ColumnModel } from '../../core/column-model';
import { ValueService } from '../../core/value-service';
import { RowNode } from '../../models/row-node';

export interface PdfExportParams<TData = any> {
  fileName?: string;
  title?: string;
  columnKeys?: string[];
  orientation?: 'portrait' | 'landscape';
}

/** Minimal, dependency-free PDF writer: enough of the PDF 1.4 object model
 *  (catalog, pages, content streams, xref table) to lay out a paginated grid
 *  of text using the built-in Helvetica font — no embedding, no external libs. */
class MiniPdf {
  private objects: string[] = [];
  private pageIds: number[] = [];
  private pageWidth: number;
  private pageHeight: number;

  constructor(pageWidth: number, pageHeight: number) {
    this.pageWidth = pageWidth;
    this.pageHeight = pageHeight;
  }

  private nextId(): number {
    return this.objects.length + 1;
  }

  private addObject(body: string): number {
    const id = this.nextId();
    this.objects.push(`${id} 0 obj\n${body}\nendobj\n`);
    return id;
  }

  addPage(content: string): void {
    const fontId =
      this.fontId ??
      (this.fontId = this.addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'));
    const streamBody = `<< /Length ${content.length} >>\nstream\n${content}\nendstream`;
    const contentId = this.addObject(streamBody);
    const pageId = this.addObject(
      `<< /Type /Page /Parent PAGES_REF /MediaBox [0 0 ${this.pageWidth} ${this.pageHeight}] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`,
    );
    this.pageIds.push(pageId);
  }

  private fontId: number | null = null;

  build(): string {
    const pagesId = this.nextId();
    const kids = this.pageIds.map((id) => `${id} 0 R`).join(' ');
    this.objects.push(
      `${pagesId} 0 obj\n<< /Type /Pages /Kids [${kids}] /Count ${this.pageIds.length} >>\nendobj\n`,
    );
    // patch PAGES_REF placeholders now that we know the Pages object id
    this.objects = this.objects.map((o) => o.replace(/PAGES_REF/g, `${pagesId} 0 R`));

    const catalogId = this.addObject(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

    let pdf = '%PDF-1.4\n';
    const offsets: number[] = [];
    for (const obj of this.objects) {
      offsets.push(pdf.length);
      pdf += obj;
    }
    const xrefStart = pdf.length;
    pdf += `xref\n0 ${this.objects.length + 1}\n0000000000 65535 f \n`;
    for (const offset of offsets) {
      pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
    }
    pdf += `trailer\n<< /Size ${this.objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
    return pdf;
  }
}

function pdfEscape(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function truncate(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, Math.max(0, maxChars - 1)) + '…';
}

export function buildPdf<TData>(
  columnModel: ColumnModel<TData>,
  rows: RowNode<TData>[],
  valueService: ValueService<TData>,
  params?: PdfExportParams<TData>,
): Uint8Array {
  const landscape = params?.orientation === 'landscape';
  const pageWidth = landscape ? 842 : 595;
  const pageHeight = landscape ? 595 : 842;
  const margin = 36;
  const usableWidth = pageWidth - margin * 2;
  const rowHeight = 16;
  const titleHeight = params?.title ? 26 : 0;

  const columns = columnModel
    .visibleColumns()
    .filter((c) => !params?.columnKeys || params.columnKeys.includes(c.colId));
  const colWidth = usableWidth / Math.max(1, columns.length);
  const charsPerCol = Math.max(4, Math.floor(colWidth / 5.2));

  const rowsPerPage = Math.floor((pageHeight - margin * 2 - titleHeight - rowHeight) / rowHeight);
  const dataRows = rows.filter((n) => n.data !== undefined);
  const pageCount = Math.max(1, Math.ceil(dataRows.length / rowsPerPage));

  const pdf = new MiniPdf(pageWidth, pageHeight);

  for (let page = 0; page < pageCount; page++) {
    const pageRows = dataRows.slice(page * rowsPerPage, (page + 1) * rowsPerPage);
    let y = pageHeight - margin;
    const lines: string[] = ['BT', '/F1 9 Tf'];

    if (params?.title) {
      lines.push(`1 0 0 1 ${margin} ${y - 12} Tm (${pdfEscape(params.title)}) Tj`);
      y -= titleHeight;
    }

    lines.push('/F1 8 Tf');
    columns.forEach((col, i) => {
      const x = margin + i * colWidth;
      lines.push(
        `1 0 0 1 ${x.toFixed(1)} ${(y - 10).toFixed(1)} Tm (${pdfEscape(truncate(col.headerName(), charsPerCol))}) Tj`,
      );
    });
    y -= rowHeight;

    lines.push('/F1 8 Tf');
    for (const node of pageRows) {
      columns.forEach((col, i) => {
        const x = margin + i * colWidth;
        const text = truncate(valueService.getFormattedValue(col, node), charsPerCol);
        lines.push(`1 0 0 1 ${x.toFixed(1)} ${(y - 10).toFixed(1)} Tm (${pdfEscape(text)}) Tj`);
      });
      y -= rowHeight;
    }
    lines.push('ET');

    // header/footer separator rule
    const ruleY = pageHeight - margin - titleHeight - rowHeight + 4;
    const rule = `${margin} ${ruleY.toFixed(1)} m ${pageWidth - margin} ${ruleY.toFixed(1)} l S`;

    pdf.addPage(`${rule}\n${lines.join('\n')}`);
  }

  const pdfString = pdf.build();
  const bytes = new Uint8Array(pdfString.length);
  for (let i = 0; i < pdfString.length; i++) bytes[i] = pdfString.charCodeAt(i) & 0xff;
  return bytes;
}

export function exportToPdf<TData>(
  columnModel: ColumnModel<TData>,
  rows: RowNode<TData>[],
  valueService: ValueService<TData>,
  params?: PdfExportParams<TData>,
): void {
  const bytes = buildPdf(columnModel, rows, valueService, params);
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = params?.fileName ?? 'export.pdf';
  a.click();
  URL.revokeObjectURL(url);
}
