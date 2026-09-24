import { ColumnModel } from '../../core/column-model';
import { ValueService } from '../../core/value-service';
import { RowNode } from '../../models/row-node';

export interface ExcelExportParams<TData = any> {
  fileName?: string;
  sheetName?: string;
  columnKeys?: string[];
}

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function cellXml(value: unknown): string {
  if (value === null || value === undefined || value === '') return '<Cell></Cell>';
  if (typeof value === 'number') {
    return `<Cell><Data ss:Type="Number">${value}</Data></Cell>`;
  }
  if (typeof value === 'boolean') {
    return `<Cell><Data ss:Type="Boolean">${value ? 1 : 0}</Data></Cell>`;
  }
  if (value instanceof Date) {
    return `<Cell ss:StyleID="sDate"><Data ss:Type="DateTime">${value.toISOString()}</Data></Cell>`;
  }
  return `<Cell><Data ss:Type="String">${xmlEscape(String(value))}</Data></Cell>`;
}

/**
 * Generates a native Excel spreadsheet using the SpreadsheetML 2003 XML
 * format — a plain-text XML document Excel opens natively (styled cells,
 * multiple sheets), with no zip/OOXML dependency required.
 */
export function buildExcelXml<TData>(
  columnModel: ColumnModel<TData>,
  rows: RowNode<TData>[],
  valueService: ValueService<TData>,
  params?: ExcelExportParams<TData>,
): string {
  const columns = columnModel
    .visibleColumns()
    .filter((c) => !params?.columnKeys || params.columnKeys.includes(c.colId));
  const sheetName = xmlEscape(params?.sheetName ?? 'Sheet1');

  const headerRow = `<Row ss:StyleID="sHeader">${columns.map((c) => `<Cell><Data ss:Type="String">${xmlEscape(c.headerName())}</Data></Cell>`).join('')}</Row>`;

  const dataRows = rows
    .filter((n) => n.data !== undefined)
    .map((node) => {
      const styleId = node.group ? ' ss:StyleID="sGroup"' : '';
      const cells = columns
        .map((c) => {
          const raw = valueService.getValue(c, node);
          return cellXml(raw);
        })
        .join('');
      return `<Row${styleId}>${cells}</Row>`;
    })
    .join('');

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="sHeader">
   <Font ss:Bold="1"/>
   <Interior ss:Color="#F5F6F8" ss:Pattern="Solid"/>
   <Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/></Borders>
  </Style>
  <Style ss:ID="sGroup">
   <Font ss:Bold="1"/>
   <Interior ss:Color="#EEF3FB" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="sDate">
   <NumberFormat ss:Format="Short Date"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="${sheetName}">
  <Table>
   ${headerRow}
   ${dataRows}
  </Table>
  <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
   <FreezePanes/><FrozenNoSplit/><SplitHorizontal>1</SplitHorizontal><TopRowBottomPane>1</TopRowBottomPane><ActivePane>2</ActivePane>
  </WorksheetOptions>
 </Worksheet>
</Workbook>`;
}

export function exportToExcel<TData>(
  columnModel: ColumnModel<TData>,
  rows: RowNode<TData>[],
  valueService: ValueService<TData>,
  params?: ExcelExportParams<TData>,
): void {
  const xml = buildExcelXml(columnModel, rows, valueService, params);
  const blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = params?.fileName ?? 'export.xls';
  a.click();
  URL.revokeObjectURL(url);
}
