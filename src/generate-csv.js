const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

const fieldMapping = {
  'Handle': 'Handle',
  'Title': 'Title',
  'description': 'Body HTML',
  'Vendor': 'Vendor',
  'Type': 'Type',
  'Tags': 'Tags',
  'Status': 'Status',
  'Published': 'Published',
  'Gift Card': 'Gift Card',
  'Product Category': 'Category',
  'Image Src': 'Image Src',
  'Image Position': 'Image Position',
  'Image Alt Text': 'Image Alt Text',
  'Option1 Name': 'Option1 Name',
  'Option1 Value': 'Option1 Value',
  'Option2 Name': 'Option2 Name',
  'Option2 Value': 'Option2 Value',
  'Option3 Name': 'Option3 Name',
  'Option3 Value': 'Option3 Value',
  'Variant SKU': 'Variant SKU',
  'SKU': 'Variant SKU',
  'Variant Barcode': 'Variant Barcode',
  'Variant Image': 'Variant Image',
  'Variant Grams': 'Variant Weight',
  'Variant Weight Unit': 'Variant Weight Unit',
  'Variant Price': 'Variant Price',
  'Variant Compare At Price': 'Variant Compare At Price',
  'Variant Taxable': 'Variant Taxable',
  'Variant Tax Code': 'Variant Tax Code',
  'Variant Inventory Tracker': 'Variant Inventory Tracker',
  'Variant Inventory Policy': 'Variant Inventory Policy',
  'Variant Fulfillment Service': 'Variant Fulfillment Service',
  'Variant Requires Shipping': 'Variant Requires Shipping',
  'Variant Inventory Qty': 'Variant Inventory Qty'
};

function isEmpty(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string' && value.trim() === '') return true;

  return false;
}

function toMetafieldName(fieldName) {
  const normalized = fieldName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return `Metafield: custom_fields.${normalized} [single_line_text_field]`;
}

function convertToCSVRow(data, metafieldColumns) {
  const row = {};

  for (const [jsonField, csvColumn] of Object.entries(fieldMapping)) {
    const value = data[jsonField];

    if (!isEmpty(value)) {
      if (csvColumn === 'Variant Weight') {
        const numValue = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.]/g, ''));
        row[csvColumn] = isNaN(numValue) ? '' : String(numValue);
      } else if (typeof value === 'boolean') {
        row[csvColumn] = value ? 'True' : 'False';
      } else if (typeof value === 'number') {
        row[csvColumn] = String(value);
      } else {
        row[csvColumn] = String(value);
      }
    } else {
      row[csvColumn] = '';
    }
  }

  if (isEmpty(row['Variant SKU']) && !isEmpty(data['sku'])) {
    row['Variant SKU'] = String(data['sku']);
  }

  if (isEmpty(row['Handle']) && !isEmpty(data['sku'])) {
    row['Handle'] = String(data['sku']).toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }

  if (isEmpty(row['Title']) && !isEmpty(data['description'])) {
    const desc = String(data['description']).replace(/<[^>]+>/g, '').trim();
    const firstSentence = desc.split(/[.!?]/)[0].trim();
    row['Title'] = firstSentence || (data['sku'] ? String(data['sku']) : '');
  } else if (isEmpty(row['Title']) && !isEmpty(data['sku'])) {
    row['Title'] = String(data['sku']);
  }

  for (const metafieldColumn of metafieldColumns) {
    const match = metafieldColumn.match(/Metafield: custom_fields\.(.+?)\s\[/);
    if (match) {
      const normalizedFieldName = match[1];

      for (const key in data) {
        const normalizedKey = key
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_+|_+$/g, '');

        if (normalizedKey === normalizedFieldName && !fieldMapping[key] && !isEmpty(data[key])) {
          const value = data[key];

          if (typeof value === 'boolean') {
            row[metafieldColumn] = value ? 'True' : 'False';
          } else if (typeof value === 'number') {
            row[metafieldColumn] = String(value);
          } else {
            row[metafieldColumn] = String(value);
          }

          break;
        }
      }
    }
  }

  return row;
}

async function main() {
  const outputDir = path.join(__dirname, '../output');

  if (!fs.existsSync(outputDir)) {
    console.error('Output directory not found. Please run step 1 first.');
    process.exit(1);
  }

  const step1Path = path.join(outputDir, 'step1-extracted-data.json');

  if (!fs.existsSync(step1Path)) {
    console.error('Step 1 output not found. Please run step 1 first.');
    process.exit(1);
  }

  const extractedData = JSON.parse(fs.readFileSync(step1Path, 'utf8'));
  const unmappedFields = new Set();

  for (const [sku, data] of Object.entries(extractedData)) {
    for (const key in data) {
      if (!fieldMapping[key] && key !== 'sku') {
        unmappedFields.add(key);
      }
    }
  }

  const metafieldColumns = Array.from(unmappedFields).map(fieldName => toMetafieldName(fieldName));
  const allColumns = [
    ...new Set([
      ...Object.values(fieldMapping),
      ...metafieldColumns
    ])
  ];

  const csvRows = [];

  for (const [sku, data] of Object.entries(extractedData)) {
    const row = convertToCSVRow(data, metafieldColumns);
    csvRows.push(row);
  }

  const csv = Papa.unparse(csvRows, {
    columns: allColumns,
    header: true,
    skipEmptyLines: false
  });

  const outputPath = path.join(outputDir, 'shopify-products.csv');

  fs.writeFileSync(outputPath, csv, 'utf8');

  console.log(`CSV file generated: ${outputPath}`);
  console.log(`Total products: ${csvRows.length}`);
  console.log(`Metafields created: ${metafieldColumns.length}`);
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});

