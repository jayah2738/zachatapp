"use client";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push("/login");
  };

  return (
    <button
      className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-100 rounded transition-colors"
      onClick={handleLogout}
    >
      Log out
    </button>
  );
}
