import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

process.loadEnvFile('.env.local');

const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
const runId = `codex-${Date.now()}`;
const password = 'ReviewTest!9284';
const results = [];
const ids = {};
let ownerToken = '';
let providerToken = '';
let adminToken = '';

function record(name, passed, detail) {
  results.push({ name, passed, detail });
  console.log(`${passed ? 'PASS' : 'FAIL'}  ${name}${detail ? ` - ${detail}` : ''}`);
}

async function request(name, path, { method = 'GET', token, body, expected = [200] } = {}) {
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    const text = await response.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text.slice(0, 160) }; }
    const passed = expected.includes(response.status);
    record(name, passed, `HTTP ${response.status}${passed ? '' : `: ${data.error || data.raw || 'unexpected response'}`}`);
    return { response, data, passed };
  } catch (error) {
    record(name, false, error instanceof Error ? error.message : String(error));
    return { response: null, data: {}, passed: false };
  }
}

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const hash = await bcrypt.hash(password, 12);
  const now = new Date();
  ids.owner = new mongoose.Types.ObjectId();
  ids.provider = new mongoose.Types.ObjectId();
  ids.admin = new mongoose.Types.ObjectId();
  const common = { password: hash, phoneNumber: '+94770000000', registrationDate: now, isVerified: true, isActive: true, isSuspended: false, favoriteProviders: [], notificationPreferences: { inApp: true, email: false, sms: false, push: false, appointmentReminders: true, healthReminders: true, messages: true, reviews: true, announcements: true } };
  await db.collection('users').insertMany([
    { _id: ids.owner, ...common, email: `${runId}-owner@example.test`, name: 'API Test Owner', role: 'pet_owner', verificationStatus: 'approved' },
    { _id: ids.provider, ...common, email: `${runId}-provider@example.test`, name: 'API Test Provider', role: 'service_provider', verificationStatus: 'approved' },
    { _id: ids.admin, ...common, email: `${runId}-admin@example.test`, name: 'API Test Admin', role: 'admin', adminRole: 'super_admin', verificationStatus: 'approved' },
  ]);
  const availability = Array.from({ length: 7 }, (_, dayOfWeek) => ({ dayOfWeek, startTime: '00:00', endTime: '23:59' }));
  await db.collection('serviceproviders').insertOne({ providerId: ids.provider, businessName: 'API Test Pet Care', businessRegistrationNumber: runId, serviceType: ['grooming', 'boarding', 'training'], credentials: 'Integration-test credential', specialization: 'Pet care', location: { address: 'Colombo', lat: 6.9271, lng: 79.8612 }, yearsOfExperience: 5, isVerified: true, verificationDocuments: [], availability, blockedDates: [], pricing: [{ service: 'grooming', price: 2500, duration: 60 }, { service: 'boarding', price: 4000, duration: 60 }], responseRate: 100, acceptanceRate: 100, businessDescription: 'Temporary integration-test provider', photos: [], serviceRadiusKm: 50 });
  ids.emergencyContact = new mongoose.Types.ObjectId();
  await db.collection('emergencycontacts').insertOne({ _id: ids.emergencyContact, name: 'API Test Emergency Clinic', address: 'Colombo', phone: '+94110000000', location: { lat: 6.9271, lng: 79.8612 }, is24Hours: true, specializations: ['emergency'], isVerified: true, isAvailable: true, availabilityUpdatedAt: now, linkedProviderId: ids.provider });
}

async function login(label, email) {
  const result = await request(`${label} login`, '/api/auth/login', { method: 'POST', body: { email, password } });
  return result.data.accessToken || '';
}

async function cleanup() {
  const db = mongoose.connection.db;
  if (!db) return;
  const userIds = [ids.owner, ids.provider, ids.admin].filter(Boolean);
  const collections = await db.listCollections().toArray();
  const names = new Set(collections.map(item => item.name));
  const deletions = {
    users: { _id: { $in: userIds } },
    serviceproviders: { providerId: ids.provider },
    pets: { ownerId: ids.owner },
    appointments: { $or: [{ ownerId: ids.owner }, { providerId: ids.provider }] },
    healthrecords: { ownerId: ids.owner },
    messages: { $or: [{ senderId: { $in: userIds } }, { receiverId: { $in: userIds } }] },
    notifications: { userId: { $in: userIds } },
    reviews: { $or: [{ ownerId: ids.owner }, { providerId: ids.provider }] },
    forumposts: { authorId: { $in: userIds } },
    emergencyevents: { ownerId: ids.owner },
    emergencycontacts: { _id: ids.emergencyContact },
    pushsubscriptions: { userId: { $in: userIds } },
  };
  for (const [name, filter] of Object.entries(deletions)) if (names.has(name)) await db.collection(name).deleteMany(filter);
  await mongoose.disconnect();
}

async function run() {
  await seed();
  const ownerEmail = `${runId}-owner@example.test`;
  const providerEmail = `${runId}-provider@example.test`;
  const adminEmail = `${runId}-admin@example.test`;

  await request('Public emergency resources', '/api/emergency/resources');
  await request('Public forum resources', '/api/forum/resources');
  await request('Public provider directory', '/api/providers');
  await request('Protected route rejects anonymous request', '/api/pets', { expected: [401] });

  ownerToken = await login('Owner', ownerEmail);
  providerToken = await login('Provider', providerEmail);
  adminToken = await login('Admin', adminEmail);

  const petResult = await request('Create pet', '/api/pets', { method: 'POST', token: ownerToken, expected: [201], body: { name: 'Integration Pet', species: 'Dog', breed: 'Mixed', birthDate: '2022-05-10', weight: 14.5, dietaryInfo: 'Balanced diet' } });
  ids.pet = petResult.data.pet?._id;
  await request('List owner pets', '/api/pets', { token: ownerToken });
  await request('Provider cannot list owner pets', '/api/pets', { token: providerToken, expected: [403] });

  const healthResult = await request('Create encrypted health record', '/api/health-records', { method: 'POST', token: ownerToken, expected: [201], body: { petId: ids.pet, diagnosis: 'Routine integration check', treatment: 'Observation', prescriptions: ['None'], medicationSchedule: [] } });
  ids.healthRecord = healthResult.data.record?._id;
  await request('Read and decrypt health record', `/api/health-records?petId=${ids.pet}`, { token: ownerToken });

  await request('Read provider profile', '/api/provider/profile', { token: providerToken });
  await request('Update provider profile', '/api/provider/profile', { method: 'PUT', token: providerToken, body: { businessDescription: 'Updated by automated API integration testing', serviceRadiusKm: 40 } });

  const appointmentDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  appointmentDate.setHours(10, 0, 0, 0);
  const bookingResult = await request('Create appointment', '/api/appointments', { method: 'POST', token: ownerToken, expected: [201], body: { petId: ids.pet, providerId: String(ids.provider), serviceType: 'grooming', dateTime: appointmentDate.toISOString(), notes: 'API integration booking' } });
  ids.appointment = bookingResult.data.appointment?._id;
  await request('Owner lists appointments', '/api/appointments', { token: ownerToken });
  await request('Provider lists appointments', '/api/appointments', { token: providerToken });
  await request('Provider confirms appointment', `/api/appointments/${ids.appointment}/status`, { method: 'PATCH', token: providerToken, body: { status: 'confirmed' } });
  await request('Provider completes appointment', `/api/appointments/${ids.appointment}/status`, { method: 'PATCH', token: providerToken, body: { status: 'completed' } });

  const reviewResult = await request('Owner submits verified review', '/api/reviews', { method: 'POST', token: ownerToken, expected: [201], body: { appointmentId: ids.appointment, rating: 5, comment: 'The provider delivered a professional and attentive service during this completed appointment.' } });
  ids.review = reviewResult.data.review?._id;
  await request('Provider responds to review', `/api/reviews/${ids.review}/respond`, { method: 'PATCH', token: providerToken, body: { response: 'Thank you for sharing your experience with our care team.' } });
  await request('List provider reviews', `/api/reviews?providerId=${ids.provider}`);

  const messageResult = await request('Owner sends provider message', '/api/messages', { method: 'POST', token: ownerToken, expected: [201], body: { receiverId: String(ids.provider), content: 'Hello, this is an API integration test message.' } });
  ids.message = messageResult.data.data?._id;
  await request('Provider lists conversations', '/api/messages', { token: providerToken });
  await request('Provider reads conversation', `/api/messages/${ids.owner}`, { token: providerToken });
  await request('Owner-to-owner messaging is rejected', '/api/messages', { method: 'POST', token: ownerToken, expected: [404], body: { receiverId: String(ids.owner), content: 'This should not be accepted.' } });

  const postResult = await request('Create forum post', '/api/forum/posts', { method: 'POST', token: ownerToken, expected: [201], body: { category: 'general', title: 'Integration testing pet care question', content: 'What routine steps help owners prepare a pet for a scheduled grooming visit?' } });
  ids.post = postResult.data.post?._id;
  await request('Reply to forum post', `/api/forum/posts/${ids.post}/replies`, { method: 'POST', token: ownerToken, expected: [201], body: { content: 'Bring vaccination information and mention any handling concerns.' } });
  await request('Follow forum post', `/api/forum/posts/${ids.post}/follow`, { method: 'PATCH', token: ownerToken });
  await request('List forum posts', '/api/forum/posts?sort=recent', { token: ownerToken });
  await request('Forum participation metrics', '/api/forum/participation', { token: ownerToken });

  await request('List notifications', '/api/notifications', { token: ownerToken });
  await request('Read notification preferences', '/api/notifications/preferences', { token: ownerToken });
  await request('Update notification preferences', '/api/notifications/preferences', { method: 'PUT', token: ownerToken, body: { inApp: true, email: false, sms: false, push: false, appointmentReminders: true, healthReminders: true, messages: true, reviews: true, announcements: true } });

  await request('Find nearby emergency services', '/api/emergency/services?lat=6.9271&lng=79.8612');
  await request('Emergency contact event', '/api/emergency/contact', { method: 'POST', token: ownerToken, body: { clinicId: String(ids.emergencyContact), petId: ids.pet, reason: 'Automated emergency workflow check', shareRecords: true } });

  await request('Admin dashboard', '/api/admin/dashboard', { token: adminToken });
  await request('Admin analytics', '/api/admin/analytics', { token: adminToken });
  await request('Admin user management list', '/api/admin/users', { token: adminToken });
  await request('Admin verification queue', '/api/admin/verifications', { token: adminToken });
  await request('Admin disputes list', '/api/admin/disputes', { token: adminToken });
  await request('Admin audit logs', '/api/admin/audit-logs', { token: adminToken });
  await request('Admin security alerts', '/api/admin/security/alerts', { token: adminToken });
  await request('Non-admin blocked from admin API', '/api/admin/dashboard', { token: ownerToken, expected: [403] });
  await request('Cron rejects missing secret', '/api/cron', { expected: [401] });
}

try {
  await run();
} catch (error) {
  record('Integration runner', false, error instanceof Error ? error.stack || error.message : String(error));
} finally {
  await cleanup();
  const passed = results.filter(item => item.passed).length;
  const failed = results.length - passed;
  console.log(`\nSUMMARY ${passed}/${results.length} passed, ${failed} failed`);
  if (failed) process.exitCode = 1;
}
