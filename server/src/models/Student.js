import mongoose from 'mongoose';
import { CLASSES, SECTIONS, GENDERS, STUDENT_STATUS } from '../utils/constants.js';

const siblingSchema = new mongoose.Schema(
  {
    photo:         { type: String, default: '' },
    name:          { type: String, required: true, trim: true },
    gender:        { type: String, enum: GENDERS },
    dob:           { type: Date },
    class:         { type: String, enum: CLASSES },
    section:       { type: String, enum: SECTIONS, default: 'A' },
    monthlyFee:    { type: Number, default: 0, min: 0 },
    academicYearId:{ type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear' },
    admissionDate: { type: Date, default: Date.now },
  },
  { _id: true }
);

const studentSchema = new mongoose.Schema(
  {
    photo:      { type: String, default: '' },
    name:       { type: String, required: true, trim: true },
    fatherName: { type: String, required: true, trim: true },
    motherName: { type: String, required: true, trim: true },
    mobile:     { type: String, required: true, match: /^[0-9]{10}$/ },
    altMobile:  { type: String, match: /^[0-9]{10}$/, default: '' },
    address:    { type: String, trim: true, default: '' },
    gender:     { type: String, enum: GENDERS },
    dob:        { type: Date },

    class:   { type: String, enum: CLASSES, required: true },
    section: { type: String, enum: SECTIONS, default: 'A' },
    school:  { type: String, required: true, trim: true },

    academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true, index: true },
    routeId:        { type: mongoose.Schema.Types.ObjectId, ref: 'Route', required: true, index: true },
    busId:          { type: mongoose.Schema.Types.ObjectId, ref: 'Bus', required: true },

    pickupPoint: { type: String, required: true, trim: true },
    dropPoint:   { type: String, required: true, trim: true },

    // baseFee = primary student's individual fee.
    // monthlyFee = baseFee + sum of all siblings' fees (combined family total).
    baseFee:    { type: Number, default: 0, min: 0 },
    monthlyFee: { type: Number, required: true, min: 0 },

    // Embedded siblings — share same route/bus/pickup/drop as primary student.
    siblings: { type: [siblingSchema], default: [] },

    status:        { type: String, enum: STUDENT_STATUS, default: 'active' },
    admissionDate: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

studentSchema.index({ routeId: 1, academicYearId: 1 });
studentSchema.index({ class: 1 });
studentSchema.index({ name: 'text', mobile: 'text' });

export default mongoose.model('Student', studentSchema);
