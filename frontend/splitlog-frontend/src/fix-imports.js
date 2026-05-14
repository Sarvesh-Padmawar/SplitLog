const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.js') || file.endsWith('.jsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk(__dirname);

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // Replace auth context
  content = content.replace(/import\s+\{\s*AuthProvider,\s*useAuth\s*\}\s+from\s+["'](.*?)context\/AuthContext["'];?/g, (match, p1) => {
    // If it's something like ../../context/AuthContext, we need to map to ../../modules/auth/hooks/useAuth and context
    // Actually, usually they just import useAuth. Let's do a simpler regex.
    return match;
  });

  content = content.replace(/import\s+\{\s*useAuth\s*\}\s+from\s+["'](.*?)context\/AuthContext["'];?/g, (match, p1) => {
    return `import { useAuth } from "${p1}modules/auth/hooks/useAuth";`;
  });

  // Replace api
  content = content.replace(/import\s+api\s+from\s+["'](.*?)services\/api["'];?/g, (match, p1) => {
    return `import api from "${p1}shared/services/axios";`;
  });

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated: ${file}`);
  }
});
