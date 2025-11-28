# Shopify CSV Compiler

Tool for compiling and importing products to Shopify from multiple data sources (Excel, Word, CSV).

## Installation

1) Init package dependencies `npm install`

2. Create `.env` file:

- SHOPIFY_STORE=you-shop.myshopify.com
- SHOPIFY_API_KEY=altera_api_key

## Usage

1. Place source files in `input/` folder
2. Use the `npm run init` command

## Manual Connection Testing

1. Connect your store via CLI. Enter the command in the terminal:

   npx altera shop add your-shop.myshopify.com

   Enter your API key in the terminal.
2. Check the connection:

   npx altera shop test pros-cons-shop-test.myshopify.com

## Test Results

- https://www.awesomescreenshot.com/image/57652168?key=db67d226f4132f1685829587ce0331c1
- https://www.awesomescreenshot.com/image/57650709?key=f7677a38a924ce767485bce5e6be5a8a
