# Smart Medical Inventory Management System

## Project Overview

The **Smart Medical Inventory Management System** is a web-based application designed to simplify and improve medical inventory management. It helps manage medicine records, stock quantities, suppliers, expiry dates, and customer orders through a centralized platform.

The system uses a combination of relational and NoSQL databases to manage structured inventory information and medicine images efficiently. It provides a user-friendly interface with role-based access and database-driven operations.

## Objectives

- Maintain centralized records of medicines and inventory.
- Monitor medicine quantities and identify low-stock items.
- Track medicine expiry dates to support timely stock management.
- Manage medicine companies and related information.
- Support customer access and order management.
- Store and retrieve medicine images efficiently.
- Maintain data consistency through database constraints and transactions.
- Provide secure access through authentication and role-based authorization.

## Key Features

### Inventory Management
- Add, update, view, and manage medicine records.
- Maintain medicine stock quantities.
- Monitor low-stock medicines.
- Track expiry dates.
- Manage medicine companies.

### Customer Management
- Customer registration and authentication.
- Customer access to available medicine information.
- Customer order management.
- Password management.

### Database Management
- MySQL for structured and relational data.
- MongoDB for medicine image metadata.
- MongoDB GridFS for storing and retrieving image files.
- Database indexing for efficient data retrieval.
- Transaction management to maintain data consistency.

### Security
- Role-based authentication and authorization.
- Protected application routes and API endpoints.
- Environment variables for sensitive database configuration.
- Input validation and database integrity constraints.

## Technology Stack

| Component | Technology |
|---|---|
| Frontend | Next.js, React, TypeScript |
| Backend | Next.js API Routes / Route Handlers |
| Relational Database | MySQL |
| NoSQL Database | MongoDB |
| File Storage | MongoDB GridFS |
| Styling | CSS |
| Version Control | Git and GitHub |

## Database Architecture

The project uses two database technologies:

### 1. MySQL

MySQL is used to store structured and relational information, including:

- User details and account information.
- Medicine and inventory records.
- Company information.
- Stock-related information.
- Customer orders.
- Inventory adjustment records.

Relational database concepts such as primary keys, foreign keys, constraints, joins, and transactions are used to maintain data integrity.

### 2. MongoDB

MongoDB is used to manage medicine image metadata and related document-based information.

### 3. MongoDB GridFS

GridFS is used to store and retrieve medicine image files. Image metadata is maintained in MongoDB, while the actual file data is stored through the GridFS bucket.

## User Roles

The application supports role-based access control with the following roles:

| Role | Responsibilities |
|---|---|
| Admin | Manage inventory, medicines, companies, users, stock adjustments, and overall system operations. |
| Customer | Access available medicine information, manage account details, and place and manage orders. |

## Team Members and Responsibilities

| Team Member | SRN | Role |
|---|---|---|
| Deekshith Gowda G | PES1UG24CS142 | Frontend Development |
| Chandrakanth V G | PES1UG25CS810 |  Database Design, Backend Development and Database Integration |

### 1. Deekshith Gowda G — PES1UG24CS142

**Role: Database Design and Backend Development**

Responsibilities:

- Design and implement the relational database structure using MySQL.
- Work on database entities, relationships, primary keys, foreign keys, and constraints.
- Implement database operations and backend API functionality.
- Work on MongoDB integration and GridFS-based medicine image storage.
- Implement database operations involving inventory and stock management.
- Work on transaction handling and data consistency.
- Assist in testing database operations and backend functionality.

### 2. Chandrakanth V G — PES1UG25CS810

**Role: Frontend Development and Database Integration**

Responsibilities:

- Develop the web application interface using Next.js, React, and TypeScript.
- Design and implement application pages, dashboards, forms, and tables.
- Develop inventory, medicine, company, expiry, and low-stock interfaces.
- Integrate frontend components with backend API routes.
- Work on authentication, authorization, and role-based access.
- Implement and test database-connected application workflows.
- Contribute to database integration, project documentation, and GitHub version control.

**Note:** Both team members contribute to database and application development as part of the project.

## Project Structure

```text
Smart-Medical-Inventory-Management-System/
│
├── frontend/
│   ├── app/
│   │   ├── api/
│   │   ├── admin/
│   │   ├── customer/
│   │   └── ...
│   │
│   ├── lib/
│   ├── public/
│   ├── package.json
│   ├── package-lock.json
│   ├── next.config.ts
│   └── tsconfig.json
│
├── .gitignore
└── README.md
```

## Installation and Setup

### Prerequisites

Make sure the following are installed:

- Node.js and npm
- MySQL Server
- MongoDB Community Server
- Git
- Visual Studio Code (recommended)

### 1. Clone the Repository

```bash
git clone https://github.com/Chandrakanth2704/Smart-Medical-Inventory-Management-System.git
```

Navigate to the project directory:

```bash
cd Smart-Medical-Inventory-Management-System
```

### 2. Navigate to the Frontend

```bash
cd frontend
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Configure Environment Variables

Create a `.env.local` file inside the `frontend` directory.

Add the required MySQL and MongoDB connection configuration using the environment variable names expected by the project's database configuration files.

**Important:** Do not commit `.env.local` or expose database credentials in the GitHub repository.

### 5. Configure the Databases

- Start the MySQL server.
- Create and configure the project database.
- Execute the required SQL schema and initialization scripts.
- Start the MongoDB server.
- Configure the MongoDB database and GridFS storage as required by the application.

### 6. Run the Application

```bash
npm run dev
```

Open the application in your browser:

```text
http://localhost:3000
```

### 7. Build for Production

```bash
npm run build
```

To start the production application:

```bash
npm start
```

## Testing

The application should be tested for:

- User authentication and role-based authorization.
- Medicine and inventory management.
- Stock quantity updates and adjustments.
- Low-stock identification.
- Medicine expiry tracking.
- Customer order workflows.
- Medicine image upload and retrieval.
- MySQL and MongoDB connectivity.
- Transaction handling and database integrity.
- Input validation and error handling.

## Future Enhancements

- Automated medicine expiry notifications.
- Advanced inventory analytics and reporting.
- Improved stock demand forecasting.
- Barcode-based medicine identification.
- Enhanced search and filtering.
- Automated inventory replenishment suggestions.

## Repository

**GitHub:** https://github.com/Chandrakanth2704/Smart-Medical-Inventory-Management-System

## Academic Project

**Course:** Database Management Systems (DBMS)  
**Project Level:** Level 3 – Experiential Learning Project  
**Project Title:** Smart Medical Inventory Management System

---

**Developed by:**

1. **Deekshith Gowda G** — PES1UG24CS142
2. **Chandrakanth V G** — PES1UG25CS810

**PES University**
