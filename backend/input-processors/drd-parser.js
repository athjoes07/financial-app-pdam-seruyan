const XLSX = require('xlsx-js-style');

function parse(filePath) {
  const wb = XLSX.readFile(filePath, { raw: false });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  let inTable = false;
  const rows = [];
  const headerMap = {};
  const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const flat = row.map(v => String(v).trim());

    // Detect month
    let bulan = null;
    for (const m of months) {
      if (flat.some(c => c.toUpperCase().includes(m.toUpperCase()))) { bulan = m; break; }
    }

    // Detect header row with GOLONGAN TARIF
    if (flat.some(c => c.toUpperCase().includes('GOLONGAN TARIF'))) {
      inTable = true;
      headerMap.colGol = flat.findIndex(c => c.toUpperCase().includes('GOLONGAN TARIF'));
      headerMap.colHA = flat.findIndex(c => c.toUpperCase().includes('HARGA AIR'));
      headerMap.colAdm = flat.findIndex(c => c.toUpperCase().includes('JASA ADM'));
      headerMap.colDM = flat.findIndex(c => c.toUpperCase().includes('DANA METER'));
      headerMap.colTotal = flat.findIndex(c => c.toUpperCase().includes('TOTAL (7+8)'));
      continue;
    }

    if (inTable) {
      const colGol = headerMap.colGol || 0;
      const gol = flat[colGol];
      const golUp = gol ? gol.toUpperCase() : '';
      if (!gol || gol === '' || golUp.includes('JUMLAH') || golUp.includes('JML') || golUp.includes('TOTAL') || golUp.includes('GRAND TOTAL')) {
        if (gol && (golUp.includes('JUMLAH') || golUp.includes('TOTAL') || golUp.includes('GRAND TOTAL'))) {
          const totalVal = headerMap.colTotal >= 0 ? flat[headerMap.colTotal] : '';
          const total = parseFloat(totalVal?.replace(/[^\d,.-]/g, '').replace(/,/g, '') || '0');
          if (total > 0) {
            rows.push({
              golongan: 'TOTAL',
              bulan: rows.length > 0 ? rows[0].bulan : bulan,
              ha: total,
              adm: 0,
              dm: 0,
              is_total: true
            });
          }
        }
        continue;
      }
      if (golUp.match(/^(HU|TI|YS|RS\d?|R3|IRT|NK|INST|NB|R1|R2|S|PA|PB|PI|PP|PM|PS|PK|PEL|INST)\s/)) {
        const haStr = headerMap.colHA >= 0 ? flat[headerMap.colHA] : '0';
        const admStr = headerMap.colAdm >= 0 ? flat[headerMap.colAdm] : '0';
        const dmStr = headerMap.colDM >= 0 ? flat[headerMap.colDM] : '0';
        rows.push({
          golongan: gol.split('-')[0].trim().split(' ')[0],
          bulan: bulan || 'Mei',
          ha: parseFloat(haStr.replace(/[^\d,.-]/g, '').replace(/,/g, '')) || 0,
          adm: parseFloat(admStr.replace(/[^\d,.-]/g, '').replace(/,/g, '')) || 0,
          dm: parseFloat(dmStr.replace(/[^\d,.-]/g, '').replace(/,/g, '')) || 0,
          is_total: false
        });
      }
    }
  }

  return {
    source: 'DRD',
    file: filePath.split('\\').pop().split('/').pop(),
    bulan: rows.length > 0 ? rows[0].bulan : 'Mei',
    rows,
    summary: {
      total_ha: rows.reduce((s, r) => s + (r.is_total ? 0 : r.ha), 0),
      total_adm: rows.reduce((s, r) => s + (r.is_total ? 0 : r.adm), 0),
      total_dm: rows.reduce((s, r) => s + (r.is_total ? 0 : r.dm), 0),
    }
  };
}

module.exports = { parse };
