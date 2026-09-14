# TejQuote Pro

Offline quotation, invoice, job-costing and profit calculator for small service businesses.

## Version

1.0 MVP — TejMade Digital

## What it solves

Service businesses can calculate private job cost, markup, gross profit and margin before sending a customer-facing quote or invoice. Private pricing data never appears on the printable customer document.

## Included features

- Quotes and invoices with local auto-numbering
- Client directory and reusable service catalog
- Quantity, unit, internal cost, markup and customer price
- Live subtotal, discount, tax, deposit, balance, profit and margin
- Target-margin warning
- Saved document search, status, duplication and quote-to-invoice conversion
- Branded A4 and US Letter print / Save as PDF output
- Local business logo
- JSON backup, restore, demo reload and clean reset
- Responsive desktop and mobile layout
- Offline PWA caching after the first successful load
- No account, backend, paid API, analytics or tracking

## Use

Open `index.html` through a local/static web server. For the installable offline experience and service worker, HTTPS or localhost is required. All working data is stored in the current browser's localStorage.

## Data warning

Users should export a JSON backup regularly. Clearing browser storage removes locally stored app data.

## Packaging notes

The `products/tejquote-pro` folder is self-contained. A marketplace package should include this folder, screenshots, a user guide, license text and the seller listing copy after QA.

## License

Copyright © 2026 TejMade Digital. Marketplace license terms will be included in the final release package.