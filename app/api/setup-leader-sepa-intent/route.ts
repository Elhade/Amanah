import { NextResponse } from 'next/server';

// Superseded by createSetupIntentForLeaderAction (Server Action)
export async function POST() {
  return NextResponse.json({ error: 'Endpoint obsolète. Utilisez la Server Action.' }, { status: 410 });
}
