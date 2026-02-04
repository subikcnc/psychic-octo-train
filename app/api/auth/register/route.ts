import db from "@/db";
import { accounts } from "@/db/schema";
import { generateToken } from "@/lib/utils/jwt";
import { hashPassword } from "@/lib/utils/passwords";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json();
    console.log("name, email, pass in route", name, email, password);
    const hashedPassword = await hashPassword(password);

    const [existingAccount] = await db
      .select()
      .from(accounts)
      .where(eq(accounts.email, email));

    if (existingAccount) {
      return NextResponse.json(
        { error: "Account with this email already exists" },
        { status: 400 },
      );
    }

    const [account] = await db
      .insert(accounts)
      .values({
        type: "user",
        name,
        email,
        password: hashedPassword,
      })
      .returning({
        id: accounts.id,
        email: accounts.email,
        name: accounts.name,
        password: accounts.password,
      });
    console.log("Created user", account);
    // Now we generate the token
    const token = await generateToken({
      id: account.id,
      email: account.email,
      username: account.name,
    });
    const response = NextResponse.json(
      {
        message: "User created successfully",
        account,
        token,
      },
      { status: 201 },
    );

    response.cookies.set({
      name: "accountToken",
      value: token,
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
    return response;
  } catch (error) {
    console.error("Registration failed", error);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
