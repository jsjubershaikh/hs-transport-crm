import fs from 'fs';
import path from 'path';
import { connectDB, disconnectDB } from '../config/db.js';
import mongoose from 'mongoose';

async function runRestore() {
  const backupFolderArg = process.argv[2];
  if (!backupFolderArg) {
    console.error('❌ Please specify the backup folder name. Example: npm run restore backup-2026-06-12-16-30-00');
    process.exit(1);
  }

  const backupDirPath = path.join(process.cwd(), 'backups', backupFolderArg);
  if (!fs.existsSync(backupDirPath)) {
    console.error(`❌ Backup directory not found: ${backupDirPath}`);
    process.exit(1);
  }

  console.log('🔄 Connecting to MongoDB...');
  await connectDB();

  const db = mongoose.connection.db;
  const files = fs.readdirSync(backupDirPath).filter(f => f.endsWith('.json'));

  console.log(`⚠️  WARNING: Restoring will overwrite existing data in matching collections!`);
  console.log(`📂 Found ${files.length} collections in backup folder.`);

  for (const file of files) {
    const collectionName = path.basename(file, '.json');
    const filePath = path.join(backupDirPath, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    console.log(`  🔹 Restoring collection: ${collectionName} with ${data.length} documents...`);

    const collection = db.collection(collectionName);
    await collection.deleteMany({}).catch(() => {});

    if (data.length > 0) {
      // Parse dates and ObjectIds to preserve correct types in MongoDB BSON format
      const parsedData = data.map(doc => {
        return JSON.parse(JSON.stringify(doc), (key, value) => {
          if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/.test(value)) {
            return new Date(value);
          }
          if (value && typeof value === 'object' && value.$date) {
            return new Date(value.$date);
          }
          if (value && typeof value === 'object' && value.$oid) {
            return new mongoose.Types.ObjectId(value.$oid);
          }
          if (key === '_id' && typeof value === 'string' && value.length === 24) {
            return new mongoose.Types.ObjectId(value);
          }
          if (key.endsWith('Id') && typeof value === 'string' && value.length === 24) {
            return new mongoose.Types.ObjectId(value);
          }
          return value;
        });
      });

      await collection.insertMany(parsedData);
      console.log(`  ✅ Restored ${data.length} documents into ${collectionName}`);
    } else {
      console.log(`  ℹ️  Collection ${collectionName} was empty, cleared it.`);
    }
  }

  console.log('\n🎉 Restore complete!');
  await disconnectDB();
  process.exit(0);
}

runRestore().catch(async (err) => {
  console.error('❌ Restore failed:', err);
  await disconnectDB().catch(() => {});
  process.exit(1);
});
