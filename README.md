# Invoice Generator: Backend

Node.js + Express + MongoDB (Mongoose) REST API for clients, services, invoices and payment tracking.

## Requirements
- Node.js 18+
- MongoDB running locally, or a MongoDB Atlas connection string

## Setup
```bash
cd backend
npm install
cp .env.example .env     # edit MONGO_URI if needed
npm run dev              # or: npm start
```
API runs at `http://localhost:5000/api`.

## Environment variables
| Name | Default | Purpose |
|------|---------|---------|
| PORT | 5000 | Server port |
| MONGO_URI | mongodb://127.0.0.1:27017/invoice_generator | MongoDB connection |
| CLIENT_ORIGIN | http://localhost:5173 | Allowed frontend origin (CORS) |

## Collections
- **clients**: name, email, phone, address
- **services**: name, description, rate
- **invoices**: number (auto `INV-0001`), client, items[], taxRate (%), discount (flat), issueDate, dueDate, notes, payments[]
- **counters**: sequential invoice numbering

Computed on every invoice (not stored): `subtotal`, `tax`, `total`, `paid`, `balance`, `status` (`unpaid`, `partial`, `paid`, `overdue`).

## Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET/POST | /api/clients | List / create |
| PUT/DELETE | /api/clients/:id | Update / delete (blocked if client has invoices) |
| GET/POST | /api/services | List / create |
| PUT/DELETE | /api/services/:id | Update / delete |
| GET | /api/invoices?status=&client= | List invoices |
| GET | /api/invoices/:id | One invoice |
| POST | /api/invoices | Create (number is auto-assigned) |
| PUT | /api/invoices/:id | Update items, dates, tax, discount, notes |
| DELETE | /api/invoices/:id | Delete |
| POST | /api/invoices/:id/payments | Record payment `{amount, date, method, note}` |
| DELETE | /api/invoices/:id/payments/:pid | Remove a payment |
| GET | /api/dashboard | Totals: invoiced, collected, outstanding, overdue |

Payments above the remaining balance are rejected.

## Structure
```
backend/
├── package.json
├── .env.example
└── src/
    ├── server.js   # app, CORS, DB connection, error handler
    ├── routes.js   # all endpoints
    └── models.js   # Mongoose schemas + computed invoice fields
```
