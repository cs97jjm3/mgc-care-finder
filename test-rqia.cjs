// Quick test to debug RQIA xlsx loading
const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, 'data', 'rqia.xlsx');
console.log('Reading:', filePath);

try {
    const workbook = XLSX.readFile(filePath);
    console.log('Sheet names:', workbook.SheetNames);
    
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet);
    
    console.log('Total rows:', rows.length);
    
    if (rows.length > 0) {
        console.log('\nColumn names in first row:');
        Object.keys(rows[0]).forEach((key, i) => {
            console.log(`  [${i}] "${key}" = "${rows[0][key]}"`);
        });
        
        // Test the getValue logic
        const getValue = (row, keys) => {
            for (const key of Object.keys(row)) {
                const keyLower = key.toLowerCase();
                for (const search of keys) {
                    if (keyLower.includes(search.toLowerCase())) {
                        return String(row[key] || "");
                    }
                }
            }
            return "";
        };
        
        console.log('\nTesting getValue on first row:');
        console.log('  serviceName:', getValue(rows[0], ["service name", "servicename", "name"]));
        console.log('  serviceType:', getValue(rows[0], ["service type", "servicetype", "category"]));
        console.log('  address:', getValue(rows[0], ["address"]));
        console.log('  postcode:', getValue(rows[0], ["postcode", "post code"]));
        console.log('  phone:', getValue(rows[0], ["phone", "telephone", "tel"]));
        console.log('  provider:', getValue(rows[0], ["provider", "registered provider"]));
        
        // Count how many would pass the filter
        const mapped = rows.map(row => ({
            serviceName: getValue(row, ["service name", "servicename", "name"]),
            serviceType: getValue(row, ["service type", "servicetype", "category"])
        }));
        
        const withName = mapped.filter(p => p.serviceName);
        console.log('\nRows with serviceName:', withName.length);
        console.log('Rows without serviceName:', mapped.length - withName.length);
        
        if (withName.length > 0) {
            console.log('\nFirst 3 with names:');
            withName.slice(0, 3).forEach(p => console.log(' ', p));
        }
    }
} catch (error) {
    console.error('Error:', error);
}
