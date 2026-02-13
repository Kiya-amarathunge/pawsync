'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // We'll add the login logic later
    console.log('Login attempt:', { email, password, selectedRole });
    alert('Login form submitted! (Not connected to backend yet)');
  };

  const roles = [
    { id: 'pet-owner', label: 'Pet Owner' },
    { id: 'veterinarian', label: 'Veterinarian' },
    { id: 'service-provider', label: 'Service Provider' },
    { id: 'admin', label: 'Admin' },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-cyan-400 rounded-lg flex items-center justify-center">
              <span className="text-white text-xl">🐾</span>
            </div>
            <span className="text-2xl font-bold text-gray-800">PawSync</span>
          </div>
        </div>

        {/* Welcome Text */}
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">
          Welcome Back!
        </h1>
        <p className="text-center text-gray-500 mb-6">
          Enter your details to sign in.
        </p>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your.email@example.com"
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none"
              required
            />
          </div>

          {/* Forgot Password Link */}
          <div className="text-right">
            <Link 
              href="/forgot-password" 
              className="text-sm text-cyan-400 hover:text-cyan-500"
            >
              Forgot Password?
            </Link>
          </div>

          {/* Sign In Button */}
          <button
            type="submit"
            className="w-full bg-cyan-400 text-white py-2 rounded-lg hover:bg-cyan-500 transition-colors font-medium"
          >
            Sign In
          </button>

          {/* Quick Access Roles */}
          <div className="mt-6">
            <p className="text-sm text-gray-600 text-center mb-3">
              Login as a specific role for quick access:
            </p>
            <div className="grid grid-cols-2 gap-2">
              {roles.map((role) => (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setSelectedRole(role.id)}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    selectedRole === role.id
                      ? 'bg-cyan-400 text-white border-cyan-400'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-cyan-400'
                  }`}
                >
                  {role.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sign Up Link */}
          <div className="text-center mt-6">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Link href="/register" className="text-cyan-400 hover:text-cyan-500 font-medium">
                Sign Up
              </Link>
            </p>
            <p className="text-sm text-gray-600 mt-2">
              Already registered but haven't verified your email?{' '}
              <Link href="/verify-email" className="text-cyan-400 hover:text-cyan-500 font-medium">
                Verify Email
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}