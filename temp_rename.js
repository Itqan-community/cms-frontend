const fs = require('fs');
const path = require('path');

const adminDir = path.join(__dirname, 'src/app/features/admin');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      results.push(file);
    }
  });
  return results;
}

const files = walk(adminDir);

// First replace contents in all files
files.forEach((file) => {
  if (file.endsWith('.ts') || file.endsWith('.html') || file.endsWith('.less')) {
    let content = fs.readFileSync(file, 'utf8');
    let updated = content
      .replace(/quranic-cms/g, 'admin')
      .replace(/QuranicCms/g, 'Admin')
      .replace(/qcms/g, 'admin') // for css classes
      .replace(/Qcms/g, 'Admin');

    // Also rename components
    updated = updated
      .replace(/AdminPage/g, 'AdminLayoutComponent')
      .replace(/admin\.page/g, 'admin-layout.component');

    if (content !== updated) {
      fs.writeFileSync(file, updated);
      console.log(`Updated content: ${file}`);
    }
  }
});

// Rename specific files inside src/app/features/admin
const renameMap = [
  { from: 'quranic-cms.page.html', to: 'admin-layout.component.html' },
  { from: 'quranic-cms.page.less', to: 'admin-layout.component.less' },
  { from: 'quranic-cms.page.ts', to: 'admin-layout.component.ts' },
  { from: 'quranic-cms.routes.ts', to: 'admin.routes.ts' },
];

renameMap.forEach((item) => {
  const fromPath = path.join(adminDir, item.from);
  const toPath = path.join(adminDir, item.to);
  if (fs.existsSync(fromPath)) {
    fs.renameSync(fromPath, toPath);
    console.log(`Renamed: ${item.from} -> ${item.to}`);
  }
});
