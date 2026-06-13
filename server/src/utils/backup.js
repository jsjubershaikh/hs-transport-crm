import fs from 'fs';
import path from 'path';
import { connectDB, disconnectDB } from '../config/db.js';
import mongoose from 'mongoose';

async function runBackup() {
  console.log('🔄 Connecting to MongoDB...');
  await connectDB();

  const dateStr = new Date().toISOString().split('T')[0];
  const timeStr = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
  const backupDirName = `backup-${dateStr}-${timeStr}`;
  const backupDirPath = path.join(process.cwd(), 'backups', backupDirName);

  console.log(`📂 Creating backup directory: ${backupDirPath}`);
  fs.mkdirSync(backupDirPath, { recursive: true });

  const db = mongoose.connection.db;
  const collections = await db.collections();

  console.log(`📦 Found ${collections.length} collections. Starting dump...`);

  for (const collection of collections) {
    const name = collection.collectionName;
    console.log(`  🔹 Dumping collection: ${name}...`);
    const docs = await collection.find({}).toArray();
    const filePath = path.join(backupDirPath, `${name}.json`);
    fs.writeFileSync(filePath, JSON.stringify(docs, null, 2), 'utf8');
    console.log(`  ✅ Saved ${docs.length} documents to ${name}.json`);
  }

  console.log('\n🎉 Backup complete!');
  console.log(`📁 Files are located at: ${backupDirPath}`);
  
  await disconnectDB();
  process.exit(0);
}

runBackup().catch(async (err) => {
  console.error('❌ Backup failed:', err);
  await disconnectDB().catch(() => {});
  process.exit(1);
});
