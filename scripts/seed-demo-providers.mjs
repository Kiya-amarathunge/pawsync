import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

process.loadEnvFile('.env.local');

if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not configured in .env.local');

const password = 'DemoProvider!2026';
const availability = [
  { dayOfWeek: 0, startTime: '09:00', endTime: '16:00' },
  { dayOfWeek: 1, startTime: '08:00', endTime: '18:00' },
  { dayOfWeek: 2, startTime: '08:00', endTime: '18:00' },
  { dayOfWeek: 3, startTime: '08:00', endTime: '18:00' },
  { dayOfWeek: 4, startTime: '08:00', endTime: '18:00' },
  { dayOfWeek: 5, startTime: '08:00', endTime: '18:00' },
  { dayOfWeek: 6, startTime: '09:00', endTime: '16:00' },
];

const providers = [
  {
    email: 'demo.vet@pawsync.local', name: 'Dr. Nadeesha Perera', phoneNumber: '+94112640001', role: 'veterinarian',
    profile: { licenseNumber: 'SLVC-DEMO-1001', businessRegistrationNumber: 'PV-DEMO-1001', specialization: 'Small animal medicine and preventive care', credentials: 'BVSc, Companion Animal Practice', yearsOfExperience: 9, location: { address: 'Ward Place, Colombo 07', lat: 6.9147, lng: 79.8634 }, pricing: [{ service: 'veterinary', price: 3500, duration: 45 }], businessDescription: 'General veterinary appointments, preventive care, vaccination guidance, and in-person follow-up care.', serviceRadiusKm: 25 },
  },
  {
    email: 'demo.grooming@pawsync.local', name: 'Amaya Fernando', phoneNumber: '+94112640002', role: 'service_provider',
    profile: { businessName: 'Polished Paws Grooming Studio', businessRegistrationNumber: 'PV-DEMO-2001', serviceType: ['grooming'], specialization: 'Breed-sensitive grooming and coat care', credentials: 'Certified Professional Pet Groomer', yearsOfExperience: 6, location: { address: 'Havelock Road, Colombo 05', lat: 6.8917, lng: 79.8652 }, pricing: [{ service: 'grooming', price: 2800, duration: 60 }], businessDescription: 'Calm, appointment-based grooming for dogs and cats, including bathing, coat trimming, nail care, and ear cleaning.', serviceRadiusKm: 20 },
  },
  {
    email: 'demo.training@pawsync.local', name: 'Kasun Jayawardena', phoneNumber: '+94112640003', role: 'service_provider',
    profile: { businessName: 'Good Companion Training', businessRegistrationNumber: 'PV-DEMO-2002', serviceType: ['training'], specialization: 'Positive reinforcement and puppy behaviour', credentials: 'Certified Dog Behaviour and Training Practitioner', yearsOfExperience: 8, location: { address: 'Nawala Road, Rajagiriya', lat: 6.9039, lng: 79.8941 }, pricing: [{ service: 'training', price: 4500, duration: 90 }], businessDescription: 'Practical home and outdoor training sessions focused on communication, socialisation, confidence, and everyday manners.', serviceRadiusKm: 35 },
  },
  {
    email: 'demo.boarding@pawsync.local', name: 'Rivini Silva', phoneNumber: '+94112640004', role: 'service_provider',
    profile: { businessName: 'SafeStay Pet Boarding', businessRegistrationNumber: 'PV-DEMO-2003', serviceType: ['boarding'], specialization: 'Supervised boarding and senior pet support', credentials: 'Pet First Aid and Boarding Operations Certificate', yearsOfExperience: 7, location: { address: 'Battaramulla', lat: 6.9022, lng: 79.9182 }, pricing: [{ service: 'boarding', price: 5000, duration: 60 }], businessDescription: 'Clean supervised boarding with individual feeding plans, daily activity, medication support, and owner updates.', serviceRadiusKm: 30 },
  },
  {
    email: 'demo.multicare@pawsync.local', name: 'Tharindu Wijesinghe', phoneNumber: '+94112640005', role: 'service_provider',
    profile: { businessName: 'Urban Tails Pet Care', businessRegistrationNumber: 'PV-DEMO-2004', serviceType: ['grooming', 'training', 'boarding'], specialization: 'Complete care for busy pet owners', credentials: 'Pet Care Management and Animal Handling Certificate', yearsOfExperience: 10, location: { address: 'Dehiwala', lat: 6.8511, lng: 79.8651 }, pricing: [{ service: 'grooming', price: 2500, duration: 60 }, { service: 'training', price: 3800, duration: 75 }, { service: 'boarding', price: 4500, duration: 60 }], businessDescription: 'A multi-service pet care centre offering grooming, behaviour training, and short or extended boarding.', serviceRadiusKm: 40 },
  },
];

await mongoose.connect(process.env.MONGODB_URI);
const db = mongoose.connection.db;
const passwordHash = await bcrypt.hash(password, 12);

for (const provider of providers) {
  const existing = await db.collection('users').findOne({ email: provider.email });
  const userId = existing?._id || new mongoose.Types.ObjectId();
  await db.collection('users').updateOne(
    { email: provider.email },
    { $set: { name: provider.name, phoneNumber: provider.phoneNumber, role: provider.role, isVerified: true, isActive: true, isSuspended: false, verificationStatus: 'approved', notificationPreferences: { inApp: true, email: false, sms: false, push: false, appointmentReminders: true, healthReminders: true, messages: true, reviews: true, announcements: true } }, $setOnInsert: { _id: userId, password: passwordHash, registrationDate: new Date(), favoriteProviders: [] } },
    { upsert: true }
  );

  const baseProfile = { ...provider.profile, isVerified: true, verificationDocuments: [], availability, blockedDates: [], photos: [] };
  if (provider.role === 'veterinarian') {
    await db.collection('veterinarians').updateOne({ vetId: userId }, { $set: { ...baseProfile, vetId: userId } }, { upsert: true });
  } else {
    await db.collection('serviceproviders').updateOne({ providerId: userId }, { $set: { ...baseProfile, providerId: userId, responseRate: 100, acceptanceRate: 100 } }, { upsert: true });
  }
  console.log(`Seeded ${provider.profile.businessName || provider.name} (${provider.email})`);
}

await mongoose.disconnect();
console.log(`\n${providers.length} verified demo providers are ready. Shared demo password: ${password}`);
