
import { useState } from "react";
import { Link } from "react-router-dom";
import {
    Bot,
    LoaderCircle,
    Mail,
    ArrowLeft,
} from "lucide-react";

const API_URL = "http://https://15-135-87-77.sslip.io";

const SUCCESS_MESSAGE =
    "If an account exists for that email, password-reset instructions will be sent. Please check your inbox and spam folder.";

function ForgotPassword() {
    const [email, setEmail] = useState("");

    const [status, setStatus] = useState({
        loading: false,
        message: "",
        error: "",
    });

    const { loading, message, error } = status;

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Prevent duplicate submissions.
        if (loading) return;

        const normalizedEmail = email.trim();

        // Validate the email input.
        if (
            !normalizedEmail ||
            normalizedEmail.length > 254 ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
        ) {
            setStatus({
                loading: false,
                message: "",
                error: "Please enter a valid email address.",
            });
            return;
        }

        setStatus({
            loading: true,
            message: "",
            error: "",
        });

        try {
            const response = await fetch(
                `${API_URL}/api/forgot-password`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        email: normalizedEmail,
                    }),
                    signal: AbortSignal.timeout(15000),
                }
            );

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    "Unable to process your request. Please try again."
                );
            }

            // Display a generic message to protect account privacy.
            setEmail("");

            setStatus({
                loading: false,
                message: SUCCESS_MESSAGE,
                error: "",
            });
        } catch (err) {
            let errorMessage;

            if (
                err.name === "TimeoutError" ||
                err.name === "AbortError"
            ) {
                errorMessage =
                    "The request timed out. Please try again.";
            } else if (err instanceof TypeError) {
                errorMessage =
                    "Unable to connect to RockAI. Please check your connection and try again.";
            } else {
                errorMessage =
                    err.message ||
                    "Something went wrong. Please try again.";
            }

            setStatus({
                loading: false,
                message: "",
                error: errorMessage,
            });
        }
    };

    const handleEmailChange = (e) => {
        setEmail(e.target.value);

        // Clear old feedback when the user edits the email.
        if (message || error) {
            setStatus((prev) => ({
                ...prev,
                message: "",
                error: "",
            }));
        }
    };

    return (
        <main className="flex min-h-screen items-center justify-center bg-[#171717] px-4 py-10 text-white">
            <section className="w-full max-w-md rounded-2xl border border-white/10 bg-[#222222] p-6 shadow-2xl sm:p-9">

                {/* Header */}
                <div className="mb-8 text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-600/20">
                        <Bot size={30} aria-hidden="true" />
                    </div>

                    <h1 className="text-3xl font-bold">
                        Forgot Password?
                    </h1>

                    <p className="mt-3 text-sm leading-6 text-gray-400">
                        Enter your registered email address and we'll
                        send instructions to reset your password.
                    </p>
                </div>

                {/* Success Message */}
                {message && (
                    <div
                        role="status"
                        aria-live="polite"
                        className="mb-5 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300"
                    >
                        {message}
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div
                        role="alert"
                        className="mb-5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
                    >
                        {error}
                    </div>
                )}

                {/* Forgot Password Form */}
                <form
                    onSubmit={handleSubmit}
                    className="space-y-5"
                >
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
                                value={email}
                                onChange={handleEmailChange}
                                placeholder="you@example.com"
                                autoComplete="email"
                                inputMode="email"
                                maxLength={254}
                                required
                                disabled={loading}
                                className="w-full rounded-lg border border-white/10 bg-[#191919] py-3 pl-10 pr-4 text-white outline-none transition placeholder:text-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {loading ? (
                            <>
                                <LoaderCircle
                                    size={18}
                                    aria-hidden="true"
                                    className="animate-spin"
                                />

                                <span>
                                    Sending instructions...
                                </span>
                            </>
                        ) : (
                            "Send Reset Link"
                        )}
                    </button>
                </form>

                {/* Back to Login */}
                <div className="mt-7 text-center">
                    <Link
                        to="/login"
                        className="inline-flex items-center gap-2 text-sm text-blue-400 transition hover:text-blue-300"
                    >
                        <ArrowLeft
                            size={16}
                            aria-hidden="true"
                        />

                        Back to Login
                    </Link>
                </div>
            </section>
        </main>
    );
}

export default ForgotPassword;

