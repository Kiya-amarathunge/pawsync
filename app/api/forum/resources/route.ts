import { NextResponse } from 'next/server';

// GET /api/forum/resources
export async function GET() {
  // Static educational resources approved by vets
  const resources = [
    {
      id: 1,
      title: 'Understanding Your Pet\'s Vaccination Schedule',
      category: 'health',
      summary: 'A complete guide to keeping your pet\'s vaccinations up to date.',
      author: 'PawSync Veterinary Team',
      readTime: '5 min read',
    },
    {
      id: 2,
      title: 'Nutrition Basics for Dogs and Cats',
      category: 'nutrition',
      summary: 'What your pet needs in their diet for a long healthy life.',
      author: 'PawSync Veterinary Team',
      readTime: '7 min read',
    },
    {
      id: 3,
      title: 'Basic Training Tips for New Pet Owners',
      category: 'training',
      summary: 'Simple techniques to help your pet learn good behaviour.',
      author: 'PawSync Veterinary Team',
      readTime: '6 min read',
    },
    {
      id: 4,
      title: 'Signs Your Pet Needs Emergency Care',
      category: 'health',
      summary: 'Know the warning signs that require immediate veterinary attention.',
      author: 'PawSync Veterinary Team',
      readTime: '4 min read',
    },
  ];

  return NextResponse.json({ resources });
}
