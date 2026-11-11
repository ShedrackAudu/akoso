## 38. Store (uniform and bookshop)

- Items with variants (e.g. uniform sizes), selling price in kobo and optional cost price, linked to class levels (e.g. JSS1 book list).
- Stock in (purchases, with supplier), stock out (sales and issues), and adjustments with a reason (damage, loss, count correction). All stock movements are append-only.
- Sale to a student charged to the student's billing account (added as a fee line, so it reconciles through section 14), or paid immediately in cash, POS or transfer.
- Issue log for items given to a student (e.g. textbooks included in fees), with date and staff name.
- Bundles (e.g. "JSS1 starter pack") and bulk issue to a class.
- Low-stock alerts, a stock valuation report, sales by item and period, and a daily store cash-up.
- Tables: `store_items`, `store_variants`, `stock_movements`, `store_sales`, `store_sale_lines`, `store_issues`.
- Effort: 1.0. Depends on fees and invoicing (section 13).

Acceptance: stock never goes negative; every sale charged to a family appears on the family statement; the stock count equals the sum of movements.

