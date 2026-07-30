const XLSX = require('xlsx');

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
    if (flat.some(c => c.includes('Tanggal Cetak'))) {
      const match = flat.join(' ').match(/(\d{4}-\d{2}-\d{2})/);
      if (match) tglTransaksi = match[1];
    }

    // Find totals - look for baris total/JUMLAH
    if (flat.some(c => c.includes('JUMLAH') || c.includes('TOTAL'))) {
      const vals = flat.map(v => parseFloat(v.replace(/[^\d,.-]/g, '').replace(',', '')) || 0);
      const nonZero = vals.filter(v => v > 0);
      
      // Look at the numbers from right to left
      const nums = row.filter(v => {
        const n = parseFloat(String(v).replace(/[^\d,.-]/g, '').replace(',', ''));
        return !isNaN(n) && n > 0;
      }).map(v => parseFloat(String(v).replace(/[^\d,.-]/g, '').replace(',', '')));
      
      if (nums.length >= 5) {
        // Typically: Air, Adm, Denda, Materai/Sewa(DM), Total
        totalAir = nums[nums.length - 5] || totalAir;
        totalAdm = nums[nums.length - 4] || totalAdm;
        totalDenda = nums[nums.length - 3] || totalDenda;
        totalDM = nums[nums.length - 2] || totalDM;
        totalTerima = nums[nums.length - 1] || totalTerima;
      } else if (nums.length >= 4) {
        // If DM is missing or 0
        totalAir = nums[nums.length - 4] || totalAir;
        totalAdm = nums[nums.length - 3] || totalAdm;
        totalDenda = nums[nums.length - 2] || totalDenda;
        totalTerima = nums[nums.length - 1] || totalTerima;
      }
    }

    // Also try: find rows with "UANG AIR" header pattern
    if (flat.some(c => c.includes('UANG AIR')) && flat.some(c => c.includes('ADM'))) {
      const nextRow = data[i + 1];
      if (nextRow) {
        const vals = nextRow.map(v => parseFloat(String(v).replace(/[^\d,.-]/g, '').replace(',', '')) || 0);
        const nums = vals.filter(v => v > 0);
        if (nums.length >= 4) {
          totalAir = nums[nums.length - 4] || totalAir;
          totalAdm = nums[nums.length - 3] || totalAdm;
          totalDenda = nums[nums.length - 2] || totalDenda;
          totalDM = nums[nums.length - 1] || totalDM;
        } else if (nums.length >= 3) {
          totalAir = nums[nums.length - 3] || totalAir;
          totalAdm = nums[nums.length - 2] || totalAdm;
          totalDenda = nums[nums.length - 1] || totalDenda;
        }
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
