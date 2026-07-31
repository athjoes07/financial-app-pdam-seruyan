const XLSX = require('xlsx-js-style');

function parse(filePath) {
  const wb = XLSX.readFile(filePath, { raw: false });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  const fileName = filePath.split('\\').pop().split('/').pop();
  let sumber = 'Loket Kantor';
  if (fileName.includes('koperasi')) sumber = 'KOPERASI';
  else if (fileName.includes('cabang')) sumber = 'LOKET CABANG';
  else if (fileName.includes('kantor')) sumber = 'LOKET KANTOR';

  let tglTransaksi = null;
  let totalAir = 0, totalAdm = 0, totalDenda = 0, totalDM = 0, totalTerima = 0;

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const flat = row.map(v => String(v).trim());

    // Find transaction date
    if (flat.some(c => c.toUpperCase().includes('TANGGAL CETAK'))) {
      const match = flat.join(' ').match(/(\d{4}-\d{2}-\d{2})/);
      if (match) tglTransaksi = match[1];
    }

    // Find totals - look for baris total/JUMLAH
    if (flat.some(c => c.toUpperCase().includes('JUMLAH') || c.toUpperCase().includes('TOTAL'))) {
      // Find all valid numbers in this row
      const nums = row.filter(v => {
        const str = String(v).trim();
        if (str === '') return false;
        if (str.toUpperCase().includes('TOTAL') || str.toUpperCase().includes('JUMLAH')) return false;
        const n = parseFloat(str.replace(/[^\d,.-]/g, '').replace(/,/g, ''));
        return !isNaN(n);
      }).map(v => parseFloat(String(v).replace(/[^\d,.-]/g, '').replace(/,/g, '')));
      
      // If we found at least 8 numbers, we can assume it's the total row of LPP
      // Typical nums from right to left: 
      // [0] TOTAL
      // [1] MATERAI
      // [2] DENDA
      // [3] SUBTOTAL
      // [4] NILAI REK (DM)
      // [5] REK. AIR
      // [6] ADM
      // [7] UANG AIR
      // [8] Jumlah Pelanggan
      
      if (nums.length >= 8) {
        // Reverse array to read from right to left reliably
        const rev = [...nums].reverse();
        
        totalTerima = rev[0] || 0;
        totalDM = rev[4] || 0;
        totalDenda = rev[2] || 0;
        totalAdm = rev[6] || 0;
        totalAir = rev[7] || 0;
        
        // Break out early once we found the main total row
        break;
      }
    }
  }

  return {
    source: 'LPP',
    file: fileName,
    sumber,
    tgl_transaksi: tglTransaksi,
    total_air: totalAir,
    total_adm: totalAdm,
    total_denda: totalDenda,
    total_dm: totalDM,
    total_terima: totalTerima || (totalAir + totalAdm + totalDenda + totalDM)
  };
}

module.exports = { parse };
