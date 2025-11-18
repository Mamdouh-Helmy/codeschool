import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Contact from "../../../models/Contact";
import mongoose from "mongoose";

// GET - جلب طلب اتصال محدد
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const { id } = params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid contact ID" },
        { status: 400 }
      );
    }

    const contact = await Contact.findById(id);

    if (!contact) {
      return NextResponse.json(
        { success: false, message: "Contact not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: contact,
    });
  } catch (error) {
    console.error("❌ Error fetching contact:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch contact",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// PUT - تحديث طلب اتصال
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const { id } = params;
    const body = await request.json();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid contact ID" },
        { status: 400 }
      );
    }

    const updatedContact = await Contact.findByIdAndUpdate(
      id,
      { ...body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!updatedContact) {
      return NextResponse.json(
        { success: false, message: "Contact not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedContact,
      message: "Contact updated successfully",
    });
  } catch (error) {
    console.error("❌ Error updating contact:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to update contact",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// DELETE - حذف طلب اتصال (Soft Delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectDB();

    const { id } = params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid contact ID" },
        { status: 400 }
      );
    }

    const deletedContact = await Contact.findByIdAndUpdate(
      id,
      { isActive: false, updatedAt: new Date() },
      { new: true }
    );

    if (!deletedContact) {
      return NextResponse.json(
        { success: false, message: "Contact not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Contact deleted successfully",
    });
  } catch (error) {
    console.error("❌ Error deleting contact:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete contact",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}