const fs = require('fs');

const files = [
  'src/components/AudioPlayer.tsx',
  'src/components/Queue.tsx',
  'src/pages/Discover.tsx',
  'src/pages/Search.tsx',
  'src/pages/Profile.tsx',
  'src/pages/PodcastDetail.tsx'
];

files.forEach(filePath => {
  console.log(`Fixing ${filePath}...`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Fix pattern: getApiUrl('/path', { => getApiUrl('/path'), {
  content = content.replace(/getApiUrl\('([^']+)',\s*\{/g, "getApiUrl('$1'), {");
  content = content.replace(/getApiUrl\(`([^`]+)`,\s*\{/g, "getApiUrl(`$1`), {");
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`✓ Fixed ${filePath}`);
});

console.log('\nAll fetch calls fixed!');
