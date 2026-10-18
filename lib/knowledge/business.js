/**
 * AutoCare Service Centre — Business Data
 *
 * This is the authoritative source of structured business information
 * for AutoCare AI. Update this file when business details change.
 *
 * DO NOT import this in Client Components — knowledge base data is
 * server-side only (API routes, Server Components, Server Actions).
 *
 * All prices are in Indian Rupees (₹).
 * All times are in IST (Asia/Kolkata).
 */

// ─── Business Overview ────────────────────────────────────────────

export const BUSINESS = {
  name: 'AutoCare Service Centre',
  tagline: 'Expert Vehicle Care, Every Time',
  legalName: 'AutoCare Service Centre Pvt. Ltd.',
  established: 2010,
};

// ─── Location ─────────────────────────────────────────────────────

export const LOCATION = {
  address: '14, Orbit Complex, Koregaon Park',
  city: 'Pune',
  state: 'Maharashtra',
  pincode: '411001',
  country: 'India',
  landmark: 'Opposite Koregaon Park Police Station, near MG Road Metro Station',
  parking: 'Free customer parking is available on the premises.',
  directions: 'From MG Road, turn right at the Koregaon Park Police Chowk. The service centre is 200 m ahead on the left, inside Orbit Complex.',
};

// ─── Contact ──────────────────────────────────────────────────────

export const CONTACT = {
  phone: '+91 20 2634 5678',
  whatsapp: '+91 98765 43210',
  email: 'support@autocarecentre.in',
  bookingEmail: 'booking@autocarecentre.in',
  complaintEmail: 'feedback@autocarecentre.in',
  social: {
    instagram: '@autocarecentre',
    facebook: 'AutoCareServiceCentrePune',
  },
  note: 'WhatsApp is the fastest way to reach us for quick queries.',
};

// ─── Opening Hours ────────────────────────────────────────────────

export const HOURS = {
  weekdays: {
    days: 'Monday – Friday',
    open: '08:00',
    close: '19:00',
    display: '8:00 AM – 7:00 PM',
  },
  saturday: {
    days: 'Saturday',
    open: '08:00',
    close: '19:00',
    display: '8:00 AM – 7:00 PM',
  },
  sunday: {
    days: 'Sunday',
    open: '09:00',
    close: '14:00',
    display: '9:00 AM – 2:00 PM',
    restriction: 'Drop-off and pickup only. No servicing starts on Sunday.',
  },
  publicHolidays: 'Closed on all national public holidays.',
  lastEntry: 'The last vehicle is accepted 1 hour before closing time.',
  emergencyNote: 'For roadside emergencies outside hours, call our WhatsApp line — we will advise the nearest open facility.',
};

// ─── Services & Pricing ───────────────────────────────────────────

export const SERVICES = [
  {
    id: 'oil-change',
    name: 'Oil & Filter Change',
    description: 'Engine oil and oil filter replacement to keep the engine running cleanly. Oil grade and brand selected based on manufacturer specification.',
    variants: [
      { name: 'Mineral Oil',       labourPrice: 800,  note: 'Oil cost extra. Typically ₹400–₹700 for 3.5L.' },
      { name: 'Semi-Synthetic Oil', labourPrice: 1200, note: 'Oil cost extra. Typically ₹700–₹1,200 for 3.5L.' },
      { name: 'Full Synthetic Oil', labourPrice: 1800, note: 'Oil cost extra. Typically ₹1,500–₹3,500 for 3.5L.' },
    ],
    duration: '30–45 minutes',
    category: 'Routine Maintenance',
  },
  {
    id: 'tyre-rotation',
    name: 'Tyre Rotation & Balancing',
    description: 'Rotating all four tyres to even out tread wear, combined with dynamic wheel balancing. Extends tyre life and improves ride quality.',
    price: { from: 600, to: 800, display: '₹600–₹800 for all 4 tyres' },
    duration: '45–60 minutes',
    category: 'Tyre Services',
  },
  {
    id: 'wheel-alignment',
    name: 'Wheel Alignment',
    description: 'Computer-assisted alignment to manufacturer angles. Eliminates steering pull, uneven tyre wear, and reduces fuel consumption.',
    variants: [
      { name: '2-Wheel (Front) Alignment', price: 800  },
      { name: '4-Wheel Alignment',         price: 1200 },
    ],
    duration: '30–45 minutes',
    category: 'Tyre Services',
  },
  {
    id: 'brake-inspection',
    name: 'Brake Inspection',
    description: 'Full inspection of front and rear brake components including pads, discs, drums, and fluid.',
    price: { display: 'Free with any booked service. ₹500 as standalone.' },
    duration: '20–30 minutes',
    category: 'Brake Services',
  },
  {
    id: 'brake-pad-replacement',
    name: 'Brake Pad Replacement',
    description: 'Front or rear brake pad replacement using quality OEM-equivalent or OEM pads.',
    price: { from: 2500, to: 5000, display: '₹2,500–₹5,000 per axle including parts' },
    note: 'Price varies by vehicle make and pad grade. Disc resurfacing (if required) is ₹1,200 per axle extra.',
    duration: '60–90 minutes',
    category: 'Brake Services',
  },
  {
    id: 'ac-service',
    name: 'Air Conditioning (AC) Service',
    description: 'AC system check, cleaning of evaporator and condenser, refrigerant level check, and regassing with R-134a or R-1234yf.',
    variants: [
      { name: 'AC Check & Regassing',   price: { from: 1800, to: 3200 } },
      { name: 'AC Compressor Service',  price: { from: 3500, to: 8000 } },
      { name: 'Cabin Air Filter',       price: { from: 600,  to: 1500 }, note: 'Including filter part' },
    ],
    duration: '90–180 minutes',
    category: 'AC & Cooling',
  },
  {
    id: 'battery',
    name: 'Battery Services',
    description: 'Battery health test using digital load tester, and replacement with branded battery with warranty.',
    variants: [
      { name: 'Battery Health Check', price: { display: 'Free' }             },
      { name: 'Battery Replacement',  price: { from: 3500, to: 9000, display: '₹3,500–₹9,000 including battery' }, note: 'Price depends on battery brand and capacity (Ah). Exide, Amaron, and Livguard available.' },
    ],
    duration: '15–45 minutes',
    category: 'Electrical',
  },
  {
    id: 'engine-tuneup',
    name: 'Engine Tune-Up & Air Filter',
    description: 'Spark plug inspection and replacement, air filter replacement, idle check, and throttle body cleaning.',
    variants: [
      { name: 'Spark Plug Set Replacement', price: { from: 400, to: 2500, display: '₹400–₹2,500 including plugs' }, note: 'Wide range due to iridium vs copper plug types.' },
      { name: 'Air Filter Replacement',     price: { from: 500, to: 1200 }, note: 'Including filter part.' },
      { name: 'Engine Bay Cleaning',        price: 800 },
    ],
    duration: '45–90 minutes',
    category: 'Engine',
  },
  {
    id: 'coolant',
    name: 'Cooling System Service',
    description: 'Coolant flush and refill with OEM-specified coolant, radiator and hose inspection.',
    variants: [
      { name: 'Coolant Flush & Fill',  price: { from: 1200, to: 2000 } },
      { name: 'Radiator Inspection',   price: { display: 'Free with any booking' } },
    ],
    duration: '45–60 minutes',
    category: 'Engine',
  },
  {
    id: 'full-inspection',
    name: '50-Point Vehicle Inspection',
    description: 'Comprehensive multi-point inspection covering engine, brakes, tyres, suspension, lights, wipers, fluids, AC, battery, and body. A written report is provided.',
    price: {
      standalone: 1500,
      withService: 'Free with any service booking',
      display: '₹1,500 standalone · Free with any booked service',
    },
    duration: '60–90 minutes',
    category: 'Inspection',
  },
  {
    id: 'windshield',
    name: 'Windshield & Wiper Services',
    description: 'Windshield chip repair, crack assessment, and full replacement. Wiper blade replacement.',
    variants: [
      { name: 'Chip / Crack Repair (< 10 cm)', price: { from: 600,  to: 1200  }, note: 'Not all chips are repairable — technician will assess on inspection.' },
      { name: 'Full Windshield Replacement',   price: { from: 8000, to: 25000 }, note: 'Including OEM or OEM-equivalent glass and ADAS recalibration if applicable.' },
      { name: 'Wiper Blade Replacement (pair)', price: { from: 400, to: 1200  }, note: 'Including blade parts.' },
    ],
    duration: '30 min – 4 hours (full replacement takes longer)',
    category: 'Body & Glass',
  },
  {
    id: 'suspension',
    name: 'Suspension & Steering Check',
    description: 'Visual and road-test-based inspection of shock absorbers, struts, tie rods, ball joints, and power steering.',
    variants: [
      { name: 'Suspension Inspection',         price: { display: 'Free with any booking' }          },
      { name: 'Shock Absorber Replacement',    price: { from: 3500, to: 8000 }, note: 'Per pair. Price depends on vehicle type.' },
      { name: 'Power Steering Fluid Change',   price: 800                                           },
    ],
    duration: '60–180 minutes depending on repair',
    category: 'Suspension & Steering',
  },
];

// ─── Annual Maintenance Packages ─────────────────────────────────

export const PACKAGES = [
  {
    id: 'pkg-compact',
    name: 'Compact Care Package',
    price: 5999,
    validity: '12 months or 20,000 km (whichever comes first)',
    inclusions: [
      '2× Mineral oil & filter change (oil cost extra)',
      '2× 50-point vehicle inspection',
      '1× Tyre rotation & balancing',
    ],
    bestFor: 'Low-mileage vehicles and city drivers',
  },
  {
    id: 'pkg-standard',
    name: 'Standard Care Package',
    price: 9999,
    validity: '12 months or 30,000 km (whichever comes first)',
    inclusions: [
      'Everything in Compact',
      '1× AC check & regassing',
      '1× Brake inspection & report',
      '1× Battery health check',
      '1× Wheel alignment',
    ],
    bestFor: 'Regular commuters and family cars',
    savings: 'Saves approximately ₹2,500 vs. individual bookings',
  },
  {
    id: 'pkg-premium',
    name: 'Premium Care Package',
    price: 14999,
    validity: '12 months or 40,000 km (whichever comes first)',
    inclusions: [
      'Everything in Standard',
      '1× Semi-synthetic oil change (oil cost extra)',
      '1× Cabin air filter replacement (including part)',
      '1× Engine air filter replacement (including part)',
      '1× Additional service of your choice (up to ₹2,000 value)',
    ],
    bestFor: 'High-mileage drivers and vehicle enthusiasts',
    savings: 'Saves approximately ₹5,000 vs. individual bookings',
  },
];

// ─── Vehicle Compatibility ────────────────────────────────────────

export const VEHICLE_COMPATIBILITY = {
  fullySupported: [
    'All petrol passenger cars (hatchback, sedan, SUV, MUV)',
    'All diesel passenger cars (hatchback, sedan, SUV, MUV)',
    'CNG (factory-fitted) passenger cars',
    'Light commercial vehicles up to 3.5 tonnes',
  ],
  partiallySupported: [
    'Mild-hybrid vehicles (routine services supported; HV system excluded)',
    'Full-hybrid vehicles (routine services supported; HV battery and inverter excluded)',
  ],
  notSupported: [
    'Battery Electric Vehicles (BEV) — powertrain, battery, and charging system work not performed. Tyre, brake, windshield, and cabin services can be done.',
    'Heavy commercial vehicles and trucks',
    'Two-wheelers (motorbikes, scooters)',
  ],
  brandsCovered: [
    'Maruti Suzuki', 'Hyundai', 'Tata Motors', 'Mahindra', 'Honda',
    'Toyota', 'Kia', 'MG Motor', 'Volkswagen', 'Skoda', 'Ford (legacy)',
    'Renault', 'Nissan', 'Jeep', 'Citroën',
  ],
  note: 'If your vehicle brand is not listed, call us — we may still be able to help.',
};

// ─── Policies ─────────────────────────────────────────────────────

export const POLICIES = {
  appointments: {
    summary: 'Appointments are strongly recommended. Walk-ins are accepted subject to bay availability.',
    advanceNotice: 'At least 1 business day recommended for routine services. Same-day slots are sometimes available — call to check.',
    cancellation: 'Cancel at least 4 hours before your slot to avoid a ₹200 late-cancellation fee.',
    rescheduling: 'Free rescheduling at any time, subject to availability.',
    noShow: 'No charge for a no-show, but the slot is forfeited and a new booking is required.',
    howToBook: 'Book through the AutoCare AI assistant, call us, or WhatsApp.',
  },
  warranty: {
    labour: '90 days or 3,000 km (whichever comes first) on labour performed by our technicians.',
    parts: 'As per the manufacturer warranty of the part — minimum 6 months on most components.',
    consumables: 'Oil, filters, and other consumables carry no warranty beyond the service itself.',
    voidConditions: 'Warranty is void if the vehicle is serviced by a third party for the same component within the warranty period.',
  },
  walkIns: {
    policy: 'Walk-ins are welcome but subject to bay availability. During busy periods (Mon–Fri mornings), wait times can exceed 2 hours.',
    recommendation: 'Booking an appointment ensures a definite slot and reduces waiting time.',
  },
  estimatesAndInvoices: {
    estimates: 'A cost estimate is provided before any work begins. Additional charges require verbal or written approval.',
    invoices: 'GST invoice provided for all services. Required for insurance claims.',
    insurance: 'We work with all major insurance providers for vehicle damage claims. Contact us for motor insurance claim assistance.',
  },
  dataAndPrivacy: {
    vehicleData: 'Vehicle details provided are used solely to service your vehicle and for service record-keeping.',
    retention: 'Service records are retained for 5 years.',
  },
};

// ─── Customer Facilities ──────────────────────────────────────────

export const FACILITIES = {
  waitingLounge: 'Air-conditioned customer lounge with seating for 20 people.',
  refreshments: 'Complimentary tea, coffee, and water available.',
  wifi: 'Free Wi-Fi available in the customer lounge (password provided at reception).',
  estimatedTime: 'An estimated completion time is provided at vehicle drop-off.',
  readyNotification: 'SMS and WhatsApp notification sent when vehicle is ready for pickup.',
  courtesyCar: 'We do not provide a courtesy car. Our receptionist can arrange a cab or auto-rickshaw via local partners on request.',
  reminders: 'Appointment reminder sent 24 hours in advance via WhatsApp.',
  paymentMethods: {
    accepted: ['Cash', 'UPI (Google Pay, PhonePe, Paytm, BHIM)', 'Debit card (Visa, Mastercard, RuPay)', 'Credit card (Visa, Mastercard)', 'Net banking'],
    emi: 'No-cost EMI available through HDFC Bank and ICICI Bank credit cards for invoices above ₹3,000.',
    advance: 'A 25% advance may be required for orders of imported or high-value parts.',
    note: 'Cheques are not accepted.',
  },
};
