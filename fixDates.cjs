const fs = require('fs');
const path = require('path');

const files = [
    'src/pages/AdminDashboard.jsx',
    'src/pages/Dashboard.jsx',
    'src/pages/SystemDashboard.jsx'
];

files.forEach(f => {
    const p = path.join(process.cwd(), f);
    let c = fs.readFileSync(p, 'utf8');
    
    // We want to replace the getDateRange logic.
    // Let's find the getDateRange block and replace it entirely.
    
    const blockStart = c.indexOf('const getDateRange = useCallback(() => {');
    const blockEnd = c.indexOf('}, [dateFilter, customStart, customEnd]);') + '}, [dateFilter, customStart, customEnd]);'.length;
    
    if (blockStart === -1 || blockEnd === -1) {
        console.error('Could not find getDateRange in', f);
        return;
    }
    
    const newBlock = `const getDateRange = useCallback(() => {
    const formatLocal = (d) => {
      const offset = d.getTimezoneOffset();
      return new Date(d.getTime() - (offset * 60 * 1000)).toISOString().split('T')[0];
    };
    const end = new Date();
    let start = new Date();
    switch (dateFilter) {
      case '7d': start.setDate(end.getDate() - 7); break;
      case '30d': start.setDate(end.getDate() - 30); break;
      case '90d': start.setDate(end.getDate() - 90); break;
      case 'all': start = new Date('2020-01-01'); break;
      case 'custom':
        return {
          startDate: customStart || '2020-01-01',
          endDate: customEnd || formatLocal(new Date())
        };
      default: start.setDate(end.getDate() - 7);
    }
    return {
      startDate: formatLocal(start),
      endDate: formatLocal(end)
    };
  }, [dateFilter, customStart, customEnd]);`;

    c = c.substring(0, blockStart) + newBlock + c.substring(blockEnd);
    
    fs.writeFileSync(p, c);
    console.log('Updated', f);
});
