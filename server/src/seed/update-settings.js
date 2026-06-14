import { connectDB, disconnectDB } from '../config/db.js';
import Settings from '../models/Settings.js';

async function updateSettings() {
  console.log('🔄 Connecting to DB...');
  await connectDB();

  console.log('🔄 Checking existing settings...');
  let settings = await Settings.findOne();
  if (!settings) {
    console.log('❌ No Settings document found, creating one...');
    settings = new Settings();
  }

  console.log('🔄 Updating company details...');
  settings.company.name = 'HS School Bus';
  settings.company.email = 'huzaifatransportation@gmail.com';
  settings.company.phone = '9822920739 / 8668651801';
  settings.company.address = 'Pandit Nagar Cidco Colony Nashik-422009';
  
  await settings.save();
  console.log('✅ Settings updated successfully:', settings.company);

  await disconnectDB();
  process.exit(0);
}

updateSettings().catch(async (err) => {
  console.error('❌ Failed to update settings:', err);
  await disconnectDB().catch(() => {});
  process.exit(1);
});
