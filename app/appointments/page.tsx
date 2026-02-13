'use client';

import { useState } from 'react';
import Link from 'next/link';
import Sidebar from '../components/Sidebar';

export default function AppointmentsPage() {
  const [selectedService, setSelectedService] = useState<string | null>(null);

  const sidebarItems = [
    { icon: '🏠', label: 'Dashboard', href: '/dashboard' },
    { icon: '💬', label: 'Messages', href: '/messages' },
    { icon: '⚙️', label: 'Settings', href: '/settings' },
    { icon: '❓', label: 'Support', href: '/support' },
    { icon: '🐾', label: 'My Pets', href: '/my-pets' },
    { icon: '📅', label: 'Appointments', href: '/appointments' },
    { icon: '👨‍⚕️', label: 'Providers', href: '/providers' },
  ];

  const services = [
    {
      id: 'veterinary',
      name: 'Veterinary Care',
      icon: '🩺',
      description: 'Comprehensive health check-ups and medical treatments.',
    },
    {
      id: 'grooming',
      name: 'Grooming',
      icon: '✂️',
      description: 'Bathing, haircuts, nail trims, and other pampering services.',
    },
    {
      id: 'training',
      name: 'Pet Training',
      icon: '🎓',
      description: 'Behavioral correction and obedience training sessions.',
    },
    {
      id: 'boarding',
      name: 'Pet Boarding',
      icon: '🏠',
      description: 'Safe and comfortable overnight stays for your pets.',
    },
  ];

  const appointments = [
    {
      id: 1,
      service: 'Veterinary Care',
      provider: 'Dr. Emily White',
      date: '2023-10-26',
      time: '10:00 AM',
      pet: 'Buddy',
      status: 'Completed',
    },
    {
      id: 2,
      service: 'Grooming',
      provider: 'Pawsome Groomers',
      date: '2023-11-15',
      time: '02:00 PM',
      pet: 'Mittens',
      status: 'Confirmed',
    },
    {
      id: 3,
      service: 'Pet Training',
      provider: 'Alpha Pet Training',
      date: '2023-12-01',
      time: '09:00 AM',
      pet: 'Max',
      status: 'Pending',
    },
    {
      id: 4,
      service: 'Pet Boarding',
      provider: 'Happy Tails Inn',
      date: '2023-12-10',
      time: '03:00 PM',
      pet: 'Bella',
      status: 'Cancelled',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-gray-100 text-gray-700 border-gray-300';
      case 'Confirmed':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'Cancelled':
        return 'bg-red-100 text-red-700 border-red-300';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

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
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Appointment Booking
          </h1>
          <p className="text-gray-600 mb-8">
            Book your next pet care appointment in a few easy steps.
          </p>

          {/* Select Service Type */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-6">
              Select a Service Type
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {services.map((service) => (
                <button
                  key={service.id}
                  onClick={() => setSelectedService(service.id)}
                  className={`p-6 rounded-lg border-2 text-left transition-all ${
                    selectedService === service.id
                      ? 'border-cyan-400 bg-cyan-50'
                      : 'border-gray-200 hover:border-cyan-300'
                  }`}
                >
                  <div className="text-4xl mb-3">{service.icon}</div>
                  <h3 className="font-bold text-gray-800 mb-2">
                    {service.name}
                  </h3>
                  <p className="text-sm text-gray-600">{service.description}</p>
                </button>
              ))}
            </div>
            {selectedService && (
              <div className="mt-6 flex justify-end">
                <button className="px-6 py-3 bg-cyan-400 text-white rounded-lg hover:bg-cyan-500 font-medium">
                  Next: Select Provider →
                </button>
              </div>
            )}
          </div>

          {/* Your Appointments */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-6">
              Your Appointments
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                      Service
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                      Provider
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                      Date
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                      Time
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                      Pet
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((appointment) => (
                    <tr
                      key={appointment.id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="py-4 px-4 text-gray-800">
                        {appointment.service}
                      </td>
                      <td className="py-4 px-4 text-gray-800">
                        {appointment.provider}
                      </td>
                      <td className="py-4 px-4 text-gray-800">
                        {appointment.date}
                      </td>
                      <td className="py-4 px-4 text-gray-800">
                        {appointment.time}
                      </td>
                      <td className="py-4 px-4 text-gray-800">
                        {appointment.pet}
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                            appointment.status
                          )}`}
                        >
                          {appointment.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}