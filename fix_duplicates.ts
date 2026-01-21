import * as fs from "https://deno.land/std@0.208.0/fs/mod.ts";

async function fixDuplicates(filePath: string) {
  const text = await Deno.readTextFile(filePath);
  const lines = text.split('\n');
  
  const seen = new Set<string>();
  const toRemove: Array<{start: number, end: number}> = [];
  
  let depth = 0;
  let removeStart: number | null = null;
  let inRemoveSection = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Track depth
    const openCount = (line.match(/{/g) || []).length;
    const closeCount = (line.match(/}/g) || []).length;
    depth += openCount - closeCount;
    
    // At depth 1, check for keys
    if (depth === 1 && line.match(/^"(\w+)":\s*{/)) {
      const match = line.match(/^"(\w+)":/);
      if (match) {
        const key = match[1];
        
        if (seen.has(key)) {
          // Duplicate found
          removeStart = i;
          inRemoveSection = true;
          console.log(`Duplicate found: ${key} at line ${i + 1}`);
        } else {
          seen.add(key);
        }
      }
    }
    
    // Check if we're closing the section to remove
    if (inRemoveSection && depth === 1 && line === '},') {
      if (removeStart !== null) {
        toRemove.push({ start: removeStart, end: i });
        console.log(`  Will remove lines ${removeStart + 1} to ${i + 1}`);
      }
      removeStart = null;
      inRemoveSection = false;
    }
  }
  
  // Build new content
  const newLines: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const shouldRemove = toRemove.some(r => i >= r.start && i <= r.end);
    if (!shouldRemove) {
      newLines.push(lines[i]);
    }
  }
  
  await Deno.writeTextFile(filePath, newLines.join('\n'));
  console.log(`Fixed: ${filePath}\n`);
}

// Fix both files
await fixDuplicates('src/lib/locales/nl/translation.json');
await fixDuplicates('src/lib/locales/en/translation.json');

console.log('Done!');
