'use client';

import { useState } from 'react';
import Link from 'next/link';
import Sidebar from '../components/Sidebar';

export default function DashboardPage() {
  const sidebarItems = [
    { icon: '🏠', label: 'Dashboard', href: '/dashboard' },
    { icon: '💬', label: 'Messages', href: '/messages' },
    { icon: '⚙️', label: 'Settings', href: '/settings' },
    { icon: '❓', label: 'Support', href: '/support' },
    { icon: '🐾', label: 'My Pets', href: '/my-pets' },
    { icon: '📅', label: 'Appointments', href: '/appointments' },
    { icon: '👨‍⚕️', label: 'Providers', href: '/providers' },
  ];

  const pets = [
    { id: 1, name: 'Buddy', species: 'Dog', breed: 'Golden Retriever', image: '🐕' },
    { id: 2, name: 'Whiskers', species: 'Cat', breed: 'Siamese', image: '🐱' },
    { id: 3, name: 'Kiwi', species: 'Bird', breed: 'Parakeet', image: '🦜' },
  ];

  const upcomingAppointments = [
    {
      id: 1,
      title: 'Annual Check-up - Buddy',
      date: '2024-07-20',
      time: '10:00 AM',
      provider: 'Dr. Emily White',
      type: 'Veterinarian',
      status: 'Confirmed',
    },
    {
      id: 2,
      title: 'Grooming Session - Whiskers',
      date: '2024-07-22',
      time: '02:30 PM',
      provider: 'Pawsome Groomers',
      type: 'Groomer',
      status: 'Pending',
    },
    {
      id: 3,
      title: 'Wing Clip - Kiwi',
      date: '2024-07-25',
      time: '09:00 AM',
      provider: 'Avian Vet Clinic',
      type: 'Veterinarian',
      status: 'Confirmed',
    },
  ];

  const healthUpdates = [
    {
      id: 1,
      pet: 'Buddy',
      date: 'July 15, 2024',
      update: 'Buddy completed his heartworm medication course. Showing good energy and appetite.',
    },
    {
      id: 2,
      pet: 'Whiskers',
      date: 'July 10, 2024',
      update: 'Follow-up on skin irritation. Applied topical cream, condition improving.',
    },
  ];

  const notifications = [
    { id: 1, message: 'Your annual check-up for Buddy is tomorrow!', time: '1 hour ago', type: 'reminder' },
    { id: 2, message: 'Pawsome Groomers confirmed Whiskers\' appointment.', time: '2 hours ago', type: 'confirmation' },
    { id: 3, message: 'New article: "Understanding Your Pet\'s Dietary Needs".', time: '1 day ago', type: 'info' },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar items={sidebarItems} />

      {/* Main Content */}
      <div className="flex-1">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-cyan-400 rounded-lg flex items-center justify-center">
              <span className="text-white">🐾</span>
            </div>
            <span className="text-xl font-bold text-gray-800">PawSync</span>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <span className="text-xl">🔔</span>
            </button>
            <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
          </div>
        </div>

        {/* Page Content */}
        <div className="p-8">
          {/* Welcome Section */}
          <div className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-lg p-6 mb-8 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 mb-2">
                Good Morning, Pet Owner!
              </h1>
              <p className="text-gray-600">
                Ready for a productive day with your furry companions?
              </p>
            </div>
            <div className="hidden md:block">
              <img src="/api/placeholder/150/150" alt="Pet illustration" className="w-32 h-32 rounded-lg" />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Upcoming Appointments */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">
                  Upcoming Appointments
                </h2>
                <div className="space-y-4">
                  {upcomingAppointments.map((appointment) => (
                    <div
                      key={appointment.id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-cyan-400 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-bold text-gray-800">
                            {appointment.title}
                          </h3>
                          <p className="text-sm text-gray-600">
                            📅 {appointment.date} at {appointment.time}
                          </p>
                          <p className="text-sm text-gray-600">
                            With: {appointment.provider} ({appointment.type})
                          </p>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            appointment.status === 'Confirmed'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {appointment.status}
                        </span>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button className="text-sm px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg">
                          View Details
                        </button>
                        <button className="text-sm px-4 py-2 text-cyan-600 hover:bg-cyan-50 rounded-lg flex items-center gap-1">
                          💬 Message Provider
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Health Updates */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-4">
                  Recent Health Updates
                </h2>
                <div className="space-y-4">
                  {healthUpdates.map((update) => (
                    <div
                      key={update.id}
                      className="border-l-4 border-cyan-400 pl-4 py-2"
                    >
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="font-bold text-gray-800">
                          Health Update: {update.pet}
                        </h3>
                        <span className="text-sm text-gray-500">{update.date}</span>
                      </div>
                      <p className="text-gray-600">{update.update}</p>
                      <button className="text-sm text-cyan-600 hover:text-cyan-700 mt-2">
                        View full history →
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notifications */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-800">
                    Notifications 🔔
                  </h2>
                </div>
                <div className="space-y-3">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg"
                    >
                      <div className="w-2 h-2 bg-cyan-400 rounded-full mt-2"></div>
                      <div className="flex-1">
                        <p className="text-gray-800">{notification.message}</p>
                        <span className="text-xs text-gray-500">{notification.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column - Sidebar Content */}
            <div className="space-y-6">
              {/* Emergency Services */}
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                <button className="w-full bg-red-500 text-white py-3 rounded-lg hover:bg-red-600 font-bold">
                  🚨 Emergency Services
                </button>
              </div>

              {/* My Pets */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="font-bold text-gray-800 mb-4">My Pets</h3>
                <div className="space-y-3">
                  {pets.map((pet) => (
                    <Link
                      key={pet.id}
                      href={`/my-pets/${pet.id}`}
                      className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <div className="text-3xl">{pet.image}</div>
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-800">{pet.name}</h4>
                        <p className="text-sm text-gray-600">
                          {pet.species}, {pet.breed}
                        </p>
                      </div>
                      <button className="text-cyan-600 hover:text-cyan-700">
                        View Profile
                      </button>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="font-bold text-gray-800 mb-4">Quick Actions</h3>
                <div className="space-y-2">
                  <button className="w-full bg-cyan-400 text-white py-3 rounded-lg hover:bg-cyan-500 font-medium flex items-center justify-center gap-2">
                    📅 Book New Appointment
                  </button>
                  <button className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg hover:bg-gray-200 font-medium flex items-center justify-center gap-2">
                    📄 Upload Health Records
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}