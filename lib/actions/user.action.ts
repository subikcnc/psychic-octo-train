"use server";

import { cookies } from "next/headers";
import db from "@/db";
import { accounts } from "@/db/schema";
import { verifyToken } from "../utils/jwt";

export const getUser = async () => {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("accountToken")?.value;
    if (!token) {
      throw new Error("Unauthorized");
    }
    const payload = await verifyToken(token);
    return { id: payload.id, email: payload.email, username: payload.username };
  } catch (error) {
    console.error("Error verifying token", error);
    throw new Error("Invalid token");
  }
};

export const getAllUsers = async () => {
  try {
    // const users
    const users = await db
      .select({ id: accounts.id, name: accounts.name, email: accounts.email })
      .from(accounts);
    return users;
  } catch (error) {
    console.error("Error getting all users", error);
    throw new Error("Error getting all users");
  }
};
