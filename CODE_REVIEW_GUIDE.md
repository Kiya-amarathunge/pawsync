# PawSync Code Review Guide

This guide is a revision aid for explaining PawSync during an undergraduate
code review. Answers are intentionally concise so they can be explained in
your own words instead of memorized as a script.

## Quick Architecture Summary

PawSync is a full-stack Next.js application using the App Router. React client
pages provide the interface, Next.js Route Handlers under `app/api` provide
the backend API, Mongoose connects the application to MongoDB, and shared
business logic is stored in `lib`. Authentication uses signed JSON Web Tokens
(JWTs), passwords are hashed with bcrypt, and Zod validates request data.

A typical request follows this path:

1. A React page sends an HTTP request with a bearer access token.
2. The API route verifies the token and required role.
3. Zod or route-level checks validate the input.
4. Mongoose reads or updates MongoDB.
5. The API returns JSON and an appropriate HTTP status.
6. The page updates its state and displays a toast message.

## Predicted Questions And Answers

### 1. What problem does PawSync solve?

PawSync combines pet profiles, health records, provider discovery,
appointments, messaging, reviews, emergency information, and administration
in one system. It reduces reliance on separate paper records, calls, and
messaging applications.

### 2. Why did you use Next.js?

Next.js supports both React pages and backend Route Handlers in one TypeScript
project. This reduced setup complexity and allowed frontend and backend code
to share models, types, validation, and utility functions.

### 3. What is the difference between a page and an API route?

A page renders the user interface. An API route handles HTTP requests and
performs backend work such as authentication, validation, and database
operations. Pages are under route groups such as `(pet-owner)`, while backend
handlers are under `app/api`.

### 4. Why are folders placed inside parentheses?

Next.js route groups organize files without adding the group name to the URL.
For example, `app/(provider)/provider/appointments/page.tsx` produces
`/provider/appointments`, not `/(provider)/provider/appointments`.

### 5. Why did you use TypeScript?

TypeScript detects incorrect data shapes and invalid property access before
runtime. Interfaces also document expected objects such as users,
appointments, messages, and API responses.

### 6. Why did you use MongoDB?

The project contains document-oriented data with nested arrays, such as pet
vaccinations, medication schedules, availability, and weight history. MongoDB
and Mongoose model these structures naturally while still supporting indexes,
references, and validation.

### 7. What does Mongoose do?

Mongoose defines schemas and models for MongoDB. It validates stored fields,
casts IDs and dates, provides query methods, supports population of referenced
documents, and allows indexes to be declared in code.

### 8. What is `populate`?

MongoDB records often store another record's ObjectId. Mongoose `populate`
replaces that ID with selected fields from the referenced document. For
example, an appointment can return the provider's name instead of only the
provider ID.

### 9. How are passwords protected?

The `User` model hashes passwords with bcrypt before saving. Login compares
the supplied password against the hash. Plaintext passwords are never stored
in MongoDB.

### 10. How does authentication work?

Successful login returns a short-lived signed access token. The browser sends
it in the `Authorization: Bearer` header. API routes verify the signature and
read the user's ID and role from the token.

### 11. Why use both access and refresh tokens?

Access tokens are short-lived to limit the impact of token exposure. A refresh
token can issue a new access token for an active session. PawSync also checks
that the refresh token belongs to the same per-tab session.

### 12. Why is session data stored in `sessionStorage`?

`sessionStorage` is isolated per browser tab. This lets an evaluator keep a
pet owner, provider, and administrator logged in simultaneously without one
tab overwriting another tab's role.

### 13. How is role-based access controlled?

The token contains the user's role. API handlers check allowed roles before
accessing data, and `DashboardLayout` prevents a mismatched role from
rendering another role's pages. Backend checks remain authoritative because
frontend checks alone can be bypassed.

### 14. What is Zod used for?

Zod validates untrusted request bodies before they reach database operations.
It checks requirements such as valid email addresses, password rules, string
lengths, allowed enum values, dates, and numeric ranges.

### 15. Why return different HTTP status codes?

Status codes communicate the result clearly: `201` for creation, `400` for
invalid input, `401` for missing authentication, `403` for forbidden access,
`404` for missing records, `409` for conflicts, and `500` for unexpected
server failures.

### 16. How do you prevent appointment overlaps?

The system calculates the candidate and existing appointment end times.
Intervals overlap when each starts before the other ends. Boundary-touching
appointments are allowed, so one appointment may begin exactly when another
one ends.

### 17. How do you validate provider availability?

The selected date must match a configured working day, must not be blocked,
and the entire appointment duration must fit between the provider's start and
end times.

### 18. How does rescheduling work?

An owner reschedule returns the appointment to pending provider confirmation.
A provider proposal uses the rescheduled state until the owner accepts the new
time. After acceptance it becomes confirmed and can later be marked complete.

### 19. How are health records protected?

Sensitive clinical fields are encrypted with AES-256-GCM before storage.
AES-GCM provides confidentiality and authentication, meaning modified
ciphertext is rejected during decryption.

### 20. Why must the health encryption key remain stable?

Existing encrypted records require the same key for decryption. Replacing the
key without a migration would make previously stored records unreadable.

### 21. How is health-record access restricted?

Owners access their own pets' records. A veterinarian only gains access when
the owner explicitly shares the pet record. API queries include ownership or
sharing conditions, so knowing a record ID is insufficient.

### 22. How does provider verification work?

Veterinarians and service providers register inactive accounts with
professional profile information. An administrator reviews the application
and activates it. Only active, approved, non-suspended providers appear in the
pet-owner directory.

### 23. How does messaging work?

Messages are stored in MongoDB and delivered through HTTP APIs. Socket.IO adds
realtime events such as new messages, typing state, presence, and read
receipts. Stored messages remain available when the realtime server is not
connected.

### 24. How does message search work?

The search API only queries messages where the logged-in user is the sender or
receiver. It performs a case-insensitive text match and returns the other
participant's stable ID so the correct conversation can be opened.

### 25. How are reviews verified?

A pet owner can review only an appointment they own that has reached completed
status. The appointment ID is unique in the review collection, preventing
multiple reviews for the same appointment.

### 26. What happens when a review is reported?

The provider can report only a review associated with that provider. The
review is flagged with a reason and appears in administrator moderation.
Administrators can dismiss the report, warn the author, or remove the review.

### 27. How do disputes work?

An owner or provider opens a dispute connected to one of their appointments.
The dispute stores its submitter, category, description, status, appointment,
and both parties. An administrator can mediate, dismiss, cancel, or approve a
refund, after which both parties receive notifications.

### 28. How does content moderation work?

Basic rules normalize text and detect blocked phrases, excessive links, and
repetitive spam. User reports provide a second moderation path. This is a
rule-based undergraduate implementation rather than a production machine
learning moderation service.

### 29. What tests are included?

Vitest unit tests cover scheduling boundaries and authenticated encryption.
The project also contains an HTTP integration script for multi-role API
workflows. TypeScript, ESLint, and the production build provide additional
static and compilation checks.

### 30. Why test tampered encrypted data?

Encryption should not only hide plaintext; it must also detect modification.
The tampering test proves AES-GCM rejects changed ciphertext instead of
returning unreliable clinical information.

### 31. What are indexes and why are they used?

Indexes improve common queries, such as appointments by provider and status,
messages by participants, pets by owner, and disputes by status. Unique
indexes also enforce rules such as one user per email.

### 32. How do you prevent users from changing another user's data?

Database queries combine the requested record ID with the authenticated user
ID. For example, updating a pet uses both `_id` and `ownerId`. A record that
does not belong to the user is therefore not returned for modification.

### 33. Why are environment variables used?

Credentials and secrets vary between machines and must not be committed to
source control. MongoDB, JWT, encryption, SMTP, Twilio, VAPID, and cron
configuration are loaded from `.env.local`.

### 34. What would you improve for production?

Possible improvements include automated end-to-end browser tests, cloud file
storage, rate limiting, stronger moderation, centralized logging, database
transactions for multi-document operations, refresh-token rotation, payment
gateway integration, and deployment monitoring.

### 35. What was a significant technical challenge?

One challenge was coordinating appointment states across two roles. Provider
reschedule proposals must wait for owner approval, while owner changes must
return to provider confirmation. The final design validates every transition
on the server to prevent invalid or unauthorized state changes.

## Useful Files To Explain

- `context/AuthContext.tsx`: login state, per-tab sessions, refresh, and logout.
- `lib/jwt.ts`: token signing and verification.
- `lib/request-auth.ts`: extracting authenticated users from requests.
- `lib/appointments.ts`: overlap and availability calculations.
- `lib/health-encryption.ts`: AES-GCM health-record protection.
- `lib/content-moderation.ts`: rule-based moderation.
- `models/User.ts`: roles, password hashing, and account status.
- `models/Appointment.ts`: appointment lifecycle data.
- `app/api/appointments/route.ts`: booking validation and creation.
- `app/api/disputes/route.ts`: dispute creation and user tracking.
- `proxy.ts`: centralized API authentication and admin-role restrictions.

## Review Advice

- Explain the request flow before discussing individual lines.
- State which checks happen on the frontend and which are repeated on the API.
- Use one real workflow as an example, such as booking to completion.
- If you do not know an answer, explain what you would inspect or test.
- Describe limitations honestly and present them as future improvements.
