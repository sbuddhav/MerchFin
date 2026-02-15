export function formatCellValue(value: number | null | undefined, dataType: string, _formatPattern?: string | null): string {
  if (value === null || value === undefined) return '';
  
  switch (dataType) {
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    case 'units':
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    case 'percentage':
      return `${value.toFixed(1)}%`;
    case 'ratio':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value);
    default:
      return String(value);
  }
}

export function parseCellValue(value: string, _dataType: string): number | null {
  if (!value || value.trim() === '') return null;
  const cleaned = value.replace(/[$,%\s]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}
