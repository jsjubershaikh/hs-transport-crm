import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { USER_ROLES } from '../utils/constants.js';

const userSchema = new mongoose.Schema(
  {
    photo: { type: String, default: '' },
    name: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, match: /^[0-9]{10}$/ },
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    // passwordHash is select:false so it never leaks through normal queries.
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: USER_ROLES, required: true },
    assignedRouteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Route', default: null },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

/** Hash + store a plaintext password. Call before save() on create / reset. */
userSchema.methods.setPassword = async function setPassword(plain) {
  this.passwordHash = await bcrypt.hash(plain, 10);
};

/** Compare a plaintext attempt against the stored hash. */
userSchema.methods.comparePassword = function comparePassword(plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

// Index recommendation for scale: { role:1, assignedRouteId:1 } speeds up subadmin lookups.
userSchema.index({ role: 1, assignedRouteId: 1 });

export default mongoose.model('User', userSchema);
