import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";
import { NewsletterSubscription, ApiResponse } from "@/lib/types";

const COLLECTION_NAME = "newsletter_subscriptions";

export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    
    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { success: false, message: 'Valid email address is required' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const collection = db.collection(COLLECTION_NAME) as any;


    // Check if email already exists
    const existingSubscription = await collection.findOne({ email });
    
    if (existingSubscription) {
      if (existingSubscription.isActive) {
        return NextResponse.json(
          { success: false, message: 'Email is already subscribed' },
          { status: 400 }
        );
      } else {
        // Reactivate subscription
        await collection.updateOne(
          { email },
          { 
            $set: { 
              isActive: true, 
              subscribedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            },
            $unset: { unsubscribedAt: 1 }
          }
        );
        
        return NextResponse.json({
          data: { email, isActive: true },
          source: 'database',
          timestamp: new Date().toISOString(),
          success: true,
          message: 'Email resubscribed successfully'
        } as ApiResponse<{ email: string; isActive: boolean }>);
      }
    }

    const newSubscription: Omit<NewsletterSubscription, 'id'> = {
      email,
      isActive: true,
      subscribedAt: new Date().toISOString()
    };

    const result = await collection.insertOne(newSubscription as NewsletterSubscription);
    
    return NextResponse.json({
      data: { ...newSubscription, id: result.insertedId.toString() },
      source: 'database',
      timestamp: new Date().toISOString(),
      success: true,
      message: 'Successfully subscribed to newsletter'
    } as ApiResponse<NewsletterSubscription>);
  } catch (error) {
    console.error('Error subscribing to newsletter:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to subscribe to newsletter' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Email address is required' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
const collection = db.collection(COLLECTION_NAME) as any;


    const result = await collection.updateOne(
      { email },
      { 
        $set: { 
          isActive: false, 
          unsubscribedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, message: 'Email not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: { email, isActive: false },
      source: 'database',
      timestamp: new Date().toISOString(),
      success: true,
      message: 'Successfully unsubscribed from newsletter'
    } as ApiResponse<{ email: string; isActive: boolean }>);
  } catch (error) {
    console.error('Error unsubscribing from newsletter:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to unsubscribe from newsletter' },
      { status: 500 }
    );
  }
}
