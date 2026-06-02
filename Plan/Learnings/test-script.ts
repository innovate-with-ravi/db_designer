import { prisma } from "../../lib/prisma";

async function main() {
    // Fetch all users with their posts
    // const allUsers = await prisma.user.findMany({
    //     include: {
    //         diagrams: true,
    //     },
    // });
    // console.log("All users:", JSON.stringify(allUsers, null, 2));

    // Write a Prisma query that fetches all diagrams belonging to a specific logged-in user, but ensure it also returns the count of nodes inside each diagram so you can show it on the UI card.
    const userId = "cmpwj3ais0000k40t5tstappi";
    const diagramsOfUserId = await prisma.diagram.findMany({
        where: { userId: userId },
        include: { _count: true }
    })

    // When you use template literals (the backticks `...`) to combine a string and a variable, JavaScript forces everything inside the ${} to become a string.

    // Option A: The Comma (Lets Node.js print the raw object tree)
    console.log(`diagrams of userId ${userId} are:`, diagramsOfUserId);

    // Option B: Pretty-Print Stringify (The 2 adds beautiful indentation)
    console.log(`diagrams of userId ${userId} are: \n${JSON.stringify(diagramsOfUserId, null, 2)}`);

    // Write a clean query to delete an entire diagram based on its specific id.

    const res = await prisma.diagram.delete({ where: { id: "cmpwoik9d0001xs0tm021yr0x" } })
    console.log("res:", res);
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });