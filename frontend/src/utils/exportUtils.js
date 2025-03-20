import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';

export const exportToExcel = (data) => {
  const wb = XLSX.utils.book_new();
  
  // Create worksheets
  const incomeWS = XLSX.utils.json_to_sheet(data.incomes || []);
  const paymentsWS = XLSX.utils.json_to_sheet(data.payments || []);
  
  // Add to workbook
  XLSX.utils.book_append_sheet(wb, incomeWS, "Income");
  XLSX.utils.book_append_sheet(wb, paymentsWS, "Payments");
  
  // Generate and save
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'binary' });
  
  const buf = new ArrayBuffer(wbout.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < wbout.length; i++) {
    view[i] = wbout.charCodeAt(i) & 0xFF;
  }
  
  saveAs(new Blob([buf], { type: 'application/octet-stream' }), 'budget-data.xlsx');
};

export const exportToJson = (data, filename = 'budget-data') => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  saveAs(blob, `${filename}.json`);
};

export const importFromJson = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        resolve(data);
      } catch (error) {
        reject(new Error('Invalid JSON file'));
      }
    };
    reader.onerror = () => reject(new Error('Error reading file'));
    reader.readAsText(file);
  });
};