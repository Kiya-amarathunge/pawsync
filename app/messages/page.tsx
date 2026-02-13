'use client';

import { useState } from 'react';
import Sidebar from '../components/Sidebar';

export default function MessagesPage() {
  const [selectedChat, setSelectedChat] = useState('dr-smith');
  const [messageText, setMessageText] = useState('');

  const sidebarItems = [
    { icon: '🏠', label: 'Dashboard', href: '/dashboard' },
    { icon: '💬', label: 'Messages', href: '/messages' },
    { icon: '⚙️', label: 'Settings', href: '/settings' },
    { icon: '❓', label: 'Support', href: '/support' },
    { icon: '🐾', label: 'My Pets', href: '/my-pets' },
    { icon: '📅', label: 'Appointments', href: '/appointments' },
    { icon: '👨‍⚕️', label: 'Providers', href: '/providers' },
  ];

  const conversations = [
    {
      id: 'dr-smith',
      name: 'Dr. Eleanor Smith',
      subtitle: 'The lab results ar...',
      time: '10:30 AM',
      unread: 2,
      verified: true,
      avatar: '👩‍⚕️',
    },
    {
      id: 'groomer',
      name: 'Grooming Salon',
      subtitle: 'Your appointment for...',
      time: 'Yesterday',
      unread: 0,
      verified: false,
      avatar: '✂️',
    },
    {
      id: 'sitter',
      name: 'Happy Paws Sitters',
      subtitle: "We'll be there to walk Ma...",
      time: 'Mon',
      unread: 0,
      verified: false,
      avatar: '🐕',
    },
    {
      id: 'owner',
      name: 'Sarah (Pet Owner)',
      subtitle: 'My dog loves that ne...',
      time: 'Last Week',
      unread: 0,
      verified: false,
      avatar: '👤',
    },
  ];

  const messages = {
    'dr-smith': [
      {
        id: 1,
        sender: 'user',
        text: "Hi Dr. Smith, just checking in on Max's recent blood work results. Hope everything is fine!",
        time: '10:00 AM',
      },
      {
        id: 2,
        sender: 'contact',
        text: "Hello! The lab results are in, and I'm happy to report that Max is doing great. All values are within normal range.",
        time: '10:05 AM',
      },
      {
        id: 3,
        sender: 'user',
        text: "That's wonderful news! Thank you so much for the update. Should I schedule a follow-up visit soon?",
        time: '10:07 AM',
      },
      {
        id: 4,
        sender: 'contact',
        text: 'We can schedule a routine check-up in about 6 months, unless you notice any changes. I\'ve also attached the full lab report for your records.',
        time: '10:15 AM',
        attachment: 'Max_Lab_Results_2023.pdf',
      },
      {
        id: 5,
        sender: 'contact',
        image: '🐕',
        time: '10:10 AM',
      },
      {
        id: 6,
        sender: 'contact',
        text: '...',
        time: '10:20 AM',
        typing: true,
      },
    ],
  };

  const currentMessages = messages[selectedChat as keyof typeof messages] || [];

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Sending message:', messageText);
    setMessageText('');
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar items={sidebarItems} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
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

        {/* Messages Layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* Conversations List */}
          <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-800">Messages</h2>
            </div>
            <div className="flex-1 overflow-y-auto">
              {conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  onClick={() => setSelectedChat(conversation.id)}
                  className={`w-full p-4 flex items-start gap-3 hover:bg-gray-50 transition-colors ${
                    selectedChat === conversation.id ? 'bg-cyan-50' : ''
                  }`}
                >
                  <div className="relative">
                    <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center text-2xl">
                      {conversation.avatar}
                    </div>
                    {conversation.unread > 0 && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs text-white">
                        {conversation.unread}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-gray-800">
                          {conversation.name}
                        </span>
                        {conversation.verified && (
                          <span className="text-cyan-500">✓</span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">
                        {conversation.time}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 truncate">
                      {conversation.subtitle}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col bg-gray-50">
            {/* Chat Header */}
            <div className="bg-white border-b border-gray-200 p-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center">
                  👩‍⚕️
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-gray-800">Dr. Eleanor Smith</h3>
                    <span className="text-cyan-500 text-sm">✓ Verified</span>
                  </div>
                  <p className="text-sm text-gray-500">In a consultation</p>
                </div>
              </div>
              <button className="p-2 hover:bg-gray-100 rounded-lg">
                <span className="text-xl">⋮</span>
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {currentMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.sender === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-md ${
                      message.sender === 'user'
                        ? 'bg-cyan-400 text-white'
                        : 'bg-white text-gray-800'
                    } rounded-lg p-4 shadow-sm`}
                  >
                    {message.typing ? (
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                      </div>
                    ) : message.image ? (
                      <div className="text-6xl">{message.image}</div>
                    ) : message.attachment ? (
                      <div>
                        <p className="mb-2">{message.text}</p>
                        <div className="flex items-center gap-2 p-3 bg-gray-100 rounded-lg">
                          <span>📄</span>
                          <span className="text-sm">{message.attachment}</span>
                        </div>
                      </div>
                    ) : (
                      <p>{message.text}</p>
                    )}
                    <p
                      className={`text-xs mt-2 ${
                        message.sender === 'user'
                          ? 'text-cyan-100'
                          : 'text-gray-500'
                      }`}
                    >
                      {message.time} {message.sender === 'user' && '✓✓'}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Message Input */}
            <div className="bg-white border-t border-gray-200 p-4">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <button
                  type="button"
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  📎
                </button>
                <input
                  type="text"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type your message here..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:border-transparent outline-none"
                />
                <button
                  type="submit"
                  className="px-6 py-2 bg-cyan-400 text-white rounded-lg hover:bg-cyan-500 font-medium"
                >
                  ➤
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}