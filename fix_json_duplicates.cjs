const fs = require('fs');
const path = require('path');

// Fix nl/translation.json
function fixTranslationFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  // Find duplicate keys by tracking what we've seen
  const keysFound = new Map();
  const linesToRemove = [];
  let currentKey = null;
  let braceDepth = 0;
  let removeStart = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Track brace depth
    if (line.includes('{')) braceDepth++;
    if (line.includes('}')) braceDepth--;
    
    // Check for top-level keys (depth ~1)
    if (braceDepth === 1 && line.startsWith('"') && line.includes(': {')) {
      const key = line.split('"')[1];
      
      if (keysFound.has(key)) {
        // This is a duplicate - mark for removal
        removeStart = i;
        currentKey = key;
        console.log(`Found duplicate: ${key} at line ${i + 1}`);
      } else {
        keysFound.set(key, i);
      }
    }
    
    // If we're removing a section, track until we close it
    if (removeStart !== null && braceDepth === 1 && line === '},') {
      linesToRemove.push({ start: removeStart, end: i });
      console.log(`  Marking lines ${removeStart + 1}-${i + 1} for removal`);
      removeStart = null;
      currentKey = null;
    }
  }
  
  // Build new content without the duplicate sections
  const newLines = [];
  let skip = false;
  
  for (let i = 0; i < lines.length; i++) {
    // Check if this line starts a remove range
    const shouldRemove = linesToRemove.some(range => 
      i >= range.start && i <= range.end
    );
    
    if (!shouldRemove) {
      newLines.push(lines[i]);
    }
  }
  
  return newLines.join('\n');
}

// Process both files
const nlPath = path.join(__dirname, 'src', 'lib', 'locales', 'nl', 'translation.json');
const enPath = path.join(__dirname, 'src', 'lib', 'locales', 'en', 'translation.json');

try {
  console.log('Fixing nl/translation.json...');
  const nlFixed = fixTranslationFile(nlPath);
  fs.writeFileSync(nlPath, nlFixed, 'utf8');
  console.log('✓ nl/translation.json fixed\n');
  
  console.log('Fixing en/translation.json...');
  const enFixed = fixTranslationFile(enPath);
  fs.writeFileSync(enPath, enFixed, 'utf8');
  console.log('✓ en/translation.json fixed');
  
  console.log('\nDone! Please verify the files.');
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
