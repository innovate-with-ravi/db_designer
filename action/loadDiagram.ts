"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// ----------------------------------------------------------------------
// ACTION 1: Fetch all diagrams for the User Dashboard
// ----------------------------------------------------------------------
export async function getUserDiagrams() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    // console.log("userId:", session.user.id);

    // Fetch all diagrams owned by this user, newest first
    const diagrams = await prisma.diagram.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        updatedAt: "desc", // Sorts by newest automatically!
      },
      // We don't need the actual nodes here, just the COUNT for the UI card (only for nodes having type == entity)
      include: {
        nodes: true,
      },
    });

    return { success: true, diagrams };
  } catch (error) {
    console.error("Failed to fetch diagrams:", error);
    return { success: false, error: "Database error occurred." };
  }
}

// ----------------------------------------------------------------------
// ACTION 2: Fetch a specific diagram to load into the Editor
// ----------------------------------------------------------------------
export async function getDiagramById(diagramId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    // Use findFirst so we can securely check BOTH the diagram ID and User ID
    const diagram = await prisma.diagram.findFirst({
      where: {
        id: diagramId,
        userId: session.user.id, // Security: Prevents loading someone else's diagram!
      },
      // This is where the magic happens: pull the relational data
      include: {
        nodes: true,
        edges: true,
      },
    });

    if (!diagram) {
      return { success: false, error: "Diagram not found or access denied." };
    }

    return { success: true, diagram };
  } catch (error) {
    console.error("Failed to load diagram:", error);
    return { success: false, error: "Database error occurred." };
  }
}
