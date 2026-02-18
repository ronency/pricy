import mongoose from 'mongoose';

export async function connectDatabase() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/pricy';

  try {
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }

  mongoose.connection.on('error', (error) => {
    console.error('❌ MongoDB error:', error.message);
  });

  mongoose.connection.on('disconnected', () => {
    console.log('⚠️ MongoDB disconnected');
  });
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
  console.log('📤 Disconnected from MongoDB');
}
