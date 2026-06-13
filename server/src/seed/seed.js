/**
 * Seed script — wipes every collection and inserts a realistic, internally
 * consistent demo dataset so the app is impressive immediately after `npm run seed`.
 *
 *   node src/seed/seed.js   (or: npm run seed)
 *
 * NOTE: Math.random() is used here intentionally for varied demo data. This is a
 * one-shot Node script, so non-determinism is fine.
 */
import mongoose from 'mongoose';
import { pathToFileURL } from 'url';
import { connectDB, disconnectDB } from '../config/db.js';

import User from '../models/User.js';
import Route from '../models/Route.js';
import Bus from '../models/Bus.js';
import Student from '../models/Student.js';
import AcademicYear from '../models/AcademicYear.js';
import FeeRecord from '../models/FeeRecord.js';
import Receipt from '../models/Receipt.js';
import Notification from '../models/Notification.js';
import ActivityLog from '../models/ActivityLog.js';
import Promotion from '../models/Promotion.js';
import Settings from '../models/Settings.js';

import { MONTHS, PAYMENT_MODES } from '../utils/constants.js';

// ---------- demo data pools ----------
const MALE_NAMES = ['Aarav', 'Vivaan', 'Reyansh', 'Arjun', 'Ayaan', 'Krishna', 'Ishaan', 'Kabir', 'Aryan', 'Rudra', 'Zaid', 'Faizan', 'Yusuf', 'Rehan', 'Aman'];
const FEMALE_NAMES = ['Aadhya', 'Saanvi', 'Ananya', 'Diya', 'Myra', 'Aisha', 'Fatima', 'Zara', 'Riya', 'Ira', 'Sara', 'Khushi', 'Anaya', 'Mishka', 'Inaya'];
const LAST_NAMES = ['Sharma', 'Patel', 'Khan', 'Shaikh', 'Desai', 'Iyer', 'Reddy', 'Nair', 'Gupta', 'Joshi', 'Ansari', 'Qureshi', 'Mehta', 'Verma', 'Pawar'];
const FATHER_NAMES = ['Imran', 'Rajesh', 'Suresh', 'Aslam', 'Mahesh', 'Salman', 'Vikram', 'Naveed', 'Deepak', 'Farhan', 'Sanjay', 'Tariq', 'Rohit', 'Javed', 'Anil'];
const MOTHER_NAMES = ['Ayesha', 'Sunita', 'Rukhsana', 'Pooja', 'Nasreen', 'Kavita', 'Shabana', 'Meena', 'Farah', 'Anita', 'Razia', 'Neha', 'Yasmin', 'Rekha', 'Sana'];
const SCHOOLS = ['St. Xavier High School', 'Crescent English School', 'Holy Family Convent', 'Iqra International School', 'Vidya Mandir School'];
const CLASS_POOL = ['Jr KG', 'Sr KG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
const SECTIONS = ['A', 'B', 'C'];

const ROUTE_DEFS = [
  { routeName: 'Andheri East Circuit', routeNumber: 'R-01', driverName: 'Imran Shaikh', driverContact: '9821001001', defaultMonthlyFee: 1500,
    points: ['Chakala', 'Marol Naka', 'J B Nagar', 'Saki Naka', 'Andheri Station'] },
  { routeName: 'Bandra–Khar Line', routeNumber: 'R-02', driverName: 'Rajesh Patil', driverContact: '9821002002', defaultMonthlyFee: 1800,
    points: ['Linking Road', 'Carter Road', 'Khar Danda', 'Bandstand', 'Pali Hill'] },
  { routeName: 'Powai Loop', routeNumber: 'R-03', driverName: 'Salman Khan', driverContact: '9821003003', defaultMonthlyFee: 1400,
    points: ['Hiranandani', 'IIT Main Gate', 'Powai Lake', 'Chandivali', 'Galleria'] },
  { routeName: 'Thane Express', routeNumber: 'R-04', driverName: 'Deepak Joshi', driverContact: '9821004004', defaultMonthlyFee: 1200,
    points: ['Ghodbunder Road', 'Vartak Nagar', 'Naupada', 'Teen Hath Naka', 'Majiwada'] },
];

const BUS_DEFS = [
  { busNumber: 'BUS-01', vehicleNumber: 'MH-12-AB-1234', capacity: 40, driverName: 'Imran Shaikh', driverContact: '9821001001' },
  { busNumber: 'BUS-02', vehicleNumber: 'MH-12-CD-5678', capacity: 45, driverName: 'Rajesh Patil', driverContact: '9821002002' },
  { busNumber: 'BUS-03', vehicleNumber: 'MH-12-EF-9012', capacity: 35, driverName: 'Salman Khan', driverContact: '9821003003' },
  { busNumber: 'BUS-04', vehicleNumber: 'MH-12-GH-3456', capacity: 30, driverName: 'Deepak Joshi', driverContact: '9821004004' },
];

// ---------- helpers ----------
const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const mobile = () => `9${randInt(100000000, 999999999)}`;

/** Map a season month + start year to a believable payment date. */
function monthDate(seasonMonth, startYear) {
  const monthNum = { Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11, Jan: 0, Feb: 1, Mar: 2, Apr: 3 }[seasonMonth];
  const year = monthNum >= 5 ? startYear : startYear + 1; // Jun..Dec = startYear, Jan..Apr = next
  return new Date(year, monthNum, randInt(5, 25));
}

// Per-year receipt counters so seeded numbers match the live counter format.
const receiptSeq = {};
function nextReceipt(year) {
  receiptSeq[year] = (receiptSeq[year] || 0) + 1;
  return `HT-${year}-${String(receiptSeq[year]).padStart(4, '0')}`;
}

async function dropAll() {
  const models = [User, Route, Bus, Student, AcademicYear, FeeRecord, Receipt, Notification, ActivityLog, Promotion, Settings];
  for (const M of models) {
    await M.collection.deleteMany({}).catch(() => {});
  }
  // Reset the live receipt counter collection too.
  await mongoose.connection.collection('counters').deleteMany({}).catch(() => {});
}

/**
 * Build a student + their fee records (+ receipts) for one academic year.
 * Returns { student, fees, receipts } as plain objects ready for insertMany.
 */
function buildStudent({ year, route, bus, klass }) {
  const isMale = Math.random() > 0.45;
  const first = isMale ? rand(MALE_NAMES) : rand(FEMALE_NAMES);
  const last = rand(LAST_NAMES);
  const fee = route.defaultMonthlyFee + randInt(-2, 2) * 100; // near route default
  const studentId = new mongoose.Types.ObjectId();
  const pickup = rand(route.points);
  let drop = rand(route.points);
  if (drop === pickup) drop = 'School Campus';

  const student = {
    _id: studentId,
    photo: '',
    name: `${first} ${last}`,
    fatherName: `${rand(FATHER_NAMES)} ${last}`,
    motherName: `${rand(MOTHER_NAMES)} ${last}`,
    mobile: mobile(),
    altMobile: Math.random() > 0.6 ? mobile() : '',
    address: `${randInt(1, 99)}, ${rand(route.points)}, Mumbai`,
    gender: isMale ? 'Male' : 'Female',
    dob: new Date(year.startYear - randInt(4, 16), randInt(0, 11), randInt(1, 28)),
    class: klass,
    section: rand(SECTIONS),
    school: rand(SCHOOLS),
    academicYearId: year._id,
    routeId: route._id,
    busId: bus._id,
    pickupPoint: pickup,
    dropPoint: drop,
    monthlyFee: fee,
    status: Math.random() > 0.92 ? 'inactive' : 'active',
    admissionDate: monthDate(rand(MONTHS.slice(0, 4)), year.startYear),
  };

  const fees = [];
  const receipts = [];
  MONTHS.forEach((month, idx) => {
    // Earlier months more likely paid (0.9 -> ~0.25 across the season).
    const pPaid = 0.9 - idx * 0.06;
    const roll = Math.random();
    let paidAmount = 0;
    let status = 'pending';
    let paymentMode;
    let paymentDate;
    let receiptNumber = '';

    if (roll < pPaid) {
      paidAmount = fee;
      status = 'paid';
    } else if (roll < pPaid + 0.15) {
      paidAmount = Math.round(fee / 2 / 50) * 50; // half-ish, rounded
      status = 'partial';
    }

    if (paidAmount > 0) {
      paymentMode = rand(PAYMENT_MODES);
      paymentDate = monthDate(month, year.startYear);
      receiptNumber = nextReceipt(year.startYear);
    }

    const feeId = new mongoose.Types.ObjectId();
    fees.push({
      _id: feeId,
      studentId,
      academicYearId: year._id,
      routeId: route._id,
      month,
      monthlyFee: fee,
      paidAmount,
      remainingAmount: Math.max(fee - paidAmount, 0),
      status,
      paymentDate,
      paymentMode,
      notes: '',
      receiptNumber,
    });

    if (paidAmount > 0) {
      receipts.push({
        receiptNumber,
        studentId,
        feeRecordId: feeId,
        academicYearId: year._id,
        routeId: route._id,
        amount: paidAmount,
        month,
        generatedAt: paymentDate,
      });
    }
  });

  return { student, fees, receipts };
}

/**
 * Pure seeding work (no connect/disconnect/exit) so it can be reused by tests
 * and verification harnesses against any mongoose connection.
 */
export async function seedDatabase() {
  await dropAll();

  // --- Settings (single doc) ---
  await Settings.create({});

  // --- Academic years ---
  const yearPrev = await AcademicYear.create({
    label: '2024-2025', startDate: new Date('2024-06-01'), endDate: new Date('2025-04-30'),
    isCurrent: false, isArchived: true,
  });
  const yearCurr = await AcademicYear.create({
    label: '2025-2026', startDate: new Date('2025-06-01'), endDate: new Date('2026-04-30'),
    isCurrent: true, isArchived: false,
  });
  // Plain info objects (startYear isn't a schema field, so don't set it on the doc).
  const yearPrevInfo = { _id: yearPrev._id, startYear: 2024 };
  const yearCurrInfo = { _id: yearCurr._id, startYear: 2025 };

  // --- Buses ---
  const buses = await Bus.insertMany(BUS_DEFS);

  // --- Routes (each linked to a bus) ---
  const routes = [];
  for (let i = 0; i < ROUTE_DEFS.length; i++) {
    const r = await Route.create({ ...ROUTE_DEFS[i], busId: buses[i]._id });
    buses[i].assignedRouteId = r._id;
    await buses[i].save();
    routes.push(r);
  }
  // `points` isn't a Route schema field, so carry pickup/drop pools separately
  // (combined with the saved route's id/fee) for student generation.
  const routeInfos = routes.map((r, i) => ({
    _id: r._id,
    routeName: r.routeName,
    defaultMonthlyFee: r.defaultMonthlyFee,
    points: ROUTE_DEFS[i].points,
  }));

  // --- Users (1 superadmin + 2 subadmins) ---
  const superadmin = new User({ name: 'HS Admin', mobile: '9820000000', username: 'admin', role: 'superadmin' });
  await superadmin.setPassword('admin123');
  await superadmin.save();

  const sub1 = new User({ name: 'Route 1 Manager', mobile: '9820000001', username: 'route1admin', role: 'subadmin', assignedRouteId: routes[0]._id });
  await sub1.setPassword('pass123');
  await sub1.save();

  const sub2 = new User({ name: 'Route 2 Manager', mobile: '9820000002', username: 'route2admin', role: 'subadmin', assignedRouteId: routes[1]._id });
  await sub2.setPassword('pass123');
  await sub2.save();

  // --- Students + fees + receipts for the CURRENT year (28 students) ---
  const allStudents = [];
  const allFees = [];
  const allReceipts = [];
  const CURRENT_COUNT = 28;
  for (let i = 0; i < CURRENT_COUNT; i++) {
    const idx = i % routeInfos.length;
    const route = routeInfos[idx];
    const bus = buses[idx];
    const klass = CLASS_POOL[i % CLASS_POOL.length];
    const { student, fees, receipts } = buildStudent({ year: yearCurrInfo, route, bus, klass });
    allStudents.push(student);
    allFees.push(...fees);
    allReceipts.push(...receipts);
  }

  // --- A handful of students in the ARCHIVED year (for the Archive module) ---
  const ARCHIVE_COUNT = 6;
  for (let i = 0; i < ARCHIVE_COUNT; i++) {
    const idx = i % routeInfos.length;
    const route = routeInfos[idx];
    const bus = buses[idx];
    const klass = CLASS_POOL[i % CLASS_POOL.length];
    const { student, fees, receipts } = buildStudent({ year: yearPrevInfo, route, bus, klass });
    allStudents.push(student);
    allFees.push(...fees);
    allReceipts.push(...receipts);
  }

  await Student.insertMany(allStudents);
  await FeeRecord.insertMany(allFees);
  await Receipt.insertMany(allReceipts);

  // Persist the receipt counters so post-seed receipts continue the sequence.
  const counters = mongoose.connection.collection('counters');
  for (const [year, seq] of Object.entries(receiptSeq)) {
    await counters.updateOne({ _id: `receipt-${year}` }, { $set: { seq } }, { upsert: true });
  }

  // --- Notifications (~8, mixed, some unread, some route-scoped) ---
  const sampleStudents = allStudents.filter((s) => String(s.academicYearId) === String(yearCurr._id));
  await Notification.insertMany([
    { type: 'student_added', message: `New student added: ${sampleStudents[0].name} (Class ${sampleStudents[0].class})`, isRead: false, targetRouteId: routes[0]._id, targetRole: 'all' },
    { type: 'payment_received', message: `Payment of ₹${routes[1].defaultMonthlyFee} received for ${sampleStudents[1].name}`, isRead: false, targetRouteId: routes[1]._id, targetRole: 'all' },
    { type: 'fee_pending', message: '5 students on Powai Loop have pending fees for October', isRead: false, targetRouteId: routes[2]._id, targetRole: 'subadmin' },
    { type: 'fee_pending', message: 'Monthly fee collection drive starts next week', isRead: true, targetRouteId: null, targetRole: 'all' },
    { type: 'route_change', message: 'Thane Express timings updated for winter schedule', isRead: false, targetRouteId: routes[3]._id, targetRole: 'all' },
    { type: 'system', message: 'Academic year 2025-2026 is now active', isRead: true, targetRouteId: null, targetRole: 'superadmin' },
    { type: 'payment_received', message: `Receipt ${allReceipts[0]?.receiptNumber || 'HT-2025-0001'} generated`, isRead: true, targetRouteId: routes[0]._id, targetRole: 'all' },
    { type: 'student_added', message: `New student added: ${sampleStudents[2].name} (Class ${sampleStudents[2].class})`, isRead: false, targetRouteId: routes[0]._id, targetRole: 'all' },
  ]);

  // --- Activity logs (~15 recent realistic entries) ---
  const logs = [
    { userId: superadmin._id, action: 'auth.login', details: { username: 'admin', role: 'superadmin' } },
    { userId: sub1._id, action: 'auth.login', details: { username: 'route1admin', role: 'subadmin' } },
    { userId: superadmin._id, action: 'student.create', details: { name: sampleStudents[0].name, class: sampleStudents[0].class } },
    { userId: sub1._id, action: 'fee.collect', details: { name: sampleStudents[1].name, month: 'Aug', amount: 1500 } },
    { userId: superadmin._id, action: 'route.create', details: { routeName: routes[0].routeName } },
    { userId: superadmin._id, action: 'bus.create', details: { busNumber: buses[0].busNumber } },
    { userId: superadmin._id, action: 'subadmin.create', details: { username: 'route1admin' } },
    { userId: sub2._id, action: 'auth.login', details: { username: 'route2admin' } },
    { userId: sub1._id, action: 'student.create', details: { name: sampleStudents[3].name } },
    { userId: superadmin._id, action: 'fee.collect', details: { name: sampleStudents[4].name, month: 'Sep', amount: 1800 } },
    { userId: superadmin._id, action: 'settings.update', details: {} },
    { userId: sub2._id, action: 'fee.collect', details: { name: sampleStudents[5].name, month: 'Jul', amount: 1400 } },
    { userId: superadmin._id, action: 'academicYear.setCurrent', details: { label: '2025-2026' } },
    { userId: sub1._id, action: 'fee.reminders', details: { count: 4, channel: 'whatsapp' } },
    { userId: superadmin._id, action: 'student.update', details: { name: sampleStudents[6].name } },
  ].map((l, i) => ({ ...l, ip: '127.0.0.1', timestamp: new Date(Date.now() - i * 3600 * 1000) }));
  await ActivityLog.insertMany(logs);

  // ---------- summary ----------
  const summary = {
    AcademicYears: await AcademicYear.countDocuments(),
    Users: await User.countDocuments(),
    Routes: await Route.countDocuments(),
    Buses: await Bus.countDocuments(),
    Students: await Student.countDocuments(),
    FeeRecords: await FeeRecord.countDocuments(),
    Receipts: await Receipt.countDocuments(),
    Notifications: await Notification.countDocuments(),
    ActivityLogs: await ActivityLog.countDocuments(),
    Settings: await Settings.countDocuments(),
  };

  return { summary, routes };
}

/** CLI runner: connect, seed, print, disconnect. */
async function run() {
  console.log('🌱 Seeding HS Transportation CRM...\n');
  await connectDB();
  const { summary, routes } = await seedDatabase();

  console.log('\n✅ Seed complete. Collection counts:');
  console.table(summary);
  console.log('\n🔑 Demo credentials:');
  console.table([
    { Role: 'Super Admin', Username: 'admin', Password: 'admin123', Route: 'ALL' },
    { Role: 'Sub Admin 1', Username: 'route1admin', Password: 'pass123', Route: routes[0].routeName },
    { Role: 'Sub Admin 2', Username: 'route2admin', Password: 'pass123', Route: routes[1].routeName },
  ]);

  await disconnectDB();
  process.exit(0);
}

// Auto-run only when invoked directly (`node src/seed/seed.js` / `npm run seed`).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run().catch(async (err) => {
    console.error('❌ Seed failed:', err);
    await disconnectDB().catch(() => {});
    process.exit(1);
  });
}
