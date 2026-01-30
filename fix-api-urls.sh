#!/bin/bash

# Replace all hardcoded http://localhost:3001/api URLs with getApiUrl helper

# Files that need updating
FILES=(
  "src/components/AudioPlayer.tsx"
  "src/components/Queue.tsx"
  "src/pages/Discover.tsx"
  "src/pages/Search.tsx"
  "src/pages/Profile.tsx"
  "src/pages/PodcastDetail.tsx"
  "src/pages/Login.tsx"
  "src/pages/Register.tsx"
)

for file in "${FILES[@]}"; do
  echo "Fixing $file..."
  
  # Add import if not already present
  if ! grep -q "import.*getApiUrl.*from.*services/api" "$file"; then
    # Find the last import line and add our import after it
    sed -i '' "/^import/\$a\\
import { getApiUrl } from '../services/api';
" "$file"
  fi
  
  # Replace fetch URLs
  sed -i '' "s|'http://localhost:3001/api/|getApiUrl('/|g" "$file"
  sed -i '' 's|`http://localhost:3001/api/${|`${getApiUrl("/|g' "$file"
  sed -i '' 's|`http://localhost:3001/api/\([^`]*\)`|getApiUrl(`/\1`)|g' "$file"
done

echo "Done!"
