import mongoose from 'mongoose';
import Student from './Student.js';

const busSchema = new mongoose.Schema(
  {
    busNumber: { type: String, required: true, unique: true, trim: true },
    vehicleNumber: { type: String, required: true, unique: true, trim: true },
    capacity: { type: Number, required: true, min: 1 },
    driverName: { type: String, trim: true },
    driverContact: { type: String, match: /^[0-9]{10}$/ },
    assignedRouteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Route', default: null },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/**
 * Virtual `occupancy`: live count of active students assigned to this bus.
 * Because virtuals can't be async-populated in a list cheaply, controllers
 * compute occupancy via aggregation for list endpoints; this virtual is a
 * convenience for single-document reads.
 */
busSchema.virtual('occupancy').get(function occupancy() {
  // Populated lazily by the controller; falls back to undefined otherwise.
  return this._occupancy;
});

/** Helper used by controllers to attach a computed occupancy count. */
busSchema.methods.withOccupancy = async function withOccupancy() {
  this._occupancy = await Student.countDocuments({ busId: this._id, status: 'active' });
  return this;
};

export default mongoose.model('Bus', busSchema);
