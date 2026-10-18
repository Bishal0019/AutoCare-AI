/**
 * AutoCare Service Centre — Frequently Asked Questions
 *
 * Each FAQ has a unique id, category, searchable tags, a canonical question,
 * and a fully self-contained answer the AI can deliver verbatim or paraphrase.
 *
 * Categories:
 *   hours | location | booking | services | pricing | vehicles |
 *   payment | warranty | facilities | policies
 *
 * Tags are used for lightweight keyword matching during context retrieval
 * (Phase 3 RAG). Keep them lowercase and space-separated.
 *
 * IMPORTANT: Answers must only state facts present in business.js.
 * Do not add information here that is not defined there.
 */

export const FAQS = [
  // ── Hours & Availability ───────────────────────────────────────

  {
    id: 'faq-001',
    category: 'hours',
    tags: ['hours', 'opening', 'closing', 'timing', 'when', 'open', 'time', 'schedule'],
    question: 'What are your opening hours?',
    answer:
      'We are open Monday to Saturday from 8:00 AM to 7:00 PM. ' +
      'On Sundays we are open from 9:00 AM to 2:00 PM for drop-off and pickup only — no servicing begins on Sundays. ' +
      'We are closed on all national public holidays. ' +
      'Please note that we accept the last vehicle 1 hour before closing time.',
  },

  {
    id: 'faq-002',
    category: 'hours',
    tags: ['sunday', 'weekend', 'sunday hours', 'open sunday'],
    question: 'Are you open on Sundays?',
    answer:
      'Yes, we are open on Sundays from 9:00 AM to 2:00 PM, but only for vehicle drop-off and pickup. ' +
      'We do not begin new service work on Sundays. If you need your car serviced and ready on Sunday, ' +
      'please drop it off on Saturday.',
  },

  {
    id: 'faq-003',
    category: 'hours',
    tags: ['holiday', 'public holiday', 'closed', 'national holiday', 'festival'],
    question: 'Are you open on public holidays?',
    answer:
      'We are closed on all national public holidays. ' +
      'If you are unsure whether a specific date is a holiday, please call us at +91 20 2634 5678 or WhatsApp us at +91 98765 43210 to confirm.',
  },

  // ── Location & Contact ─────────────────────────────────────────

  {
    id: 'faq-004',
    category: 'location',
    tags: ['location', 'address', 'where', 'find', 'directions', 'navigate', 'map', 'how to reach'],
    question: 'Where is AutoCare Service Centre located?',
    answer:
      'We are located at 14, Orbit Complex, Koregaon Park, Pune – 411001, Maharashtra. ' +
      'The landmark is opposite Koregaon Park Police Station, near MG Road Metro Station. ' +
      'From MG Road, turn right at the Koregaon Park Police Chowk — we are 200 m ahead on the left, inside Orbit Complex. ' +
      'Free customer parking is available on the premises.',
  },

  {
    id: 'faq-005',
    category: 'location',
    tags: ['contact', 'phone', 'call', 'email', 'whatsapp', 'reach', 'number'],
    question: 'How can I contact you?',
    answer:
      'You can reach us by:\n' +
      '• Phone: +91 20 2634 5678 (during opening hours)\n' +
      '• WhatsApp: +91 98765 43210 (fastest for quick queries)\n' +
      '• Email: support@autocarecentre.in\n' +
      '• Booking queries: booking@autocarecentre.in\n' +
      'WhatsApp is the fastest way to get a response.',
  },

  // ── Booking & Appointments ─────────────────────────────────────

  {
    id: 'faq-006',
    category: 'booking',
    tags: ['book', 'appointment', 'schedule', 'booking', 'reserve', 'slot', 'how to book'],
    question: 'How do I book an appointment?',
    answer:
      'You can book an appointment in three ways:\n' +
      '1. Through this AutoCare AI assistant — just tell me the service you need and your preferred date and time.\n' +
      '2. By calling us at +91 20 2634 5678 during opening hours.\n' +
      '3. By WhatsApp at +91 98765 43210.\n' +
      'We recommend booking at least 1 business day in advance for routine services. ' +
      'Same-day slots are sometimes available — call us to check.',
  },

  {
    id: 'faq-007',
    category: 'booking',
    tags: ['walk in', 'walk-in', 'without appointment', 'no booking', 'just come'],
    question: 'Can I walk in without an appointment?',
    answer:
      'Yes, walk-ins are welcome, but they are subject to bay availability. ' +
      'During busy periods — typically Monday to Friday mornings — wait times for walk-ins can exceed 2 hours. ' +
      'Booking an appointment guarantees your slot and reduces waiting time. ' +
      'We strongly recommend booking in advance, especially for services that take more than 1 hour.',
  },

  {
    id: 'faq-008',
    category: 'booking',
    tags: ['cancel', 'cancellation', 'reschedule', 'change appointment', 'postpone', 'cancel booking'],
    question: 'How do I cancel or reschedule my appointment?',
    answer:
      'To cancel: please give us at least 4 hours notice before your appointment slot to avoid a ₹200 late-cancellation fee. ' +
      'You can cancel by calling +91 20 2634 5678, WhatsApp, or through this assistant.\n\n' +
      'To reschedule: rescheduling is free at any time, subject to availability. ' +
      'Contact us by phone, WhatsApp, or use this assistant to pick a new slot.\n\n' +
      'If you miss your appointment without notice, no fee is charged, but the slot is forfeited and you will need to rebook.',
  },

  // ── Services ───────────────────────────────────────────────────

  {
    id: 'faq-009',
    category: 'services',
    tags: ['services', 'what services', 'list', 'available', 'offer', 'do you do', 'types of service'],
    question: 'What services do you offer?',
    answer:
      'We offer a wide range of vehicle services, including:\n' +
      '• Oil & filter change (mineral, semi-synthetic, full synthetic)\n' +
      '• Tyre rotation, balancing, and wheel alignment\n' +
      '• Brake inspection, pad replacement, and disc service\n' +
      '• Air conditioning (AC) check, regassing, and compressor service\n' +
      '• Battery health check and replacement\n' +
      '• Engine tune-up, spark plugs, and air filter replacement\n' +
      '• Coolant flush and cooling system service\n' +
      '• 50-point vehicle inspection (free with any service)\n' +
      '• Windshield chip repair and full replacement\n' +
      '• Wiper blade replacement\n' +
      '• Suspension and steering inspection and repair\n' +
      '• Annual maintenance packages (Compact, Standard, Premium)\n\n' +
      'For a full list with pricing, ask me about a specific service.',
  },

  {
    id: 'faq-010',
    category: 'services',
    tags: ['oil change', 'oil service', 'engine oil', 'how long oil change', 'oil'],
    question: 'How long does an oil change take?',
    answer:
      'An oil and filter change typically takes 30 to 45 minutes. ' +
      'If you have an appointment, we aim to have your vehicle ready within that window. ' +
      'Walk-ins may wait longer depending on how busy the workshop is. ' +
      'You are welcome to wait in our air-conditioned lounge with complimentary tea or coffee.',
  },

  {
    id: 'faq-011',
    category: 'services',
    tags: ['inspection', 'vehicle check', 'multi-point', '50 point', 'general check', 'full check'],
    question: 'What is included in the 50-point vehicle inspection?',
    answer:
      'Our 50-point inspection covers:\n' +
      '• Engine: oil level, coolant, belts, air filter, spark plugs, fluid leaks\n' +
      '• Brakes: pad thickness, disc condition, brake fluid level\n' +
      '• Tyres: tread depth, pressure, sidewall condition, spare tyre\n' +
      '• Suspension: shock absorbers, springs, tie rods, ball joints\n' +
      '• Electrical: battery health, lights (headlights, indicators, brake lights), horn\n' +
      '• AC: cooling performance, cabin filter\n' +
      '• Body & Safety: wipers, seat belts, mirrors, windshield, door seals\n' +
      '• Fluids: power steering, washer fluid, gearbox oil (visual)\n\n' +
      'A written report is provided after the inspection. ' +
      'The inspection is free when booked with any service, or ₹1,500 as a standalone booking.',
  },

  // ── Pricing ────────────────────────────────────────────────────

  {
    id: 'faq-012',
    category: 'pricing',
    tags: ['price', 'cost', 'how much', 'rate', 'charges', 'fee', 'expensive', 'cheap'],
    question: 'How much does a service cost?',
    answer:
      'Pricing varies by service type and your vehicle. Here are some common prices:\n' +
      '• Oil & filter change labour: ₹800–₹1,800 (oil cost extra, typically ₹400–₹3,500)\n' +
      '• Tyre rotation & balancing: ₹600–₹800 for 4 tyres\n' +
      '• Wheel alignment: ₹800 (2-wheel) or ₹1,200 (4-wheel)\n' +
      '• AC check & regassing: ₹1,800–₹3,200\n' +
      '• Battery replacement: ₹3,500–₹9,000 including the battery\n' +
      '• Brake pad replacement: ₹2,500–₹5,000 per axle including parts\n' +
      '• 50-point inspection: ₹1,500 standalone (free with any service)\n\n' +
      'A cost estimate is always provided before any work begins. ' +
      'We never start additional work without your approval.',
  },

  {
    id: 'faq-013',
    category: 'pricing',
    tags: ['annual package', 'maintenance package', 'amc', 'yearly package', 'package deal'],
    question: 'Do you offer any service packages or AMC plans?',
    answer:
      'Yes, we offer three annual maintenance packages:\n\n' +
      '• Compact Care (₹5,999 / 12 months or 20,000 km): 2× oil changes, 2× inspections, 1× tyre rotation.\n\n' +
      '• Standard Care (₹9,999 / 12 months or 30,000 km): Everything in Compact plus AC service, brake inspection, battery check, and wheel alignment. Saves approximately ₹2,500 vs. individual bookings.\n\n' +
      '• Premium Care (₹14,999 / 12 months or 40,000 km): Everything in Standard plus a semi-synthetic oil change, cabin and engine air filter replacements, and one additional service of your choice up to ₹2,000 value. Saves approximately ₹5,000.\n\n' +
      'Ask me which package suits your vehicle and driving pattern.',
  },

  // ── Vehicles ───────────────────────────────────────────────────

  {
    id: 'faq-014',
    category: 'vehicles',
    tags: ['brands', 'make', 'model', 'which cars', 'maruti', 'hyundai', 'tata', 'honda', 'toyota', 'supported vehicles'],
    question: 'Which car brands or makes do you service?',
    answer:
      'We service all major passenger car brands sold in India, including:\n' +
      'Maruti Suzuki, Hyundai, Tata Motors, Mahindra, Honda, Toyota, Kia, MG Motor, ' +
      'Volkswagen, Skoda, Ford (legacy vehicles), Renault, Nissan, Jeep, and Citroën.\n\n' +
      'If your brand is not on this list, please call us — we may still be able to help. ' +
      'We service petrol, diesel, and factory-fitted CNG vehicles.',
  },

  {
    id: 'faq-015',
    category: 'vehicles',
    tags: ['electric', 'ev', 'electric vehicle', 'hybrid', 'cng', 'ev service'],
    question: 'Do you service electric or hybrid vehicles?',
    answer:
      'For hybrid vehicles (mild and full hybrids): we can perform all routine services — oil changes, tyre work, brake service, AC, battery check, etc. ' +
      'We do not work on the high-voltage (HV) system or traction battery; those must go to an authorised dealer.\n\n' +
      'For Battery Electric Vehicles (BEVs): we can perform tyre, brake, windshield, wiper, and cabin AC services. ' +
      'We do not work on the EV powertrain, drive battery, or charging system.\n\n' +
      'For CNG vehicles (factory-fitted): fully supported for all routine services.',
  },

  // ── Payment ────────────────────────────────────────────────────

  {
    id: 'faq-016',
    category: 'payment',
    tags: ['payment', 'pay', 'upi', 'cash', 'card', 'credit card', 'emi', 'paytm', 'gpay', 'how to pay'],
    question: 'What payment methods do you accept?',
    answer:
      'We accept the following payment methods:\n' +
      '• Cash\n' +
      '• UPI: Google Pay, PhonePe, Paytm, BHIM\n' +
      '• Debit card: Visa, Mastercard, RuPay\n' +
      '• Credit card: Visa, Mastercard\n' +
      '• Net banking\n' +
      '• No-cost EMI: Available through HDFC Bank and ICICI Bank credit cards for invoices above ₹3,000\n\n' +
      'We do not accept cheques. ' +
      'A GST invoice is provided for all services, which is valid for insurance claims.',
  },

  // ── Warranty & Guarantee ───────────────────────────────────────

  {
    id: 'faq-017',
    category: 'warranty',
    tags: ['warranty', 'guarantee', 'parts warranty', 'labour warranty', 'defect', 'problem after service'],
    question: 'Do you offer a warranty on repairs?',
    answer:
      'Yes. All our services come with:\n' +
      '• Labour warranty: 90 days or 3,000 km (whichever comes first) on work performed by our technicians.\n' +
      '• Parts warranty: As per the manufacturer warranty of the fitted part — minimum 6 months on most components.\n' +
      '• Consumables (engine oil, filters, refrigerant): Carry no warranty beyond the service itself, which is standard industry practice.\n\n' +
      'The warranty is void if the same component is worked on by a third party during the warranty period. ' +
      'If you experience any issue after a service, contact us immediately — we will investigate at no charge.',
  },

  // ── Facilities ─────────────────────────────────────────────────

  {
    id: 'faq-018',
    category: 'facilities',
    tags: ['wait', 'waiting', 'lounge', 'facility', 'sit', 'while car serviced', 'waiting room'],
    question: 'Can I wait while my car is being serviced?',
    answer:
      'Yes, you are welcome to wait in our air-conditioned customer lounge, which seats up to 20 people. ' +
      'We provide complimentary tea, coffee, and water, along with free Wi-Fi. ' +
      'An estimated completion time will be given at drop-off so you can plan accordingly. ' +
      'You will receive a WhatsApp and SMS notification as soon as your vehicle is ready.',
  },

  {
    id: 'faq-019',
    category: 'facilities',
    tags: ['courtesy car', 'replacement car', 'loan car', 'transport', 'drop', 'cab', 'loaner'],
    question: 'Do you provide a courtesy car while my vehicle is being serviced?',
    answer:
      'We do not provide a courtesy car. ' +
      'However, our reception team can help arrange a cab or auto-rickshaw through local partners if you need transportation while your vehicle is with us. ' +
      'Please let the reception know at drop-off if you need this assistance.',
  },

  {
    id: 'faq-020',
    category: 'facilities',
    tags: ['ready', 'notification', 'pickup', 'collect', 'car ready', 'when done', 'status'],
    question: 'How will I know when my car is ready?',
    answer:
      'We will send you a WhatsApp message and an SMS notification as soon as your vehicle is ready for pickup. ' +
      'An estimated completion time is always provided at drop-off. ' +
      'If there are any unexpected delays or if additional work is recommended, we will contact you before proceeding.',
  },
];
