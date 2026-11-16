import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { UserRound, LogOut } from "lucide-react";
import useAuth from "../context/useAuth.jsx";

export default function UserProfile() {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    const { user, logout } = useAuth();
    const navigate = useNavigate();

    // Generate user initials
    const getInitials = (name) => {
        if (!name) return "";

        const nameParts = name.trim().split(/\s+/);

        if (nameParts.length === 1) {
            return nameParts[0].charAt(0).toUpperCase();
        }

        return (
            nameParts[0].charAt(0) +
            nameParts[nameParts.length - 1].charAt(0)
        ).toUpperCase();
    };

    const initials = user?.name ? getInitials(user.name) : "";

    useEffect(() => {
        function handleClickOutside(event) {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target)
            ) {
                setIsOpen(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleLogout = () => {
        setIsOpen(false);
        logout();
        navigate("/login", { replace: true });
    };

    return (
        <div className="relative" ref={dropdownRef}>

            {/* User Profile Icon */}
            <button
                type="button"
                onClick={() => setIsOpen((previous) => !previous)}
                className="flex h-11 w-11 items-center justify-center rounded-full
                           bg-sky-500 text-white transition hover:bg-sky-600"
                aria-label="Open user profile"
                aria-expanded={isOpen}
            >
                {user ? (
                    <span className="text-sm font-semibold">
                        {initials}
                    </span>
                ) : (
                    <UserRound size={23} />
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div
                    className="absolute right-0 top-14 z-50 w-64 overflow-hidden
                               rounded-xl border border-gray-700 bg-[#292929]
                               text-white shadow-2xl"
                >
                    <div className="border-b border-gray-700 px-4 py-4">

                        <div className="mb-2 flex items-center gap-2">

                            {/* Dropdown Profile Icon */}
                            <div className="flex h-10 w-10 items-center justify-center
                                            rounded-full bg-sky-500 text-white">
                                {user ? (
                                    <span className="text-sm font-semibold">
                                        {initials}
                                    </span>
                                ) : (
                                    <UserRound size={20} />
                                )}
                            </div>

                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold">
                                    {user?.name || "RockAI User"}
                                </p>

                                <p className="truncate text-xs text-gray-400">
                                    {user?.email || ""}
                                </p>
                            </div>
                        </div>

                        <p className="text-xs text-gray-400">
                            Manage your RockAI account
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={handleLogout}
                        className="flex w-full items-center gap-3 px-4 py-3
                                   text-left text-sm text-red-400
                                   transition hover:bg-gray-800"
                    >
                        <LogOut size={18} />
                        <span>Log out</span>
                    </button>
                </div>
            )}
        </div>
    );
}