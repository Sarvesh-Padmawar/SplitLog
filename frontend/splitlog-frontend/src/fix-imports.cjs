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

  content = content.replace(/import\s+\{\s*useAuth\s*\}\s+from\s+["'](.*?)context\/AuthContext["'];?/g, (match, p1) => {
    return `import { useAuth } from "${p1}modules/auth/hooks/useAuth";`;
  });

  content = content.replace(/import\s+api\s+from\s+["'](.*?)services\/api["'];?/g, (match, p1) => {
    return `import api from "${p1}shared/services/axios";`;
  });

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated: ${file}`);
  }
});
