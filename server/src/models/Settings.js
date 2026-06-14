import mongoose from 'mongoose';

/**
 * Single-document settings store. There is only ever one Settings doc; the
 * controller uses findOneAndUpdate(..., { upsert:true }) to read/write it.
 */
const settingsSchema = new mongoose.Schema(
  {
    company: {
      name: { type: String, default: 'HS School Bus' },
      address: { type: String, default: 'Pandit Nagar Cidco Colony Nashik-422009' },
      phone: { type: String, default: '9822920739 / 8668651801' },
      email: { type: String, default: 'huzaifatransportation@gmail.com' },
      logo: { type: String, default: '' }, // base64 data URL
    },
    receipt: {
      prefix: { type: String, default: 'HT' },
      footerText: { type: String, default: 'Thank you for timely payment!' },
      signature: { type: String, default: '' }, // base64 data URL
    },
    reminders: {
      whatsappTemplate: {
        type: String,
        default:
          'Dear Parent of {studentName}, Transport fee for {month} is ₹{remaining} pending. Kindly pay at earliest. - HS School Bus',
      },
      smsTemplate: {
        type: String,
        default:
          'Dear Parent, {studentName} transport fee for {month} ₹{remaining} is pending. - HS Transport',
      },
    },
    security: {
      sessionTimeoutMinutes: { type: Number, default: 60 },
    },
  },
  { timestamps: true }
);

export default mongoose.model('Settings', settingsSchema);
