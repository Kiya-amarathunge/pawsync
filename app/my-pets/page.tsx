'use client';

import { useState } from 'react';
import Link from 'next/link';
import Sidebar from '../components/Sidebar';

export default function MyPetsPage() {
  const [selectedPet, setSelectedPet] = useState('buddy');

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
    { id: 'buddy', name: 'Buddy', species: 'Dog', breed: 'Golden Retriever', image: '🐕' },
    { id: 'whiskers', name: 'Whiskers', species: 'Cat', breed: 'Siamese', image: '🐱' },
    { id: 'kiwi', name: 'Kiwi', species: 'Bird', breed: 'Parakeet', image: '🦜' },
  ];

  const petDetails = {
    buddy: {
      name: 'Buddy',
      species: 'Dog',
      breed: 'Golden Retriever',
      dateOfBirth: 'May 12th, 2019',
      weight: '32.5',
      diet: 'High-quality dry kibble, two meals a day, occasional carrots as treats.',
      restrictions: 'Allergic to chicken. Avoid rawhide bones due to choking hazard.',
    },
    whiskers: {
      name: 'Whiskers',
      species: 'Cat',
      breed: 'Siamese',
      dateOfBirth: 'March 8th, 2020',
      weight: '4.2',
      diet: 'Premium wet cat food, twice daily.',
      restrictions: 'Lactose intolerant. No dairy products.',
    },
    kiwi: {
      name: 'Kiwi',
      species: 'Bird',
      breed: 'Parakeet',
      dateOfBirth: 'January 15th, 2022',
      weight: '0.035',
      diet: 'Seed mix, fresh vegetables, occasional fruits.',
      restrictions: 'No avocado, chocolate, or salt.',
    },
  };

  const currentPet = petDetails[selectedPet as keyof typeof petDetails];

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
          {/* Pet Profile Header */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center text-4xl">
                  {pets.find(p => p.id === selectedPet)?.image}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">{currentPet.name}</h1>
                  <p className="text-gray-600">{currentPet.species} - {currentPet.breed}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Pet Selector Dropdown */}
                <select
                  value={selectedPet}
                  onChange={(e) => setSelectedPet(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none"
                >
                  {pets.map((pet) => (
                    <option key={pet.id} value={pet.id}>
                      {pet.name}
                    </option>
                  ))}
                </select>
                <button className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-2">
                  ✏️ Edit
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
              <div className="flex gap-8">
                <button className="pb-3 border-b-2 border-cyan-400 text-cyan-600 font-medium">
                  General Info
                </button>
                <button className="pb-3 text-gray-600 hover:text-gray-800">
                  Medical History
                </button>
                <button className="pb-3 text-gray-600 hover:text-gray-800">
                  Documents & Photos
                </button>
                <button className="pb-3 text-gray-600 hover:text-gray-800">
                  Health Trends
                </button>
              </div>
            </div>
          </div>

          {/* General Information */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              General Information
            </h2>
            <p className="text-gray-600 mb-6">View and update your pet's basic details.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={currentPet.name}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none"
                  readOnly
                />
              </div>

              {/* Species */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Species
                </label>
                <input
                  type="text"
                  value={currentPet.species}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none"
                  readOnly
                />
              </div>

              {/* Breed */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Breed
                </label>
                <input
                  type="text"
                  value={currentPet.breed}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none"
                  readOnly
                />
              </div>

              {/* Date of Birth */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date of Birth
                </label>
                <input
                  type="text"
                  value={currentPet.dateOfBirth}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none"
                  readOnly
                />
              </div>

              {/* Weight */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Weight (kg)
                </label>
                <input
                  type="text"
                  value={currentPet.weight}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none"
                  readOnly
                />
              </div>
            </div>

            {/* Diet */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Diet
              </label>
              <textarea
                value={currentPet.diet}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none"
                readOnly
              />
            </div>

            {/* Restrictions */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Restrictions
              </label>
              <textarea
                value={currentPet.restrictions}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none"
                readOnly
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 mt-6">
              <button className="px-6 py-2 text-gray-600 hover:text-gray-800 font-medium">
                Cancel
              </button>
              <button className="px-6 py-2 bg-cyan-400 text-white rounded-lg hover:bg-cyan-500 font-medium">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}