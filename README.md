# TruckFlow Backend API

Backend server for the TruckFlow Truck Management System built with Node.js, Express, TypeScript, and Prisma.

## Tech Stack

- **Node.js** - Runtime environment
- **Express** - Web framework
- **TypeScript** - Type-safe JavaScript
- **Prisma** - ORM for database management
- **PostgreSQL** - Database
- **Zod** - Schema validation

## Prerequisites

- Node.js 18+ 
- PostgreSQL 14+
- npm or yarn

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Setup

Copy the example environment file and configure it:

```bash
cp env.example .env
```

Update `.env` with your database credentials:

```env
DATABASE_URL="postgresql://postgres:Serge123@localhost:5432/truckflow?schema=public"
PORT=5000
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000
```

### 3. Database Setup

Generate Prisma Client:

```bash
npm run prisma:generate
```

Run database migrations:

```bash
npm run prisma:migrate
```

Seed the database with sample data:

```bash
npm run prisma:seed
```

### 4. Start Development Server

```bash
npm run dev
```

The server will start on `http://localhost:5000`

## API Endpoints

### Trucks
- `GET /api/trucks` - Get all trucks
- `GET /api/trucks/:id` - Get single truck
- `POST /api/trucks` - Create truck
- `PUT /api/trucks/:id` - Update truck
- `DELETE /api/trucks/:id` - Delete truck

### Employees
- `GET /api/employees` - Get all employees
- `GET /api/employees/:id` - Get single employee
- `POST /api/employees` - Create employee
- `PUT /api/employees/:id` - Update employee
- `DELETE /api/employees/:id` - Delete employee

### Products
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get single product
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Deliveries
- `GET /api/deliveries` - Get all deliveries
- `GET /api/deliveries/:id` - Get single delivery
- `POST /api/deliveries` - Create delivery
- `PUT /api/deliveries/:id` - Update delivery
- `DELETE /api/deliveries/:id` - Delete delivery

### Expenses
- `GET /api/expenses` - Get all expenses
- `GET /api/expenses/:id` - Get single expense
- `POST /api/expenses` - Create expense
- `PUT /api/expenses/:id` - Update expense
- `DELETE /api/expenses/:id` - Delete expense

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics
- `GET /api/dashboard/recent-deliveries` - Get recent deliveries
- `GET /api/dashboard/recent-expenses` - Get recent expenses

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run prisma:generate` - Generate Prisma Client
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:studio` - Open Prisma Studio (database GUI)
- `npm run prisma:seed` - Seed database with sample data

## Database Schema

The database includes the following models:

- **Truck** - Vehicle information and status
- **Employee** - Driver and staff information
- **Product** - Product catalog
- **Delivery** - Delivery records with financial tracking
- **Expense** - Expense tracking per truck

## Project Structure

```
server/
├── prisma/
│   ├── schema.prisma    # Database schema
│   └── seed.ts          # Database seeding script
├── src/
│   ├── lib/
│   │   └── prisma.ts    # Prisma client instance
│   ├── routes/
│   │   ├── trucks.ts
│   │   ├── employees.ts
│   │   ├── products.ts
│   │   ├── deliveries.ts
│   │   ├── expenses.ts
│   │   └── dashboard.ts
│   └── index.ts         # Main server file
├── package.json
├── tsconfig.json
└── README.md
```

## Development

The server uses `tsx` for development with hot reload. Any changes to TypeScript files will automatically restart the server.

## Production Build

```bash
npm run build
npm start
```

## License

ISC
