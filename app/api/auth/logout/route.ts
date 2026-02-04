import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json(
    { message: "Logout successful" },
    { status: 200 },
  );

  response.cookies.set({
    name: "accountToken",
    value: "",
    httpOnly: true,
    expires: new Date(0), // Expire the cookie immediately
    path: "/",
  });

  return response;
}
