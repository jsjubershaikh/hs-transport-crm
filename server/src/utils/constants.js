/**
 * Shared domain constants used by models, services and the seed script.
 * Keeping them in one place guarantees enums stay in sync everywhere.
 */

// The academic season runs Jun -> Apr (11 collectable months; May is vacation).
export const MONTHS = ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'];

// Map a short month code to its full label (used in receipts / UI fallbacks).
export const MONTH_LABELS = {
  Jun: 'June', Jul: 'July', Aug: 'August', Sep: 'September', Oct: 'October',
  Nov: 'November', Dec: 'December', Jan: 'January', Feb: 'February', Mar: 'March', Apr: 'April',
};

export const CLASSES = [
  'Jr KG', 'Sr KG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', 'NEET', 'Paramedical', 'Alumni',
];

export const SECTIONS = ['A', 'B', 'C', 'D'];

export const GENDERS = ['Male', 'Female', 'Other'];

export const STUDENT_STATUS = ['active', 'inactive'];

export const FEE_STATUS = ['paid', 'partial', 'pending'];

export const PAYMENT_MODES = ['cash', 'online', 'cheque', 'upi'];

export const USER_ROLES = ['superadmin', 'subadmin'];

export const NOTIFICATION_TYPES = [
  'fee_pending', 'student_added', 'payment_received', 'route_change', 'system', 'collection_verified',
];

/**
 * Class promotion map used by promotionService.
 * Jr KG -> Sr KG -> 1 -> ... -> 10 -> Alumni. Alumni stay Alumni.
 */
export const PROMOTION_MAP = {
  'Jr KG': 'Sr KG',
  'Sr KG': '1',
  '1': '2',
  '2': '3',
  '3': '4',
  '4': '5',
  '5': '6',
  '6': '7',
  '7': '8',
  '8': '9',
  '9': '10',
  '10': '11',
  '11': '12',
  '12': 'Alumni',
  'NEET': 'Alumni',
  'Paramedical': 'Alumni',
  Alumni: 'Alumni',
};
