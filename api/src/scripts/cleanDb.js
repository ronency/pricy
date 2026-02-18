import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../config/database.js';

async function cleanDb() {
  console.log('🧹 Starting database cleanup...');

  await connectDatabase();

  const collections = await mongoose.connection.db.collections();

  for (const collection of collections) {
    await collection.deleteMany({});
    console.log(`✅ Cleared collection: ${collection.collectionName}`);
  }

  await disconnectDatabase();
  console.log('✅ Database cleanup complete!');
}

cleanDb().catch(error => {
  console.error('❌ Cleanup failed:', error);
  process.exit(1);
});
