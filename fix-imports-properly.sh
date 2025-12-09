#!/bin/bash

# Fix imports: remove .js first, then add it back properly
find src -name "*.ts" -type f | while read file; do
    # Remove .js from relative imports (to clean up)
    sed -i "s|from ['\"]\\(\.\\.*/[^'\"]*\\)\\.js['\"]|from '\\1'|g" "$file"
    sed -i "s|from ['\"]\\(\./[^'\"]*\\)\\.js['\"]|from '\\1'|g" "$file"
    
    # Add .js to relative imports that don't have it
    sed -i "s|from ['\"]\\(\.\\.*/[^'\"]*\\)['\"]|from '\\1.js'|g" "$file"
    sed -i "s|from ['\"]\\(\./[^'\"]*\\)['\"]|from '\\1.js'|g" "$file"
done

echo "Fixed all imports!"
