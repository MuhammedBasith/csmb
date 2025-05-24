import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { config } from '../config/config';

const createSuperAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(config.mongoose.url!);
    console.log('Connected to MongoDB');

    // Check if super admin already exists
    const existingAdmin = await User.findOne({ role: 'super-admin' });
    if (existingAdmin) {
      console.log('Super admin already exists!');
      process.exit(0);
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('superadmin123', salt);

    // Create super admin
    const superAdmin = await User.create({
      name: 'Super Admin',
      email: 'super@blowlin.com',
      password: "superadmin123",
      role: 'super-admin',
      verified: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    console.log('Super admin created successfully:');
    console.log({
      name: superAdmin.name,
      email: superAdmin.email,
      role: superAdmin.role,
      id: superAdmin._id
    });

  } catch (error) {
    console.error('Error creating super admin:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

createSuperAdmin();