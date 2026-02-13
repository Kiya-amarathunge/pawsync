'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
  });

  const roles = [
    { 
      id: 'pet-owner', 
      label: 'Pet Owner',
      icon: '🐾',
      description: 'Manage your pets and book services'
    },
    { 
      id: 'veterinarian', 
      label: 'Veterinarian',
      icon: '🩺',
      description: 'Provide medical care and consultations'
    },
    { 
      id: 'service-provider', 
      label: 'Service Provider',
      icon: '💼',
      description: 'Offer grooming, training, or boarding'
    },
  ];

  const handleRoleSelect = (roleId: string) => {
    setSelectedRole(roleId);
  };

  const handleNext = () => {
    if (step === 1 && selectedRole) {
      setStep(2);
    }
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // We'll add the registration logic later
    console.log('Registration attempt:', { ...formData, role: selectedRole });
    alert('Registration form submitted! (Not connected to backend yet)');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-8">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-cyan-400 rounded-lg flex items-center justify-center">
              <span className="text-white text-xl">🐾</span>
            </div>
            <span className="text-2xl font-bold text-gray-800">PawSync</span>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">
          Register for PawSync
        </h1>
        <p className="text-center text-gray-500 mb-6">
          Join our community and streamline your pet care journey.
        </p>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step === 1 ? 'bg-cyan-400 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              1
            </div>
            <div className="w-16 h-1 bg-gray-200"></div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              step === 2 ? 'bg-cyan-400 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              2
            </div>
          </div>
        </div>

        {/* Step 1: Role Selection */}
        {step === 1 && (
          <div>
            <h2 className="text-xl font-bold text-center text-gray-800 mb-2">
              Welcome to PawSync!
            </h2>
            <p className="text-center text-gray-600 mb-6">
              Choose your primary role to get started with your registration.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {roles.map((role) => (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => handleRoleSelect(role.id)}
                  className={`p-6 rounded-lg border-2 transition-all ${
                    selectedRole === role.id
                      ? 'border-cyan-400 bg-cyan-50'
                      : 'border-gray-300 hover:border-cyan-300'
                  }`}
                >
                  <div className="text-4xl mb-3">{role.icon}</div>
                  <h3 className="font-bold text-gray-800 mb-2">{role.label}</h3>
                  <p className="text-sm text-gray-600">{role.description}</p>
                </button>
              ))}
            </div>

            <div className="flex justify-between items-center">
              <Link
                href="/login"
                className="text-gray-600 hover:text-gray-800"
              >
                Back
              </Link>
              <button
                onClick={handleNext}
                disabled={!selectedRole}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  selectedRole
                    ? 'bg-cyan-400 text-white hover:bg-cyan-500'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Registration Form */}
        {step === 2 && (
          <div>
            <h2 className="text-xl font-bold text-center text-gray-800 mb-2">
              Create Your Account
            </h2>
            <p className="text-center text-gray-600 mb-6">
              Registering as: <span className="font-semibold text-cyan-600">
                {roles.find(r => r.id === selectedRole)?.label}
              </span>
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="John Doe"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none"
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="your.email@example.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none"
                  required
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="+94 71 234 5678"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none"
                  required
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="••••••••"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none"
                  required
                />
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="••••••••"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none"
                  required
                />
              </div>

              <div className="flex justify-between items-center pt-4">
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-6 py-2 text-gray-600 hover:text-gray-800 font-medium"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-cyan-400 text-white rounded-lg hover:bg-cyan-500 transition-colors font-medium"
                >
                  Create Account
                </button>
              </div>
            </form>

            <div className="text-center mt-6">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link href="/login" className="text-cyan-400 hover:text-cyan-500 font-medium">
                  Sign In
                </Link>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}