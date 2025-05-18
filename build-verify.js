const fs = require('fs');
const path = require('path');

// Files that should exist after build
const requiredFiles = [
  'dist/server/index.js',
  'dist/admin/index.js',
  'package.json',
  'README.md',
  'LICENSE'
];

console.log('Verifying build output...');

let hasErrors = false;

// Check for required files
for (const file of requiredFiles) {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Missing required file: ${file}`);
    hasErrors = true;
  } else {
    console.log(`✅ Found: ${file}`);
  }
}

if (hasErrors) {
  console.error('\n❌ Build verification failed! Some required files are missing.');
  process.exit(1);
} else {
  console.log('\n✅ Build verification successful! All required files are present.');
}