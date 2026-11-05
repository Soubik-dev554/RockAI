import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Bot, Eye, EyeOff, LoaderCircle, LockKeyhole, Mail } from "lucide-react";
import useAuth from "../context/useAuth.jsx";

function Login() {
    const location = useLocation();
    const successMessage = location.state?.message;
    const navigate = useNavigate();
    const { login } = useAuth();


    const [formData, setFormData] = useState({
        email: "",
        password: "",
    });

    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;

        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));

        if (error) setError("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (loading) return;

        setError("");
        setLoading(true);

        try {
            const response = await fetch(
                "http://https://15-135-87-77.sslip.io/api/login",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        email: formData.email.trim(),
                        password: formData.password,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Unable to log in. Please try again."
                );
            }

            if (!data.token || !data.user) {
                throw new Error("Invalid response received from the server.");
            }

            // Store the authenticated user and JWT.
            login(data.user, data.token);

            // Return to the chatbot.
            navigate("/", { replace: true });
        } catch (err) {
            setError(
                err.message === "Failed to fetch"
                    ? "Unable to connect to the server. Please try again."
                    : err.message || "Something went wrong."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
<main className="flex min-h-screen items-center justify-center bg-[#171717] px-3 py-6 text-white sm:px-4 sm:py-8">            <section className="w-full max-w-md min-w-0 rounded-2xl border border-white/10 bg-[#222222] p-5 shadow-2xl sm:p-8">
                {/* Brand */}
                <div className="mb-8 text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-600/20">
                        <Bot size={30} aria-hidden="true" />
                    </div>

                    <h1 className="text-3xl font-bold tracking-tight">
                        Welcome to <span className="text-blue-400">RockAI</span>
                    </h1>

                    <p className="mt-3 text-sm text-gray-400">
                        Sign in to continue your AI conversations.
                    </p>
                </div>

                {successMessage && (
                    <div
                        role="status"
                        className="mb-4 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300"
                    >
                        {successMessage}
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div
                        role="alert"
                        className="mb-5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
                    >
                        {error}
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label
                            htmlFor="email"
                            className="mb-2 block text-sm font-medium text-gray-200"
                        >
                            Email address
                        </label>

                        <div className="relative">
                            <Mail
                                size={18}
                                aria-hidden="true"
                                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                            />

                            <input
                                id="email"
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="you@example.com"
                                autoComplete="email"
                                required
                                className="w-full rounded-lg border border-white/10 bg-[#191919] py-3 pl-10 pr-4 text-white outline-none transition placeholder:text-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                            />
                        </div>
                    </div>

                    <div>
                        <label
                            htmlFor="password"
                            className="mb-2 block text-sm font-medium text-gray-200"
                        >
                            Password
                        </label>

                        <div className="relative">
                            <LockKeyhole
                                size={18}
                                aria-hidden="true"
                                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                            />

                            <input
                                id="password"
                                name="password"
                                type={showPassword ? "text" : "password"}
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="Enter your password"
                                autoComplete="current-password"
                                required
                                className="w-full rounded-lg border border-white/10 bg-[#191919] py-3 pl-10 pr-12 text-white outline-none transition placeholder:text-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((prev) => !prev)}
                                aria-label={showPassword ? "Hide password" : "Show password"}
                                aria-pressed={showPassword}
                                className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 transition hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {showPassword ? (
                                    <EyeOff size={18} aria-hidden="true" />
                                ) : (
                                    <Eye size={18} aria-hidden="true" />
                                )}
                            </button>
                        </div>

                        <div className="mt-2 text-right">
                            <Link
                                to="/forgot-password"
                                className="text-sm text-blue-400 transition hover:text-blue-300"
                            >
                                Forgot Password?
                            </Link>
                        </div>

                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-[#222222] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {loading && (
                            <LoaderCircle
                                size={18}
                                className="animate-spin"
                                aria-hidden="true"
                            />
                        )}

                        {loading ? "Signing in..." : "Sign In"}
                    </button>
                </form>

                {/* Registration */}
                <p className="mt-7 text-center text-sm text-gray-400">
                    Don't have an account?{" "}
                    <Link
                        to="/register"
                        className="font-medium text-blue-400 transition hover:text-blue-300"
                    >
                        Create an account
                    </Link>
                </p>

                <p className="mt-6 text-center text-xs text-gray-500">
                    Your AI conversations, all in one place.
                </p>
            </section>
        </main>
    );


}

export default Login;
