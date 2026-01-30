const fs = require('fs');
const path = require('path');

const files = [
  'src/components/AudioPlayer.tsx',
  'src/components/Queue.tsx',
  'src/pages/Discover.tsx',
  'src/pages/Search.tsx',
  'src/pages/Profile.tsx',
  'src/pages/PodcastDetail.tsx'
];

files.forEach(filePath => {
  console.log(`Processing ${filePath}...`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Add import if not present
  if (!content.includes('getApiUrl')) {
    // Find last import statement
    const importLines = content.split('\n');
    let lastImportIndex = -1;
    for (let i = 0; i < importLines.length; i++) {
      if (importLines[i].trim().startsWith('import ')) {
        lastImportIndex = i;
      }
    }
    if (lastImportIndex >= 0) {
      importLines.splice(lastImportIndex + 1, 0, "import { getApiUrl } from '../services/api';");
      content = importLines.join('\n');
    }
  }
  
  // Replace all fetch URLs
  content = content.replace(/'http:\/\/localhost:3001\/api\//g, "getApiUrl('/");
  content = content.replace(/`http:\/\/localhost:3001\/api\//g, "getApiUrl(`/");
  content = content.replace(/`http:\/\/localhost:3001\/api\/\$\{/g, "getApiUrl(`/${");
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`✓ Fixed ${filePath}`);
});

console.log('\nAll files processed!');
