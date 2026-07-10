const fs = require('fs');

function fixPerformance(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Add itemName to the group type
  content = content.replace(
    /overallProductTotalRemaining: number;\n      }\n    >\(\);/g,
    'overallProductTotalRemaining: number;\n        itemName: string;\n      }\n    >();'
  );

  // Initialize itemName when creating the group
  content = content.replace(
    /overallProductTotalRemaining: overallTotal,\n        \}\);/g,
    'overallProductTotalRemaining: overallTotal,\n          itemName: db.items.find(i => i.id === o.itemId)?.name || "",\n        });'
  );

  // Remove the O(N^2) lookup from the filter
  const oldFilter = `const item = db.items.find((i) => i.id === g.itemId);\n      const searchStr = normalizeString(\n        \`\${item?.name || ""} \${g.color} \${g.size} \${g.variation}\`,\n      );`;
  const newFilter = `const searchStr = normalizeString(\n        \`\${g.itemName} \${g.color} \${g.size} \${g.variation}\`,\n      );`;
  
  content = content.replace(oldFilter, newFilter);

  fs.writeFileSync(filePath, content);
  console.log('Fixed performance bottleneck in', filePath);
}

fixPerformance('src/TornoCncWillianScreen.tsx');
fixPerformance('src/TornoCncHenriqueScreen.tsx');
