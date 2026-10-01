import fs from 'fs';
import path from 'path';

function walk(dir) {
  let res = [];
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, f.name);
    if (f.isDirectory() && f.name !== 'node_modules' && f.name !== '.git') res = res.concat(walk(full));
    else if (f.isFile() && (f.name.endsWith('.ts') || f.name.endsWith('.tsx'))) res.push(full);
  }
  return res;
}

const files = walk('src');
for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  if (/(?:from\(['"](?:products|product_variants|banners|site_config)['"]\))\s*\.\s*(?:insert|update|upsert|delete)/.test(content)) {
    console.log('Mutation found in:', file);
  }
}
