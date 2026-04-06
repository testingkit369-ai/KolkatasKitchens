import Papa from 'papaparse';

export function exportToCSV(data: any[], filename: string) {
  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

export function exportToPDF(data: any[], filename: string) {
  // Simple PDF export via window.print() or a basic layout
  // For production, use jspdf or similar.
  // Here we'll just alert that PDF export is triggered.
  console.log('PDF Export triggered for', filename, data);
  window.print();
}
