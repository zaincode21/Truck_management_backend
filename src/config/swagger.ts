import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Truck Management System API',
      version: '1.0.0',
      description: `
        A comprehensive REST API for managing truck fleet operations including:
        - Fleet management (trucks and drivers)
        - User management (admin and views roles)
        - Delivery tracking and management
        - Product and inventory management
        - Expense tracking and reporting
        - Dashboard analytics and reporting
        
        Built with Express.js, Prisma, and PostgreSQL.
      `,
      contact: {
        name: 'API Support',
        email: 'support@truckmanagement.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production' 
          ? 'https://api.truckmanagement.com' 
          : 'http://localhost:5000',
        description: process.env.NODE_ENV === 'production' 
          ? 'Production server' 
          : 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your Bearer token (get it from /api/auth/login)'
        }
      },
      schemas: {
        Truck: {
          type: 'object',
          required: ['license_plate', 'model', 'year'],
          properties: {
            id: {
              type: 'integer',
              description: 'Unique identifier for the truck',
              example: 1
            },
            license_plate: {
              type: 'string',
              description: 'Truck license plate number',
              example: 'ABC-1234'
            },
            model: {
              type: 'string',
              description: 'Truck model',
              example: 'Volvo FH16'
            },
            year: {
              type: 'integer',
              description: 'Manufacturing year',
              example: 2023,
              minimum: 1990,
              maximum: 2030
            },
            status: {
              type: 'string',
              enum: ['active', 'maintenance', 'idle', 'out-of-service', 'inactive'],
              description: 'Current status of the truck',
              example: 'active'
            },
            last_service: {
              type: 'string',
              format: 'date',
              description: 'Date of last service',
              example: '2023-10-15',
              nullable: true
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Record creation timestamp',
              example: '2023-10-30T10:30:00Z'
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              description: 'Record last update timestamp',
              example: '2023-10-30T10:30:00Z'
            }
          }
        },
        Employee: {
          type: 'object',
          required: ['name', 'phone', 'email', 'hire_date', 'license_number'],
          properties: {
            id: {
              type: 'integer',
              description: 'Unique identifier for the employee',
              example: 1
            },
            name: {
              type: 'string',
              description: 'Employee full name',
              example: 'John Smith'
            },
            phone: {
              type: 'string',
              description: 'Employee phone number',
              example: '+250788123456'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Employee email address',
              example: 'john.smith@company.com'
            },
            hire_date: {
              type: 'string',
              format: 'date',
              description: 'Date when employee was hired',
              example: '2023-01-15'
            },
            status: {
              type: 'string',
              enum: ['active', 'inactive', 'suspended'],
              description: 'Current employment status',
              example: 'active'
            },
            license_number: {
              type: 'string',
              description: 'Driver license number',
              example: 'DL123456789'
            },
            truck_id: {
              type: 'integer',
              description: 'ID of assigned truck',
              example: 1,
              nullable: true
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Record creation timestamp'
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              description: 'Record last update timestamp'
            }
          }
        },
        User: {
          type: 'object',
          required: ['name', 'email', 'password', 'role'],
          properties: {
            id: {
              type: 'integer',
              description: 'Unique identifier for the user',
              example: 1
            },
            name: {
              type: 'string',
              description: 'User full name',
              example: 'Admin User'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
              example: 'admin@truckflow.com'
            },
            role: {
              type: 'string',
              enum: ['admin', 'views'],
              description: 'User role (admin or views)',
              example: 'admin'
            },
            status: {
              type: 'string',
              enum: ['active', 'inactive'],
              description: 'Current user status',
              example: 'active'
            },
            created_by: {
              type: 'integer',
              description: 'ID of user who created this user',
              example: 1,
              nullable: true
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Record creation timestamp',
              example: '2023-10-30T10:30:00Z'
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              description: 'Record last update timestamp',
              example: '2023-10-30T10:30:00Z'
            },
            creator: {
              type: 'object',
              description: 'User who created this user',
              properties: {
                id: { type: 'integer', example: 1 },
                name: { type: 'string', example: 'Admin User' },
                email: { type: 'string', example: 'admin@truckflow.com' }
              },
              nullable: true
            }
          }
        },
        Product: {
          type: 'object',
          required: ['name', 'category', 'unit_price', 'stock_quantity'],
          properties: {
            id: {
              type: 'integer',
              description: 'Unique identifier for the product',
              example: 1
            },
            name: {
              type: 'string',
              description: 'Product name',
              example: 'Electronics Package'
            },
            category: {
              type: 'string',
              description: 'Product category',
              example: 'Electronics'
            },
            unit_price: {
              type: 'number',
              description: 'Price per unit in RWF',
              example: 25000,
              minimum: 0
            },
            stock_quantity: {
              type: 'integer',
              description: 'Available stock quantity',
              example: 100,
              minimum: 0
            },
            description: {
              type: 'string',
              description: 'Product description',
              example: 'High-quality electronics package for delivery',
              nullable: true
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Record creation timestamp'
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              description: 'Record last update timestamp'
            }
          }
        },
        Delivery: {
          type: 'object',
          required: ['delivery_code', 'product_id', 'car_id', 'employee_id', 'origin', 'destination', 'delivery_date', 'cost', 'fuel_cost', 'price'],
          properties: {
            id: {
              type: 'integer',
              description: 'Unique identifier for the delivery',
              example: 1
            },
            delivery_code: {
              type: 'string',
              description: 'Unique delivery code',
              example: 'DEL-2023-001'
            },
            product_id: {
              type: 'integer',
              description: 'ID of the product being delivered',
              example: 1
            },
            car_id: {
              type: 'integer',
              description: 'ID of the truck used for delivery',
              example: 1
            },
            employee_id: {
              type: 'integer',
              description: 'ID of the driver assigned',
              example: 1
            },
            origin: {
              type: 'string',
              description: 'Delivery starting point',
              example: 'Kigali Warehouse'
            },
            destination: {
              type: 'string',
              description: 'Delivery destination',
              example: 'Butare Distribution Center'
            },
            delivery_date: {
              type: 'string',
              format: 'date',
              description: 'Scheduled or completed delivery date',
              example: '2023-10-30'
            },
            status: {
              type: 'string',
              enum: ['pending', 'in-transit', 'delivered', 'cancelled'],
              description: 'Current delivery status',
              example: 'in-transit'
            },
            cost: {
              type: 'number',
              description: 'Delivery operational cost in RWF',
              example: 15000,
              minimum: 0
            },
            fuel_cost: {
              type: 'number',
              description: 'Fuel cost for delivery in RWF',
              example: 8000,
              minimum: 0
            },
            price: {
              type: 'number',
              description: 'Delivery service price in RWF',
              example: 30000,
              minimum: 0
            },
            total_income: {
              type: 'number',
              description: 'Total income from delivery in RWF',
              example: 30000,
              minimum: 0
            },
            notes: {
              type: 'string',
              description: 'Additional notes about the delivery',
              example: 'Handle with care - fragile items',
              nullable: true
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Record creation timestamp'
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              description: 'Record last update timestamp'
            },
            product: {
              $ref: '#/components/schemas/Product'
            },
            truck: {
              $ref: '#/components/schemas/Truck'
            },
            employee: {
              $ref: '#/components/schemas/Employee'
            }
          }
        },
        Expense: {
          type: 'object',
          required: ['car_id', 'expense_type', 'amount', 'expense_date'],
          properties: {
            id: {
              type: 'integer',
              description: 'Unique identifier for the expense',
              example: 1
            },
            car_id: {
              type: 'integer',
              description: 'ID of the truck related to expense',
              example: 1
            },
            expense_type: {
              type: 'string',
              enum: ['fuel', 'maintenance', 'repair', 'insurance', 'other'],
              description: 'Type of expense',
              example: 'fuel'
            },
            amount: {
              type: 'number',
              description: 'Expense amount in RWF',
              example: 50000,
              minimum: 0
            },
            expense_date: {
              type: 'string',
              format: 'date',
              description: 'Date when expense occurred',
              example: '2023-10-30'
            },
            description: {
              type: 'string',
              description: 'Expense description',
              example: 'Fuel refill at station ABC',
              nullable: true
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Record creation timestamp'
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              description: 'Record last update timestamp'
            },
            truck: {
              $ref: '#/components/schemas/Truck'
            }
          }
        },
        DashboardStats: {
          type: 'object',
          properties: {
            trucks: {
              type: 'object',
              properties: {
                total: { type: 'integer', example: 25 },
                active: { type: 'integer', example: 20 },
                inactive: { type: 'integer', example: 5 }
              }
            },
            employees: {
              type: 'object',
              properties: {
                total: { type: 'integer', example: 30 },
                active: { type: 'integer', example: 28 },
                inactive: { type: 'integer', example: 2 }
              }
            },
            deliveries: {
              type: 'object',
              properties: {
                total: { type: 'integer', example: 150 },
                pending: { type: 'integer', example: 10 },
                inTransit: { type: 'integer', example: 8 },
                delivered: { type: 'integer', example: 132 }
              }
            },
            products: {
              type: 'object',
              properties: {
                total: { type: 'integer', example: 45 }
              }
            },
            financials: {
              type: 'object',
              properties: {
                totalExpenses: { type: 'number', example: 2500000 },
                totalRevenue: { type: 'number', example: 5000000 },
                netIncome: { type: 'number', example: 2500000 }
              }
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message',
              example: 'Resource not found'
            },
            message: {
              type: 'string',
              description: 'Detailed error message',
              example: 'The requested truck with ID 999 was not found'
            }
          }
        },
        HealthCheck: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              example: 'ok',
              description: 'API health status'
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              example: '2023-10-30T10:30:00Z',
              description: 'Health check timestamp'
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Health',
        description: 'API health check endpoints'
      },
      {
        name: 'Dashboard',
        description: 'Dashboard analytics and statistics'
      },
      {
        name: 'Trucks',
        description: 'Truck fleet management operations'
      },
      {
        name: 'Employees',
        description: 'Employee and driver management'
      },
      {
        name: 'Users',
        description: 'System user management (admin and views roles)'
      },
      {
        name: 'Products',
        description: 'Product and inventory management'
      },
      {
        name: 'Deliveries',
        description: 'Delivery tracking and management'
      },
      {
        name: 'Expenses',
        description: 'Expense tracking and reporting'
      },
      {
        name: 'Fines',
        description: 'Fine tracking and management'
      },
      {
        name: 'Payroll',
        description: 'Payroll processing and management'
      },
      {
        name: 'Authentication',
        description: 'User authentication and authorization'
      }
    ],
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: ['./src/routes/*.ts', './src/index.ts'], // Path to the API files
};

export const specs = swaggerJsdoc(options);
export { swaggerUi };


