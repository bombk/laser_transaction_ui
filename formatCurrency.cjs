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
    
    // Convert back to en-IN so numbers and dates are in English text, but South Asian grouping
    c = c.replace(/ne-NP/g, 'en-IN');
    
    // Ensure space between रू and amount
    c = c.replace(/रू\{/g, 'रू {');
    c = c.replace(/रू\$\{/g, 'रू ${');
    
    fs.writeFileSync(p, c);
    console.log('Updated', f);
});
