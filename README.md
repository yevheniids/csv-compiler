# Shopify CSV Compiler

Tool for compiling and importing products to Shopify from multiple data sources (Excel, Word, CSV).

## Installation

1) Init package dependencies `npm install`

2. Create `.env` file:

- SHOPIFY_STORE=you-shop.myshopify.com
- SHOPIFY_API_KEY=altera_api_key

## Usage

1. Create the Altera app key and connect it to the App
2. Connect Google Drive. Create your environment using this documentation https://developers.google.com/workspace/drive/api/quickstart/nodejs The credentials.json file has to be in the main project folder. At first start the app asks to connect your Google account. After a successful authorization, it will save your account data in the token.json file.
3. Use the `npm run start` command. If the .env file doesn't exist, the generated file won't be downloaded to the Altera app and you will see the button for downloading https://tinyurl.com/29gal4u9

## Manual Connection Testing

1. Connect your store via CLI. Enter the command in the terminal:

   npx altera shop add your-shop.myshopify.com

   Enter your API key in the terminal.
2. Check the connection:

   npx altera shop test pros-cons-shop-test.myshopify.com

## Test Results

- https://www.awesomescreenshot.com/image/57652168?key=db67d226f4132f1685829587ce0331c1
- https://www.awesomescreenshot.com/image/57650709?key=f7677a38a924ce767485bce5e6be5a8a

## App Documentation

- https://support.getaltera.com/en/articles/12538831-how-to-upload-and-download-files-from-shopify-using-the-altera-cli#h_def599fc15

## CLI Commands

**npx altera import create path/to/file.csv** - import a file

Supported entities: articles, blogs, catalogs, customers, events, files, manual_collections, metaobjects, orders, pages, products, shop, menus, redirects, smart_collections, metafield_definitions, metaobject_definitions, discounts, companies, payouts, draft_orders

**npx altera files upload path/to/directory/file** - this uploads all files from the specified local directory to your Shopify store's content files. The CLI will show upload progress and generate a CSV report with details about each uploaded file.

**npx altera files download** - this downloads all files from your Shopify store to your local machine. It creates a local directory with all the files and generates an Excel spreadsheet with file details including names, sizes, URLs, and types.

Available filter options:
  --media-type - Filter by media type (e.g., image, video)
  --filename - Filter by text in the filename
