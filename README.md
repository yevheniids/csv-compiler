# Shopify CSV Compiler

Tool for compiling and importing products to Shopify from multiple data sources (Excel, Word, CSV).

## Installation

Create `.env` file:

SHOPIFY_STORE=you-shop.myshopify.com
SHOPIFY_API_KEY=altera_api_key

## Usage

1. Place source files in `input/` folder
2. Extract files `node src/extract-sku.js`
3. Generate CSV: `node src/generate-csv.js` 
4. Import to Shopify: `node src/push-csv.js`

## Manual Connection Testing

Connect your store via CLI. Enter the command in the terminal:

npx altera shop add your-shop.myshopify.com

Enter your API key in the terminal.


Check the connection:

npx altera shop test pros-cons-shop-test.myshopify.com


## Test Results

https://www.awesomescreenshot.com/image/57650709?key=f7677a38a924ce767485bce5e6be5a8a
