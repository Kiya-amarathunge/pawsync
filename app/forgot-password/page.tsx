'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Password reset requested for:', email);
    setIsSubmitted(true);
    // We'll add the reset logic later
  };

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

        {!isSubmitted ? (
          <>
            {/* Title */}
            <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">
              Reset Your Password
            </h1>
            <p className="text-center text-gray-500 mb-6">
              Enter the email address registered with your account, and we'll send you instructions to reset your password.
            </p>

            {/* Form */}
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

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full bg-cyan-400 text-white py-2 rounded-lg hover:bg-cyan-500 transition-colors font-medium"
              >
                Send Reset Link
              </button>
            </form>

            {/* Back to Login Link */}
            <div className="text-center mt-6">
              <Link 
                href="/login" 
                className="text-gray-600 hover:text-gray-800 flex items-center justify-center gap-2"
              >
                <span>←</span>
                <span>Back to Login</span>
              </Link>
            </div>
          </>
        ) : (
          <>
            {/* Success Message */}
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">✓</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-800 mb-2">
                Check Your Email
              </h1>
              <p className="text-gray-600 mb-6">
                We've sent password reset instructions to <span className="font-semibold">{email}</span>
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Didn't receive the email? Check your spam folder or try again.
              </p>
              <Link
                href="/login"
                className="text-cyan-400 hover:text-cyan-500 font-medium"
              >
                Return to Login
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}