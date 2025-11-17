import { PrismaClient, EmployeeRole, PayStatus } from '@prisma/client';

const prisma = new PrismaClient();

// Helper function to get random date between two dates
function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Helper function to get random element from array
function randomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

// Helper function to generate delivery code
function generateDeliveryCode(index: number, date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `DLV-${year}${month}${day}-${String(index).padStart(3, '0')}`;
}

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data (in correct order due to foreign keys)
  // Use try-catch to handle tables that might not exist
  try {
    await prisma.fine.deleteMany();
    await prisma.expense.deleteMany();
    await prisma.delivery.deleteMany();
    await prisma.payrollRecord.deleteMany();
    await prisma.payrollPeriod.deleteMany();
    await prisma.employee.deleteMany();
    await prisma.product.deleteMany();
    await prisma.truck.deleteMany();
    // Try to delete other_expenses if it exists
    try {
      await prisma.otherExpense.deleteMany();
    } catch (e) {
      // Table doesn't exist, skip
    }
  } catch (e) {
    console.log('Note: Some tables may not exist yet, continuing...');
  }

  console.log('✅ Cleared existing data');

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
        status: 'active',
        last_service: new Date('2025-09-10')
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
    }),
    prisma.truck.create({
      data: {
        license_plate: 'RAD-987-F',
        model: 'DAF XF',
        year: 2021,
        status: 'maintenance',
        last_service: new Date('2025-09-25')
      }
    })
  ]);

  console.log(`✅ Created ${trucks.length} trucks`);

  // Seed Employees (Drivers and Turnboys)
  const employees = await Promise.all([
    prisma.employee.create({
      data: {
        name: 'Jean Uwimana',
        email: 'jean.uwimana@truckflow.rw',
        phone: '+250788123456',
        license_number: 'DL-2020-001',
        hire_date: new Date('2020-01-15'),
        status: 'active',
        role: EmployeeRole.driver,
        salary: 250000,
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
        role: EmployeeRole.driver,
        salary: 280000,
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
        role: EmployeeRole.driver,
        salary: 300000,
        truck_id: trucks[2].id
      }
    }),
    prisma.employee.create({
      data: {
        name: 'Grace Uwase',
        email: 'grace.uwase@truckflow.rw',
        phone: '+250788456789',
        license_number: 'DL-2022-004',
        hire_date: new Date('2022-02-01'),
        status: 'active',
        role: EmployeeRole.driver,
        salary: 240000,
        truck_id: trucks[3].id
      }
    }),
    prisma.employee.create({
      data: {
        name: 'Paul Nkurunziza',
        email: 'paul.nkurunziza@truckflow.rw',
        phone: '+250788567890',
        license_number: 'DL-2021-005',
        hire_date: new Date('2021-08-15'),
        status: 'active',
        role: EmployeeRole.driver,
        salary: 260000,
        truck_id: trucks[4].id
      }
    }),
    // Turnboys
    prisma.employee.create({
      data: {
        name: 'Alexis Ndayisaba',
        email: 'alexis.ndayisaba@truckflow.rw',
        phone: '+250788678901',
        license_number: 'TB-2020-001',
        hire_date: new Date('2020-05-10'),
        status: 'active',
        role: EmployeeRole.turnboy,
        salary: 150000
      }
    }),
    prisma.employee.create({
      data: {
        name: 'Claudine Mukamana',
        email: 'claudine.mukamana@truckflow.rw',
        phone: '+250788789012',
        license_number: 'TB-2021-002',
        hire_date: new Date('2021-07-20'),
        status: 'active',
        role: EmployeeRole.turnboy,
        salary: 160000
      }
    }),
    prisma.employee.create({
      data: {
        name: 'Eric Niyonshuti',
        email: 'eric.niyonshuti@truckflow.rw',
        phone: '+250788890123',
        license_number: 'TB-2022-003',
        hire_date: new Date('2022-03-15'),
        status: 'active',
        role: EmployeeRole.turnboy,
        salary: 145000
      }
    })
  ]);

  const drivers = employees.filter(e => e.role === EmployeeRole.driver);
  const turnboys = employees.filter(e => e.role === EmployeeRole.turnboy);

  console.log(`✅ Created ${employees.length} employees (${drivers.length} drivers, ${turnboys.length} turnboys)`);

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
    }),
    prisma.product.create({
      data: {
        name: 'Timber',
        category: 'Building Materials',
        unit_price: 18000,
        stock_quantity: 400,
        description: 'Construction timber'
      }
    })
  ]);

  console.log(`✅ Created ${products.length} products`);

  // Create Payroll Periods for September, October, and November 2025
  const payrollPeriods = await Promise.all([
    prisma.payrollPeriod.create({
      data: {
        year: 2025,
        month: 9,
        period_name: 'September 2025',
        start_date: new Date('2025-09-01'),
        end_date: new Date('2025-09-30T23:59:59.999'),
        status: 'processed'
      }
    }),
    prisma.payrollPeriod.create({
      data: {
        year: 2025,
        month: 10,
        period_name: 'October 2025',
        start_date: new Date('2025-10-01'),
        end_date: new Date('2025-10-31T23:59:59.999'),
        status: 'processed'
      }
    }),
    prisma.payrollPeriod.create({
      data: {
        year: 2025,
        month: 11,
        period_name: 'November 2025',
        start_date: new Date('2025-11-01'),
        end_date: new Date('2025-11-30T23:59:59.999'),
        status: 'open'
      }
    })
  ]);

  console.log(`✅ Created ${payrollPeriods.length} payroll periods`);

  // Date ranges
  const septemberStart = new Date('2025-09-01');
  const septemberEnd = new Date('2025-09-30T23:59:59.999');
  const octoberStart = new Date('2025-10-01');
  const octoberEnd = new Date('2025-10-31T23:59:59.999');
  const novemberStart = new Date('2025-11-01');
  const novemberEnd = new Date('2025-11-17T23:59:59.999'); // Today

  // Seed Deliveries (at least 30 from September to now)
  const deliveries: any[] = [];
  const origins = ['Kigali, Rwanda', 'Musanze, Rwanda', 'Rubavu, Rwanda', 'Huye, Rwanda', 'Nyagatare, Rwanda'];
  const destinations = ['Kigali, Rwanda', 'Musanze, Rwanda', 'Rubavu, Rwanda', 'Huye, Rwanda', 'Nyagatare, Rwanda', 'Gisenyi, Rwanda', 'Butare, Rwanda', 'Gitarama, Rwanda'];
  const statuses = ['pending', 'delivered'];

  for (let i = 0; i < 35; i++) {
    let deliveryDate: Date;
    let period: any;
    
    // Distribute deliveries across months
    if (i < 12) {
      // September (12 deliveries)
      deliveryDate = randomDate(septemberStart, septemberEnd);
      period = payrollPeriods[0];
    } else if (i < 25) {
      // October (13 deliveries)
      deliveryDate = randomDate(octoberStart, octoberEnd);
      period = payrollPeriods[1];
    } else {
      // November (10 deliveries)
      deliveryDate = randomDate(novemberStart, novemberEnd);
      period = payrollPeriods[2];
    }

    const driver = randomElement(drivers);
    const turnboy = Math.random() > 0.3 ? randomElement(turnboys) : null; // 70% have turnboy
    const product = randomElement(products);
    const truck = driver.truck_id ? trucks.find(t => t.id === driver.truck_id) || trucks[0] : trucks[0];
    
    const cost = Math.floor(Math.random() * 50000) + 30000;
    const fuelCost = Math.floor(Math.random() * 80000) + 50000;
    const mileageCost = Math.floor(Math.random() * 20000) + 10000;
    const tax = Math.random() > 0.5 ? 18 : 0;
    const price = Math.floor(Math.random() * 300000) + 150000;
    const taxAmount = price * (tax / 100);
    const totalIncome = price - cost - fuelCost - mileageCost - taxAmount;

    const delivery = await prisma.delivery.create({
      data: {
        delivery_code: generateDeliveryCode(i + 1, deliveryDate),
        product_id: product.id,
        car_id: truck.id,
        employee_id: driver.id,
        turnboy_id: turnboy ? turnboy.id : null,
        origin: randomElement(origins),
        destination: randomElement(destinations),
        delivery_date: deliveryDate,
        status: randomElement(statuses),
        cost,
        fuel_cost: fuelCost,
        mileage_cost: mileageCost,
        tax,
        price,
        total_income: totalIncome,
        notes: i % 5 === 0 ? 'Special handling required' : null
      }
    });
    deliveries.push(delivery);
  }

  console.log(`✅ Created ${deliveries.length} deliveries`);

  // Seed Expenses (distributed across the period)
  const expenseTypes = ['Fuel', 'Maintenance', 'Repair', 'Insurance', 'Tire Replacement', 'Oil Change'];
  const expenses: any[] = [];

  for (let i = 0; i < 25; i++) {
    let expenseDate: Date;
    if (i < 8) {
      expenseDate = randomDate(septemberStart, septemberEnd);
    } else if (i < 17) {
      expenseDate = randomDate(octoberStart, octoberEnd);
    } else {
      expenseDate = randomDate(novemberStart, novemberEnd);
    }

    const truck = randomElement(trucks);
    const delivery = Math.random() > 0.4 ? randomElement(deliveries) : null;
    const amount = Math.floor(Math.random() * 400000) + 50000;

    const expense = await prisma.expense.create({
      data: {
        car_id: truck.id,
        delivery_id: delivery ? delivery.id : null,
        expense_type: randomElement(expenseTypes),
        amount,
        expense_date: expenseDate,
        description: `${randomElement(expenseTypes)} for ${truck.license_plate}`
      }
    });
    expenses.push(expense);
  }

  console.log(`✅ Created ${expenses.length} expenses`);

  // Seed Fines (distributed across the period, linked to payroll periods)
  const fineTypes = ['Speeding', 'Parking Violation', 'Traffic Light', 'Wrong Lane', 'Overloading', 'Missing Documents', 'Seat Belt', 'Mobile Phone'];
  const fines: any[] = [];

  for (let i = 0; i < 18; i++) {
    let fineDate: Date;
    let period: any;
    
    if (i < 6) {
      // September (6 fines)
      fineDate = randomDate(septemberStart, septemberEnd);
      period = payrollPeriods[0];
    } else if (i < 12) {
      // October (6 fines)
      fineDate = randomDate(octoberStart, octoberEnd);
      period = payrollPeriods[1];
    } else {
      // November (6 fines)
      fineDate = randomDate(novemberStart, novemberEnd);
      period = payrollPeriods[2];
    }

    const employee = Math.random() > 0.3 ? randomElement(drivers) : randomElement(turnboys);
    const truck = employee.truck_id ? trucks.find(t => t.id === employee.truck_id) || trucks[0] : trucks[0];
    const delivery = Math.random() > 0.5 ? randomElement(deliveries.filter(d => d.employee_id === employee.id)) : null;
    const fineCost = Math.floor(Math.random() * 50000) + 10000;

    // Create fine using raw SQL to avoid schema mismatch issues
    const fineType = randomElement(fineTypes);
    const description = `${fineType} violation`;
    const payStatus = Math.random() > 0.7 ? 'paid' : 'unpaid';
    
    // Use raw SQL to insert fine (handles missing columns gracefully)
    const result = await prisma.$queryRawUnsafe<Array<{id: number}>>(
      `INSERT INTO fines (car_id, employee_id, delivery_id, fine_type, fine_date, fine_cost, description, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       RETURNING id`,
      truck.id,
      employee.id,
      delivery ? delivery.id : null,
      fineType,
      fineDate,
      fineCost,
      description
    );
    
    const fineId = result[0].id;
    
    // Try to update pay_status and payroll_period_id if columns exist
    try {
      await prisma.$executeRawUnsafe(
        `UPDATE fines SET pay_status = $1, payroll_period_id = $2 WHERE id = $3`,
        payStatus,
        period.id,
        fineId
      );
    } catch (e) {
      // Columns don't exist, that's okay - fine was still created
    }
    
    // Create a fine object for reference
    const fine = {
      id: fineId,
      car_id: truck.id,
      employee_id: employee.id,
      delivery_id: delivery ? delivery.id : null,
      fine_type: fineType,
      fine_date: fineDate,
      fine_cost: fineCost,
      description
    };
    fines.push(fine);

    // Update employee salary (deduct fine)
    if (employee.role === EmployeeRole.driver || employee.role === EmployeeRole.turnboy) {
      await prisma.employee.update({
        where: { id: employee.id },
        data: {
          salary: {
            decrement: fineCost
          }
        }
      });
    }
  }

  console.log(`✅ Created ${fines.length} fines`);

  // Create Payroll Records for September and October (November is still open)
  for (const period of payrollPeriods.slice(0, 2)) { // Only September and October
    for (const employee of [...drivers, ...turnboys]) {
      // Filter fines for this employee in this period by checking fine_date
      const periodStart = period.start_date;
      const periodEnd = period.end_date;
      const periodFines = fines.filter(f => {
        const fineDate = new Date(f.fine_date);
        return f.employee_id === employee.id && 
               fineDate >= periodStart && 
               fineDate <= periodEnd;
      });
      const totalFines = periodFines.reduce((sum, f) => sum + f.fine_cost, 0);
      
      // Get original salary (current salary + fines for this period)
      const currentEmployee = await prisma.employee.findUnique({
        where: { id: employee.id }
      });
      
      if (currentEmployee) {
        const originalSalary = currentEmployee.salary + totalFines;
        const netSalary = originalSalary - totalFines;

        await prisma.payrollRecord.create({
          data: {
            payroll_period_id: period.id,
            employee_id: employee.id,
            original_salary: originalSalary,
            total_fines: totalFines,
            net_salary: netSalary,
            status: 'processed'
          }
        });
      }
    }
  }

  console.log(`✅ Created payroll records for processed periods`);

  console.log('✨ Seeding completed successfully!');
  console.log(`📊 Summary:`);
  console.log(`   - Trucks: ${trucks.length}`);
  console.log(`   - Employees: ${employees.length} (${drivers.length} drivers, ${turnboys.length} turnboys)`);
  console.log(`   - Products: ${products.length}`);
  console.log(`   - Deliveries: ${deliveries.length}`);
  console.log(`   - Expenses: ${expenses.length}`);
  console.log(`   - Fines: ${fines.length}`);
  console.log(`   - Payroll Periods: ${payrollPeriods.length}`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
