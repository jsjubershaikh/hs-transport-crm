// Shared front-end domain constants (mirror the backend's constants).

export const MONTHS = ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'];

export const MONTH_LABELS = {
  Jun: 'June', Jul: 'July', Aug: 'August', Sep: 'September', Oct: 'October', Nov: 'November',
  Dec: 'December', Jan: 'January', Feb: 'February', Mar: 'March', Apr: 'April',
};

export const CLASSES = ['Jr KG', 'Sr KG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', 'NEET', 'Paramedical', 'Alumni'];

export const SECTIONS = ['A', 'B', 'C', 'D'];

export const GENDERS = ['Male', 'Female', 'Other'];

export const PAYMENT_MODES = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'online', label: 'Online' },
  { value: 'cheque', label: 'Cheque' },
];

export const FEE_STATUS = ['paid', 'partial', 'pending'];

// Class grouping tabs used on the Student List page.
export const CLASS_GROUPS = [
  { key: 'all', label: 'All', match: () => true },
  { key: 'kg', label: 'KG', match: (c) => c === 'Jr KG' || c === 'Sr KG' },
  { key: '1-4', label: 'Class 1–4', match: (c) => ['1', '2', '3', '4'].includes(c) },
  { key: '5-10', label: 'Class 5–10', match: (c) => ['5', '6', '7', '8', '9', '10'].includes(c) },
  { key: '11-12-higher', label: 'Higher & Coaching', match: (c) => ['11', '12', 'NEET', 'Paramedical'].includes(c) },
];

// Promotion map shown on the Academic Year page (display only — server enforces).
export const PROMOTION_MAP = {
  'Jr KG': 'Sr KG', 'Sr KG': '1', '1': '2', '2': '3', '3': '4', '4': '5', '5': '6',
  '6': '7', '7': '8', '8': '9', '9': '10', '10': '11', '11': '12', '12': 'Alumni',
  'NEET': 'Alumni', 'Paramedical': 'Alumni',
};

// Sidebar navigation, filtered by role in the Sidebar component.
export const NAV_ITEMS = [
  { to: '/app/dashboard',          label: 'Dashboard',          icon: 'LayoutDashboard', roles: ['superadmin', 'subadmin'] },
  { to: '/app/students',           label: 'Students',            icon: 'GraduationCap',   roles: ['superadmin', 'subadmin'] },
  { to: '/app/fees',               label: 'Fee Management',      icon: 'Wallet',          roles: ['superadmin', 'subadmin'] },
  { to: '/app/daily-collection',   label: 'Daily Collection',    icon: 'TrendingUp',      roles: ['superadmin', 'subadmin'] },
  { to: '/app/routes-buses',       label: 'Routes & Buses',      icon: 'Map',             roles: ['superadmin'] },
  { to: '/app/subadmins',          label: 'Sub Admins',          icon: 'UserCog',         roles: ['superadmin'] },
  { to: '/app/alumni',             label: 'Alumni & Inactive',   icon: 'Users2',          roles: ['superadmin'] },
  { to: '/app/reports',            label: 'Reports',             icon: 'BarChart3',       roles: ['superadmin'] },
  { to: '/app/academic-years',     label: 'Academic Years',      icon: 'CalendarRange',   roles: ['superadmin'] },
  { to: '/app/settings',           label: 'Settings',            icon: 'Settings',        roles: ['superadmin'] },
];

export const NOTIFICATION_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'fee', label: 'Fees' },
  { key: 'student', label: 'Students' },
  { key: 'system', label: 'System' },
];
