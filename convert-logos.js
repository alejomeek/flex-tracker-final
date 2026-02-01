const fs = require('fs');
const path = require('path');

const logo1Path = path.join(__dirname, 'admin', 'logo_halcon.png');
const logo2Path = path.join(__dirname, 'admin', 'logo transparente.png');

const logo1Base64 = fs.readFileSync(logo1Path).toString('base64');
const logo2Base64 = fs.readFileSync(logo2Path).toString('base64');

console.log('LOGO_HALCON_LENGTH:', logo1Base64.length);
console.log('LOGO_EMPRESA_LENGTH:', logo2Base64.length);

// Save to file
const output = {
    logoHalcon: `data:image/png;base64,${logo1Base64}`,
    logoEmpresa: `data:image/png;base64,${logo2Base64}`
};

fs.writeFileSync('admin/logos-base64.json', JSON.stringify(output, null, 2));
console.log('Saved to admin/logos-base64.json');
