const Joi = require('joi');

// Test the userCreateSchema validation
const userCreateSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  firstName: Joi.string().min(2).max(50).required(),
  lastName: Joi.string().min(2).max(50).required(),
  role: Joi.string().valid('admin', 'inventory_manager', 'sales_staff', 'auditor').default('sales_staff')
});

// Test data for each role
const testUsers = [
  {
    username: 'testadmin',
    email: 'admin@test.com',
    password: 'password123',
    firstName: 'Test',
    lastName: 'Admin',
    role: 'admin'
  },
  {
    username: 'testmanager',
    email: 'manager@test.com',
    password: 'password123',
    firstName: 'Test',
    lastName: 'Manager',
    role: 'inventory_manager'
  },
  {
    username: 'teststaff',
    email: 'staff@test.com',
    password: 'password123',
    firstName: 'Test',
    lastName: 'Staff',
    role: 'sales_staff'
  },
  {
    username: 'testauditor',
    email: 'auditor@test.com',
    password: 'password123',
    firstName: 'Test',
    lastName: 'Auditor',
    role: 'auditor'
  }
];

console.log('Testing user validation for all roles...\n');

testUsers.forEach((user, index) => {
  const { error, value } = userCreateSchema.validate(user);
  
  console.log(`Test ${index + 1} - Role: ${user.role}`);
  if (error) {
    console.log('❌ Validation Error:', error.details.map(d => d.message).join(', '));
  } else {
    console.log('✅ Validation Passed');
    console.log('Validated data:', value);
  }
  console.log('---');
});
