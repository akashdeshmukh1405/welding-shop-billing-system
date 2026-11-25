import { NextRequest, NextResponse } from "next/server";
import { initialCustomers } from "@/lib/seedData";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query");

    let customers = [...initialCustomers];
    if (query) {
      const q = query.toLowerCase();
      customers = customers.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          (c.address && c.address.toLowerCase().includes(q))
      );
    }

    return NextResponse.json({ success: true, data: customers });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to fetch customers" },
      { status: 500 }
    );
  }
}
