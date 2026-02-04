import db from "@/db";
import { accounts } from "@/db/schema";
import { generateToken } from "@/lib/utils/jwt";
import { comparePassword } from "@/lib/utils/passwords";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    console.log("email, password in route", email, password);
    const [account] = await db
      .select()
      .from(accounts)
      .where(eq(accounts.email, email));
    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }
    const isPasswordValid = await comparePassword(password, account.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 },
      );
    }
    const token = await generateToken({
      id: account.id,
      email: account.email,
      username: account.name,
    });
    const response = NextResponse.json(
      {
        message: "Login successful",
        account,
        token,
      },
      { status: 200 },
    );
    response.cookies.set({
      name: "accountToken",
      value: token,
      httpOnly: true,
      // secure: process.env.NODE_ENV === "production", only send over HTTPS
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
    return response;
  } catch (error) {
    console.error("Login failed", error);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
