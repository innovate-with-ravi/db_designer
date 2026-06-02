import { auth, signIn, signOut } from "@/auth"

export default async function Dashboard() {
    // 1. Fetch the active session directly on the server!
    const session = await auth();


    if (!session?.user) {
        return (
            <div className="flex items-center justify-center h-screen">
                <form action={async () => {
                    "use server";
                    await signIn("google");
                }}>
                    <button type="submit" className="bg-blue-600 text-white px-6 py-3 rounded-md font-bold hover:bg-blue-700">
                        Sign In with Google
                    </button>
                </form>
            </div>
        );
    }

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-4">Welcome back, {session.user.name}</h1>
            <form action={async () => {
                "use server";
                await signOut();
            }}>
                <button type="submit" className="bg-red-600 text-white px-4 py-2 rounded font-semibold hover:bg-red-700">
                    Sign Out
                </button>
            </form>
        </div>
    );
}