import { NextRequest, NextResponse } from 'next/server';

// GET /api/emergency/resources
export async function GET(req: NextRequest) {
  const resources = [
    {
      id: 1,
      title: 'Pet First Aid Basics',
      content: 'Keep your pet calm and warm. Do not give human medications. Contact your vet immediately.',
      category: 'first-aid',
    },
    {
      id: 2,
      title: 'Signs of Emergency in Dogs',
      content: 'Difficulty breathing, collapse, severe bleeding, seizures, suspected poisoning.',
      category: 'dogs',
    },
    {
      id: 3,
      title: 'Signs of Emergency in Cats',
      content: 'Difficulty breathing, not urinating, collapse, open mouth breathing, sudden paralysis.',
      category: 'cats',
    },
    {
      id: 4,
      title: 'What to Bring to the Emergency Vet',
      content: 'Your pet\'s vaccination records, any medications they take, and their health history from PawSync.',
      category: 'preparation',
    },
    {
      id: 5,
      title: 'Poison Control',
      content: 'If your pet ingested something toxic, note what it was and how much, and contact your vet or poison control immediately.',
      category: 'first-aid',
    },
  ];

  return NextResponse.json({ resources });
}
