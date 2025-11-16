import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data
  await prisma.expense.deleteMany();
  await prisma.delivery.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.product.deleteMany();
  await prisma.truck.deleteMany();

  // Seed Trucks
  const trucks = await Promise.all([
    prisma.truck.create({
      data: {
        license_plate: 'RAD-123-A',
        model: 'Volvo FH16',
        year: 2022,
        status: 'active',
        last_service: new Date('2025-10-15')
      }
    }),
    prisma.truck.create({
      data: {
        license_plate: 'RAD-456-B',
        model: 'Mercedes Actros',
        year: 2021,
        status: 'active',
        last_service: new Date('2025-10-20')
      }
    }),
    prisma.truck.create({
      data: {
        license_plate: 'RAD-789-C',
        model: 'Scania R500',
        year: 2023,
        status: 'maintenance'
      }
    }),
    prisma.truck.create({
      data: {
        license_plate: 'RAD-321-D',
        model: 'MAN TGX',
        year: 2020,
        status: 'active',
        last_service: new Date('2025-10-10')
      }
    }),
    prisma.truck.create({
      data: {
        license_plate: 'RAD-654-E',
        model: 'Iveco Stralis',
        year: 2022,
        status: 'active',
        last_service: new Date('2025-10-18')
      }
    })
  ]);

  console.log(`✅ Created ${trucks.length} trucks`);

  // Seed Employees
  const employees = await Promise.all([
    prisma.employee.create({
      data: {
        name: 'Jean Uwimana',
        email: 'jean.uwimana@truckflow.rw',
        phone: '+250788123456',
        license_number: 'DL-2020-001',
        hire_date: new Date('2020-01-15'),
        status: 'active',
        truck_id: trucks[0].id
      }
    }),
    prisma.employee.create({
      data: {
        name: 'Marie Mukamana',
        email: 'marie.mukamana@truckflow.rw',
        phone: '+250788234567',
        license_number: 'DL-2021-002',
        hire_date: new Date('2021-03-20'),
        status: 'active',
        truck_id: trucks[1].id
      }
    }),
    prisma.employee.create({
      data: {
        name: 'Patrick Habimana',
        email: 'patrick.habimana@truckflow.rw',
        phone: '+250788345678',
        license_number: 'DL-2019-003',
        hire_date: new Date('2019-06-10'),
        status: 'active',
        truck_id: trucks[4].id
      }
    }),
    prisma.employee.create({
      data: {
        name: 'Grace Uwase',
        email: 'grace.uwase@truckflow.rw',
        phone: '+250788456789',
        license_number: 'DL-2022-004',
        hire_date: new Date('2022-02-01'),
        status: 'active'
      }
    })
  ]);

  console.log(`✅ Created ${employees.length} employees`);

  // Seed Products
  const products = await Promise.all([
    prisma.product.create({
      data: {
        name: 'Cement',
        category: 'Building Materials',
        unit_price: 15000,
        stock_quantity: 500,
        description: 'High-quality Portland cement'
      }
    }),
    prisma.product.create({
      data: {
        name: 'Steel Bars',
        category: 'Building Materials',
        unit_price: 25000,
        stock_quantity: 300,
        description: 'Reinforcement steel bars'
      }
    }),
    prisma.product.create({
      data: {
        name: 'Bricks',
        category: 'Building Materials',
        unit_price: 500,
        stock_quantity: 10000,
        description: 'Standard red bricks'
      }
    }),
    prisma.product.create({
      data: {
        name: 'Sand',
        category: 'Raw Materials',
        unit_price: 8000,
        stock_quantity: 200,
        description: 'Construction sand per cubic meter'
      }
    }),
    prisma.product.create({
      data: {
        name: 'Gravel',
        category: 'Raw Materials',
        unit_price: 12000,
        stock_quantity: 150,
        description: 'Construction gravel per cubic meter'
      }
    })
  ]);

  console.log(`✅ Created ${products.length} products`);

  // Seed Deliveries
  const deliveries = await Promise.all([
    prisma.delivery.create({
      data: {
        delivery_code: 'DLV-2025-001',
        product_id: products[0].id,
        car_id: trucks[0].id,
        employee_id: employees[0].id,
        origin: 'Kigali, Rwanda',
        destination: 'Musanze, Rwanda',
        delivery_date: new Date('2025-10-28'),
        status: 'in-transit',
        cost: 50000,
        fuel_cost: 80000,
        price: 250000,
        total_income: 120000,
        notes: 'Fragile items - handle with care'
      }
    }),
    prisma.delivery.create({
      data: {
        delivery_code: 'DLV-2025-002',
        product_id: products[1].id,
        car_id: trucks[1].id,
        employee_id: employees[1].id,
        origin: 'Kigali, Rwanda',
        destination: 'Rubavu, Rwanda',
        delivery_date: new Date('2025-10-27'),
        status: 'delivered',
        cost: 75000,
        fuel_cost: 120000,
        price: 400000,
        total_income: 205000
      }
    }),
    prisma.delivery.create({
      data: {
        delivery_code: 'DLV-2025-003',
        product_id: products[2].id,
        car_id: trucks[4].id,
        employee_id: employees[2].id,
        origin: 'Kigali, Rwanda',
        destination: 'Huye, Rwanda',
        delivery_date: new Date('2025-10-29'),
        status: 'pending',
        cost: 40000,
        fuel_cost: 60000,
        price: 180000,
        total_income: 80000,
        notes: 'Temperature controlled delivery required'
      }
    })
  ]);

  console.log(`✅ Created ${deliveries.length} deliveries`);

  // Seed Expenses
  const expenses = await Promise.all([
    prisma.expense.create({
      data: {
        car_id: trucks[0].id,
        expense_type: 'Fuel',
        amount: 150000,
        expense_date: new Date('2025-10-25'),
        description: 'Diesel refill'
      }
    }),
    prisma.expense.create({
      data: {
        car_id: trucks[1].id,
        expense_type: 'Maintenance',
        amount: 250000,
        expense_date: new Date('2025-10-20'),
        description: 'Oil change and tire rotation'
      }
    }),
    prisma.expense.create({
      data: {
        car_id: trucks[2].id,
        expense_type: 'Repair',
        amount: 500000,
        expense_date: new Date('2025-10-22'),
        description: 'Engine repair'
      }
    }),
    prisma.expense.create({
      data: {
        car_id: trucks[3].id,
        expense_type: 'Insurance',
        amount: 300000,
        expense_date: new Date('2025-10-15'),
        description: 'Annual insurance premium'
      }
    })
  ]);

  console.log(`✅ Created ${expenses.length} expenses`);

  console.log('✨ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
