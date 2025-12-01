const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');
const XLSX = require('xlsx');

function normalizeSKU(sku) {
  if (!sku) return null;
  return String(sku).trim().toUpperCase();
}

function isValidSKU(sku) {
  if (!sku) return false;
  const normalized = normalizeSKU(sku);

  const invalidValues = [
    'SKU',
    'VARIANT SKU',
    'NAME',
    'TITLE',
    'HANDLE',
    'DESCRIPTION',
    'BODY HTML',
    'BODY (HTML)',
    'NAVIGATION',
    'PORTIONS',
    'TEA WEIGHT',
    'PACKAGING',
    'GIFT TYPE'
  ];

  if (invalidValues.includes(normalized)) {
    return false;
  }

  return normalized.length > 0 && normalized !== '';
}

function removeEmptyKeys(obj) {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key && key.trim() !== '') {
      result[key] = value;
    }
  }
  return result;
}

async function parseDocx(filePath) {
  try {
    const result = await mammoth.convertToHtml({ path: filePath });
    const html = result.value;
    const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/i;
    const tableMatch = html.match(tableRegex);

    if (tableMatch) {
      const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
      const rows = [];
      let rowMatch;

      while ((rowMatch = rowRegex.exec(tableMatch[1])) !== null) {
        const cellRegex = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
        const cells = [];
        let cellMatch;

        while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
          let cellText = cellMatch[1] || '';

          if (cells.length === 0) {
            cellText = cellText
              .replace(/<[^>]+>/g, '')
              .replace(/&nbsp;/g, ' ')
              .trim();
          }

          cells.push(cellText);
        }

        if (cells.length >= 2) {
          rows.push(cells);
        }
      }

      const data = {};

      for (const row of rows) {
        const key = normalizeSKU(row[0]);
        const value = row[1] || '';

        if (key && isValidSKU(key)) {
          data[key] = value;
        }
      }

      return data;
    } else {
      const textResult = await mammoth.extractRawText({ path: filePath });
      const text = textResult.value;
      const lines = text.split('\n').filter(line => line.trim());
      const data = {};

      for (const line of lines) {
        const columns = line.split(/\t+/).filter(col => col.trim());

        if (columns.length >= 2) {
          const key = normalizeSKU(columns[0]);
          const value = columns[1] || '';

          if (key && isValidSKU(key)) {
            data[key] = value;
          }
        }
      }

      return data;
    }
  } catch (error) {
    console.error('Error parsing DOCX:', error.message);
    console.error('File path:', filePath);
    return {};
  }
}

function parseXlsx(filePath) {
  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    let jsonData = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    const skuPatterns = ['SKU', 'Variant SKU', 'sku', 'variant_sku', 'Sku'];
    let skuColumn = null;

    if (jsonData.length > 0) {
      const firstRow = jsonData[0];
      let columns = Object.keys(firstRow);

      for (const pattern of skuPatterns) {
        skuColumn = columns.find(col =>
          col.toLowerCase() === pattern.toLowerCase() ||
          col.toLowerCase().includes(pattern.toLowerCase())
        );

        if (skuColumn) {
          break;
        }
      }
    }

    if (!skuColumn) {
      const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
      const headerRow = [];

      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 1, c: col });
        const cell = sheet[cellAddress];
        const headerValue = cell ? (cell.w || cell.v || '') : '';

        headerRow.push(headerValue);
      }

      for (const pattern of skuPatterns) {
        const index = headerRow.findIndex(header =>
          String(header).toLowerCase() === pattern.toLowerCase() ||
          String(header).toLowerCase().includes(pattern.toLowerCase())
        );

        if (index !== -1) {
          skuColumn = headerRow[index];

          jsonData = XLSX.utils.sheet_to_json(sheet, {
            defval: '',
            range: 3,
            header: headerRow
          });

          break;
        }
      }
    }

    if (!skuColumn) {
      console.log('SKU column not found');
      return {};
    }

    if (jsonData.length === 0) {
      console.log('No data rows found');
      return {};
    }

    const data = {};

    for (const row of jsonData) {
      const sku = normalizeSKU(row[skuColumn]);

      if (sku && isValidSKU(sku)) {
        const cleanedRow = removeEmptyKeys(row);

        data[sku] = {
          sku: sku,
          ...cleanedRow
        };
      }
    }

    return data;
  } catch (error) {
    console.error('Error parsing XLSX:', error.message);
    console.error('File path:', filePath);
    return {};
  }
}

async function main() {
  const inputDir = path.join(__dirname, '../input');
  const outputDir = path.join(__dirname, '../output');

  if (!fs.existsSync(inputDir)) {
    process.exit(1);
  }

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const allData = {};
  const docxPath = path.join(inputDir, 'descriptions.docx');

  if (fs.existsSync(docxPath)) {
    const docxData = await parseDocx(docxPath);

    for (const [sku, description] of Object.entries(docxData)) {
      allData[sku] = {
        sku: sku,
        description: description
      };
    }
  }

  const tagsPath = path.join(inputDir, 'tags.xlsx');

  if (fs.existsSync(tagsPath)) {
    const tagsData = parseXlsx(tagsPath);

    for (const [sku, data] of Object.entries(tagsData)) {
      const bodyHtml = data['Body (HTML)'] || data['Body (HTML)'] || '';
      const { sku: _, 'Body (HTML)': __, ...restData } = data;
      const cleanedRestData = removeEmptyKeys(restData);

      if (allData[sku]) {
        if (bodyHtml) {
          allData[sku].description = bodyHtml;
        } else if (!allData[sku].description) {
          allData[sku].description = '';
        }

        Object.assign(allData[sku], cleanedRestData);
      } else {
        allData[sku] = {
          ...cleanedRestData,
          description: bodyHtml || ''
        };
      }
    }
  }

  const templatePath = path.join(inputDir, 'template.xlsx');

  if (fs.existsSync(templatePath)) {
    const templateData = parseXlsx(templatePath);

    for (const [sku, data] of Object.entries(templateData)) {
      const bodyHtml = data['Body (HTML)'] || data['Body (HTML)'] || '';
      const { sku: _, 'Body (HTML)': __, ...restData } = data;
      const cleanedRestData = removeEmptyKeys(restData);

      if (allData[sku]) {
        if (bodyHtml) {
          allData[sku].description = bodyHtml;
        } else if (!allData[sku].description) {
          allData[sku].description = '';
        }

        Object.assign(allData[sku], cleanedRestData);
      } else {
        allData[sku] = {
          ...cleanedRestData,
          description: bodyHtml || ''
        };
      }
    }
  }

  for (const [sku, data] of Object.entries(allData)) {
    const nameValue = data['Name'] || data['name'];
    const titleValue = data['Title'] || data['title'];

    if (nameValue) {
      if (titleValue !== undefined) {
        data['Title'] = nameValue;
      } else {
        data['Title'] = nameValue;
      }

      delete data['Name'];
      delete data['name'];
    }
  }

  const outputPath = path.join(outputDir, 'extracted-data.json');

  fs.writeFileSync(outputPath, JSON.stringify(allData, null, 2), 'utf8');
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
