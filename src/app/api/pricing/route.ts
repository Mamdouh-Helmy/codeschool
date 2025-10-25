import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import PricingPlan from "../../models/PricingPlan";

export const revalidate = 60;

export async function GET() {
  try {
    await connectDB();
    const plans = await PricingPlan.find({ isActive: true })
      .sort({ price: 1 })
      .populate("createdBy", "name email role")
      .lean();

    if (!plans.length) {
      return NextResponse.json({
        success: false,
        message: "No active pricing plans found",
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      data: plans,
      source: "database",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("GET /pricing error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch pricing plans",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();

    const plan = await PricingPlan.create({
      ...body,
      isPopular: Boolean(body.isPopular),
      createdBy: body.createdBy, // Admin ID
    });

    return NextResponse.json({
      success: true,
      data: plan,
      message: "Pricing plan created successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("POST /pricing error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create pricing plan" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id)
      return NextResponse.json(
        { success: false, message: "Missing id" },
        { status: 400 }
      );

    const updated = await PricingPlan.findByIdAndUpdate(
      id,
      { ...updates, updatedAt: new Date(), updatedBy: body.updatedBy },
      { new: true }
    );

    if (!updated)
      return NextResponse.json(
        { success: false, message: "Plan not found" },
        { status: 404 }
      );

    return NextResponse.json({
      success: true,
      data: updated,
      message: "Plan updated successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("PUT /pricing error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update plan" },
      { status: 500 }
    );
  }
}


export async function DELETE(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id)
      return NextResponse.json(
        { success: false, message: "Missing id" },
        { status: 400 }
      );

    const deleted = await PricingPlan.findByIdAndDelete(id);
    if (!deleted)
      return NextResponse.json(
        { success: false, message: "Plan not found" },
        { status: 404 }
      );

    return NextResponse.json({
      success: true,
      message: "Plan deleted successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("DELETE /pricing error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete plan" },
      { status: 500 }
    );
  }
}
