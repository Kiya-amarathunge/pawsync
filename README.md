# PawSync

**A full-stack pet care management and service coordination platform.**

PawSync brings pet owners, veterinarians, pet service providers, and platform administrators into one system. It supports pet health management, provider discovery, appointment scheduling, telemedicine, realtime messaging, emergency assistance, community discussions, reviews, notifications, and administrative oversight.

[![Next.js](https://img.shields.io/badge/Next.js-16-111111?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-149eca?logo=react)](https://react.dev/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb)](https://www.mongodb.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org/)

## Project Overview

Pet care information is often spread across paper records, phone calls, messaging applications, and separate service platforms. PawSync provides a single workspace where owners can manage their pets and coordinate care with verified professionals.

The system was developed as an undergraduate software engineering project based on a formal Software Requirements Specification (SRS).

## User Roles

| Role | Main capabilities |
| --- | --- |
| Pet owner | Manage pets and health records, find providers, book services, message professionals, review appointments, and access emergency assistance |
| Veterinarian | Manage a professional profile, availability, patients, appointments, consultations, reviews, and earnings |
| Service provider | Offer grooming, training, sitting, or boarding services and manage bookings, clients, availability, and finances |
| Administrator | Verify providers, moderate content, resolve disputes, manage users, publish announcements, review analytics, and inspect audit/security information |

## Major Features

- Secure registration, email verification, password reset, JWT authentication, role-based authorization, and inactive-session expiry
- Pet profiles with weight, diet, vaccinations, medications, documents, charts, and controlled veterinarian sharing
- AES-256-GCM encrypted health records with search, version history, access restrictions, and PDF downloads
- Provider profiles with credentials, services, pricing, working hours, blocked dates, location, service radius, and favourites
- Provider discovery with filtering, distance calculation, reviews, directions, availability, and direct booking
- Appointment booking with availability validation, overlap detection, status transitions, rescheduling, cancellation, reminders, and history
- Telemedicine consultation rooms with realtime signalling, notes, records, and consultation completion
- Verified appointment reviews with ratings, photographs, provider responses, flagging, and moderation
- Realtime owner-provider messaging with presence, typing indicators, read receipts, attachments, and history search
- In-app and web-push notifications with user preferences, reminder categories, action links, and duplicate prevention
- Community forum with categories, replies, votes, follows, images, verified-vet responses, reporting, and participation metrics
- Emergency service discovery, distance ordering, directions, emergency contact logging, record-sharing consent, and urgent boarding
- Provider dashboards with scheduling, client management, service analytics, earnings, and downloadable financial reports
- Administration tools for verification, moderation, disputes/refunds, announcements, audit logs, security alerts, and role-restricted operations
- Responsive, low-motion interface for desktop and mobile use

## Technology Stack

| Area | Technology |
| --- | --- |
| Frontend | Next.js App Router, React, TypeScript, CSS, Lucide icons |
| Backend | Next.js Route Handlers and Proxy middleware |
| Database | MongoDB with Mongoose |
| Validation | Zod |
| Authentication | JSON Web Tokens and bcrypt |
| Realtime communication | Socket.IO |
| Charts and reports | Chart.js and PDFKit |
| Email and SMS | Nodemailer and Twilio |
| Browser notifications | Web Push and VAPID |
| Testing | Vitest and live HTTP integration tests |

## Project Structure

```text
app/
  (auth)/             Authentication pages
  (pet-owner)/        Pet owner workspace
  (provider)/         Veterinarian and provider workspace
  (admin)/            Administration workspace
  api/                API route handlers
components/           Shared interface components
context/              Authentication and toast providers
lib/                  Security, validation, notification, and domain helpers
models/               Mongoose database models
public/               Static assets and push service worker
scripts/              API integration test runner
```

## Getting Started

### Prerequisites

Install the following before running PawSync:

- [Node.js](https://nodejs.org/) 20 or newer
- npm
- A local MongoDB installation or [MongoDB Atlas](https://www.mongodb.com/atlas) database

### Installation

1. Clone the repository:

```bash
git clone https://github.com/Kiya-amarathunge/pawsync.git
cd pawsync
```

2. Install dependencies:

```bash
npm install
```

3. Create the local environment file:

```powershell
Copy-Item .env.example .env.local
```

On macOS or Linux, use:

```bash
cp .env.example .env.local
```

4. Replace the placeholder values in `.env.local` with your credentials.

5. Start the development server:

```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Purpose |
| --- | --- |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Signs access, refresh, verification, and password-reset tokens |
| `HEALTH_RECORD_ENCRYPTION_KEY` | Encrypts sensitive health-record data; do not change after storing records |
| `CRON_SECRET` | Protects the scheduled reminder endpoint |
| `NEXT_PUBLIC_APP_URL` | Public application address |
| `NEXT_PUBLIC_SIGNALING_URL` | Socket.IO signalling server address |
| `SIGNALING_PORT` | Local realtime server port |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Web-push configuration |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | Email delivery configuration |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` | SMS delivery configuration |

Use [.env.example](.env.example) as the template. Never commit `.env.local`; it is ignored by Git because it contains secrets.

Generate secure application secrets with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Generate VAPID keys with:

```bash
npm exec web-push -- generate-vapid-keys --json
```

## Testing

Run unit tests:

```bash
npm test
```

Run the live API integration suite while the development server and MongoDB are available:

```bash
npm run test:api
```

The API runner creates uniquely named temporary users and records, exercises cross-role workflows over HTTP, and removes its test records afterward.

Run code-quality and production checks:

```bash
npm run lint
npm run build
```

Current verification baseline:

- 5 unit tests passing
- 45 live API integration checks passing
- TypeScript compilation passing
- Production build passing across 82 application routes

## Security Highlights

- Passwords are hashed with bcrypt and never stored as plaintext.
- Protected APIs require signed bearer tokens and role checks.
- Health-record content is encrypted using authenticated AES-256-GCM encryption.
- Pet records are restricted to owners and explicitly authorized veterinarians.
- Upload routes validate file type and size and use private download handlers for sensitive files.
- Notification jobs use deduplication to avoid repeated alerts.
- User-generated content passes through validation, moderation, reporting, and administrative review workflows.
- Administrative operations are separated by administrator role and recorded through audit features.

## External Services

Email, SMS, and web-push delivery require valid SMTP, Twilio, and VAPID credentials. Twilio trial accounts may send messages only to verified recipients. Browser push requires notification permission and HTTPS in production; `localhost` is supported for development.

The current realtime implementation requires a persistent Node.js environment for Socket.IO. When deploying to a serverless platform, host the signalling service separately or use a platform that supports persistent Node processes.

## Author

Developed by [Kiya Amarathunge](https://github.com/Kiya-amarathunge) as an undergraduate software engineering project.

## Repository

[github.com/Kiya-amarathunge/pawsync](https://github.com/Kiya-amarathunge/pawsync)
