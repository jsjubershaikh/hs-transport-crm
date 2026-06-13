import mongoose from 'mongoose';

const routeSchema = new mongoose.Schema(
  {
    routeName: { type: String, required: true, trim: true },
    routeNumber: { type: String, required: true, unique: true, trim: true },
    driverName: { type: String, required: true, trim: true },
    driverContact: { type: String, required: true, match: /^[0-9]{10}$/ },
    busId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bus', default: null },
    // Auto-suggested as the default fee when adding a student on this route.
    defaultMonthlyFee: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

export default mongoose.model('Route', routeSchema);
