import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
  // Get the headers
  const headerPayload = headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Missing svix headers', { status: 400 });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Create a new Svix instance with your webhook secret
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET || '');

  let evt: WebhookEvent;

  // Verify the webhook
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new Response('Error verifying webhook', { status: 400 });
  }

  // Handle the webhook
  const eventType = evt.type;

  if (eventType === 'user.created' || eventType === 'user.updated') {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data;
    
    const primaryEmail = email_addresses[0]?.email_address;

    if (!primaryEmail) {
      return new Response('No email found', { status: 400 });
    }

    // Create or update user in the database
    try {
      await prisma.user.upsert({
        where: { clerkId: id },
        update: {
          email: primaryEmail,
          firstName: first_name || '',
          lastName: last_name || '',
          imageUrl: image_url,
        },
        create: {
          clerkId: id,
          email: primaryEmail,
          firstName: first_name || '',
          lastName: last_name || '',
          imageUrl: image_url,
        },
      });

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Error syncing user data:', error);
      return new Response('Error syncing user data', { status: 500 });
    }
  }

  if (eventType === 'user.deleted') {
    const { id } = evt.data;

    try {
      // Delete user from the database when they're deleted in Clerk
      await prisma.user.delete({
        where: { clerkId: id },
      });

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Error deleting user:', error);
      return new Response('Error deleting user', { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
} 