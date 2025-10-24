# Inventory Management System

A comprehensive, real-time inventory management system designed for retail stores, warehouses, and restaurants to manage stock efficiently.

## 🚀 Features

### Core Modules

- **Product & Stock Management**
  - Add/edit products with SKU, category, pricing
  - Real-time stock updates
  - Barcode/QR code integration
  - Low stock alerts and reorder points

- **Purchase Management**
  - Create and approve purchase orders
  - Track supplier and delivery status
  - Automatic stock updates upon receipt

- **Sales/Usage Management**
  - Deduct stock automatically after sale or usage
  - Integration ready for POS or ERP systems

- **Warehouse/Storage Management**
  - Manage multiple storage areas
  - Track transfers between locations
  - Location-specific stock tracking

- **Supplier Management**
  - Maintain supplier database
  - Auto reorder suggestions
  - Supplier rating and performance tracking

- **Alerts & Notifications**
  - Low stock alerts
  - Expiry date warnings
  - Reorder suggestions

- **Reporting & Analytics**
  - Real-time dashboards
  - Stock movement history
  - Trend analysis and insights

### User Roles & Access

- **Admin** – Full system access and reporting
- **Inventory Manager** – Manages stock and purchases
- **Sales Staff** – Records sales and stock movements
- **Auditor** – View-only access for compliance

## 🛠️ Tech Stack

### Frontend
- **React 18** - Modern UI framework
- **Material-UI (MUI)** - Component library
- **React Router** - Navigation
- **React Query** - Data fetching and caching
- **Axios** - HTTP client

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Sequelize** - ORM for database operations
- **MySQL** - Primary database
- **JWT** - Authentication
- **Socket.io** - Real-time updates

### Additional Features
- **Barcode/QR Code** generation and scanning
- **Real-time notifications** via WebSocket
- **File upload** support for product images
- **Email notifications** for alerts
- **RESTful API** design

## 📋 Prerequisites

Before running this application, make sure you have the following installed:

- **Node.js** (v16 or higher)
- **MySQL** (v8.0 or higher)
- **npm** or **yarn** package manager

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd inventory-management-system
```

### 2. Install Dependencies

```bash
# Install root dependencies
npm install

# Install all dependencies (root, server, and client)
npm run install-all
```

### 3. Database Setup

1. Create a MySQL database:
```sql
CREATE DATABASE inventory_db;
```

2. Copy the environment configuration:
```bash
cp server/config/env.example server/.env
```

3. Update the `.env` file with your database credentials:
```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=inventory_db
DB_USER=your_username
DB_PASSWORD=your_password
JWT_SECRET=your-super-secret-jwt-key-here
```

### 4. Start the Application

```bash
# Start both server and client in development mode
npm run dev
```

This will start:
- Backend server on `http://localhost:5000`
- Frontend application on `http://localhost:3000`

### 5. Access the Application

Open your browser and navigate to `http://localhost:3000`

## 📁 Project Structure

```
inventory-management-system/
├── client/                 # React frontend
│   ├── public/            # Static files
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── contexts/      # React contexts
│   │   ├── pages/         # Page components
│   │   └── App.js         # Main app component
│   └── package.json
├── server/                # Node.js backend
│   ├── config/           # Configuration files
│   ├── middleware/       # Express middleware
│   ├── models/           # Database models
│   ├── routes/           # API routes
│   ├── uploads/          # File uploads
│   ├── index.js          # Server entry point
│   └── package.json
├── package.json          # Root package.json
└── README.md
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the `server` directory with the following variables:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=inventory_db
DB_USER=root
DB_PASSWORD=your_password

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=7d

# Server Configuration
PORT=5000
NODE_ENV=development

# Email Configuration (for notifications)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# File Upload Configuration
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=5242880

# Barcode/QR Code Configuration
QR_CODE_SIZE=200
BARCODE_WIDTH=2
BARCODE_HEIGHT=100
```

## 📊 Database Schema

The system uses the following main entities:

- **Users** - System users with role-based access
- **Categories** - Product categories with hierarchical support
- **Products** - Product information with pricing and stock levels
- **Suppliers** - Supplier information and contact details
- **Warehouses** - Storage locations and capacity management
- **Stock** - Current stock levels per warehouse
- **Purchase Orders** - Purchase order management
- **Stock Movements** - Complete audit trail of stock changes

## 🔐 Authentication & Authorization

The system uses JWT-based authentication with role-based access control:

- **Admin**: Full system access
- **Inventory Manager**: Stock and purchase management
- **Sales Staff**: Sales recording and basic stock operations
- **Auditor**: Read-only access

## 📱 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile
- `PUT /api/auth/change-password` - Change password

### Products
- `GET /api/products` - Get all products (with pagination and filters)
- `GET /api/products/:id` - Get single product
- `POST /api/products` - Create new product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product (soft delete)

### Stock Management
- `GET /api/stock` - Get stock levels
- `POST /api/stock/adjust` - Adjust stock quantities
- `POST /api/stock/transfer` - Transfer stock between warehouses
- `GET /api/stock/movements` - Get stock movement history
- `GET /api/stock/alerts/low-stock` - Get low stock alerts

### Categories
- `GET /api/categories` - Get all categories
- `POST /api/categories` - Create new category
- `PUT /api/categories/:id` - Update category
- `DELETE /api/categories/:id` - Delete category

### Suppliers
- `GET /api/suppliers` - Get all suppliers
- `POST /api/suppliers` - Create new supplier
- `PUT /api/suppliers/:id` - Update supplier
- `DELETE /api/suppliers/:id` - Delete supplier

## 🎯 Business Use Cases

### Retail Store
1. **Receive stock** → System updates quantity automatically
2. **Assign stock** to storage location
3. **Sales deduct** from stock automatically
4. **Low stock alerts** trigger reorder suggestions
5. **Manager generates** purchase order
6. **Cycle repeats**

### Restaurant
- Track ingredients as raw materials
- Deduct ingredient quantities per dish sold
- Track expiry dates and wastage
- Integrate with menu costing
- Manage multiple kitchen locations

### Warehouse
- Multi-location inventory tracking
- Transfer management between warehouses
- Capacity planning and optimization
- Supplier performance monitoring
- Automated reorder point management

## 🔮 Future Enhancements

- **AI-driven stock predictions** using machine learning
- **IoT smart shelves** for automatic counting
- **AR-based stock visualization** for warehouse operations
- **Blockchain tracking** for supply chain transparency
- **Sustainability reports** for environmental impact
- **Mobile app** for field operations
- **Advanced analytics** with Power BI integration
- **Multi-language support** for international operations

## 🧪 Testing

```bash
# Run server tests
cd server
npm test

# Run client tests
cd client
npm test
```

## 📦 Production Deployment

### Using PM2 (Recommended)

```bash
# Install PM2 globally
npm install -g pm2

# Build the client
cd client
npm run build

# Start the server with PM2
cd ../server
pm2 start index.js --name "inventory-api"

# Save PM2 configuration
pm2 save
pm2 startup
```

### Using Docker

```bash
# Build and run with Docker Compose
docker-compose up -d
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the API endpoints

## 🙏 Acknowledgments

- Material-UI for the component library
- React team for the amazing framework
- Express.js for the backend framework
- MySQL for reliable data storage

---

**Built with ❤️ for modern businesses**
