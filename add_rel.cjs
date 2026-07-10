const fs = require('fs');
let rel = fs.readFileSync('src/RelatoriosScreen.tsx', 'utf8');

rel = rel.replace(
  '      {\n        id: "PRENSA_EDUARDO",\n        name: "Prensa Eduardo",\n        benchmark: 10.0,\n      },',
  '      {\n        id: "PRENSA_EDUARDO",\n        name: "Prensa Eduardo",\n        benchmark: 10.0,\n      },\n      {\n        id: "TORNO_CNC_WILLIAN",\n        name: "Torno CNC Willian",\n        benchmark: 10.0,\n      },\n      {\n        id: "TORNO_CNC_HENRIQUE",\n        name: "Torno CNC Henrique",\n        benchmark: 10.0,\n      },'
);

rel = rel.replace(
  '      if (sectorId === "PRENSA_EDUARDO") {\n        return (\n          l.type === "PRENSA_EDUARDO" ||\n          role === "PRENSA_EDUARDO" ||\n          l.operatorId === "prensa_eduardo"\n        );\n      }',
  '      if (sectorId === "PRENSA_EDUARDO") {\n        return (\n          l.type === "PRENSA_EDUARDO" ||\n          role === "PRENSA_EDUARDO" ||\n          l.operatorId === "prensa_eduardo"\n        );\n      }\n      if (sectorId === "TORNO_CNC_WILLIAN") {\n        return (\n          l.type === "TORNO_CNC_WILLIAN" ||\n          role === "TORNO_CNC_WILLIAN" ||\n          l.operatorId === "torno_cnc_willian"\n        );\n      }\n      if (sectorId === "TORNO_CNC_HENRIQUE") {\n        return (\n          l.type === "TORNO_CNC_HENRIQUE" ||\n          role === "TORNO_CNC_HENRIQUE" ||\n          l.operatorId === "torno_cnc_henrique"\n        );\n      }'
);

rel = rel.replace(
  '{ id: "PRENSA_EDUARDO", name: "Prensa Eduardo", benchmark: 10.0 },',
  '{ id: "PRENSA_EDUARDO", name: "Prensa Eduardo", benchmark: 10.0 },\n      { id: "TORNO_CNC_WILLIAN", name: "Torno CNC Willian", benchmark: 10.0 },\n      { id: "TORNO_CNC_HENRIQUE", name: "Torno CNC Henrique", benchmark: 10.0 },'
);

rel = rel.replace(
  '      if (sectorId === "PRENSA_EDUARDO") {\n        return (\n          l.type === "PRENSA_EDUARDO" ||\n          role === "PRENSA_EDUARDO" ||\n          l.operatorId === "prensa_eduardo"\n        );\n      }',
  '      if (sectorId === "PRENSA_EDUARDO") {\n        return (\n          l.type === "PRENSA_EDUARDO" ||\n          role === "PRENSA_EDUARDO" ||\n          l.operatorId === "prensa_eduardo"\n        );\n      }\n      if (sectorId === "TORNO_CNC_WILLIAN") {\n        return (\n          l.type === "TORNO_CNC_WILLIAN" ||\n          role === "TORNO_CNC_WILLIAN" ||\n          l.operatorId === "torno_cnc_willian"\n        );\n      }\n      if (sectorId === "TORNO_CNC_HENRIQUE") {\n        return (\n          l.type === "TORNO_CNC_HENRIQUE" ||\n          role === "TORNO_CNC_HENRIQUE" ||\n          l.operatorId === "torno_cnc_henrique"\n        );\n      }'
);

rel = rel.replace(
  '    else if (simulatorSector === "PRENSA_EDUARDO") {\n      mockLog.type = "PRENSA_EDUARDO";\n      mockLog.operatorId = "prensa_eduardo";\n      mockLog.quantityProcessed = simulatorQty;\n    }',
  '    else if (simulatorSector === "PRENSA_EDUARDO") {\n      mockLog.type = "PRENSA_EDUARDO";\n      mockLog.operatorId = "prensa_eduardo";\n      mockLog.quantityProcessed = simulatorQty;\n    }\n    else if (simulatorSector === "TORNO_CNC_WILLIAN") {\n      mockLog.type = "TORNO_CNC_WILLIAN";\n      mockLog.operatorId = "torno_cnc_willian";\n      mockLog.quantityProcessed = simulatorQty;\n    }\n    else if (simulatorSector === "TORNO_CNC_HENRIQUE") {\n      mockLog.type = "TORNO_CNC_HENRIQUE";\n      mockLog.operatorId = "torno_cnc_henrique";\n      mockLog.quantityProcessed = simulatorQty;\n    }'
);

rel = rel.replace(
  '<option value="PRENSA_EDUARDO">Prensa Eduardo</option>',
  '<option value="PRENSA_EDUARDO">Prensa Eduardo</option>\n                    <option value="TORNO_CNC_WILLIAN">Torno CNC Willian</option>\n                    <option value="TORNO_CNC_HENRIQUE">Torno CNC Henrique</option>'
);

fs.writeFileSync('src/RelatoriosScreen.tsx', rel);
