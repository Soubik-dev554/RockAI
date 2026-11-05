
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
    Bot,
    LoaderCircle,
    LockKeyhole,
    Eye,
    EyeOff,
    ArrowLeft,
    CheckCircle2,
} from "lucide-react";

const API_URL = "https://3-104-229-106.sslip.io";

function ResetPassword() {
    const { token } = useParams();
    const navigate = useNavigate();

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [status, setStatus] = useState({
        loading: false,
        message: "",
        error: "",
        success: false,
    });

    const { loading, message, error, success } = status;

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (loading) return;

        setStatus({
            loading: false,
            message: "",
            error: "",
            success: false,
        });

        if (!token) {
            setStatus({
                loading: false,
                message: "",
                error: "The password-reset link is invalid or incomplete.",
                success: false,
            });
            return;
        }

        if (password.length < 8) {
            setStatus({
                loading: false,
                message: "",
                error: "Your password must contain at least 8 characters.",
                success: false,
            });
            return;
        }

        if (password.length > 128) {
            setStatus({
                loading: false,
                message: "",
                error: "Your password must not exceed 128 characters.",
                success: false,
            });
            return;
        }

        if (password !== confirmPassword) {
            setStatus({
                loading: false,
                message: "",
                error: "Passwords do not match.",
                success: false,
            });
            return;
        }

        setStatus({
            loading: true,
            message: "",
            error: "",
            success: false,
        });

        try {
            const response = await fetch(
                `${API_URL}/api/reset-password`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        token,
                        password,
                    }),
                    signal: AbortSignal.timeout(15000),
                }
            );

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    "Unable to reset your password. The link may have expired."
                );
            }

            // Redirect only after the backend confirms success.
            navigate("/login", {
                replace: true,
                state: {
                    message: "Password reset successfully. Please log in with your new password.",
                },
            });

            setPassword("");
            setConfirmPassword("");

            setStatus({
                loading: false,
                message:
                    data.message ||
                    "Your password has been reset successfully.",
                error: "",
                success: true,
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
                    "Unable to connect to RockAI. Please try again.";
            } else {
                errorMessage =
                    err.message ||
                    "Something went wrong. Please try again.";
            }

            setStatus({
                loading: false,
                message: "",
                error: errorMessage,
                success: false,
            });
        }
    };

    if (!token) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-[#171717] px-4 py-10 text-white">
                <section className="w-full max-w-md rounded-2xl border border-white/10 bg-[#222222] p-6 text-center shadow-2xl sm:p-9">
                    <Bot
                        size={42}
                        aria-hidden="true"
                        className="mx-auto mb-4 text-blue-400"
                    />

                    <h1 className="text-2xl font-bold">
                        Invalid Reset Link
                    </h1>

                    <p className="mt-3 text-sm leading-6 text-gray-400">
                        This password-reset link is incomplete. Please
                        request a new one.
                    </p>

                    <Link
                        to="/forgot-password"
                        className="mt-6 inline-flex rounded-lg bg-blue-600 px-5 py-3 font-semibold transition hover:bg-blue-500"
                    >
                        Request a New Link
                    </Link>
                </section>
            </main>
        );
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-[#171717] px-4 py-10 text-white">
            <section className="w-full max-w-md rounded-2xl border border-white/10 bg-[#222222] p-6 shadow-2xl sm:p-9">
                {/* Header */}
                <div className="mb-8 text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-600/20">
                        <Bot size={30} aria-hidden="true" />
                    </div>

                    <h1 className="text-3xl font-bold">
                        Reset Password
                    </h1>

                    <p className="mt-3 text-sm leading-6 text-gray-400">
                        Create a new password for your RockAI account.
                    </p>
                </div>

                {/* Success Message */}
                {success && (
                    <div
                        role="status"
                        aria-live="polite"
                        className="mb-5 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300"
                    >
                        <div className="flex items-start gap-2">
                            <CheckCircle2
                                size={18}
                                aria-hidden="true"
                                className="mt-0.5 shrink-0"
                            />

                            <span>{message}</span>
                        </div>
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

                {!success ? (
                    <form
                        onSubmit={handleSubmit}
                        className="space-y-5"
                    >
                        {/* New Password */}
                        <div>
                            <label
                                htmlFor="password"
                                className="mb-2 block text-sm font-medium text-gray-200"
                            >
                                New Password
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
                                    value={password}
                                    onChange={(e) =>
                                        setPassword(e.target.value)
                                    }
                                    placeholder="Enter new password"
                                    autoComplete="new-password"
                                    minLength={8}
                                    maxLength={128}
                                    required
                                    disabled={loading}
                                    className="w-full rounded-lg border border-white/10 bg-[#191919] py-3 pl-10 pr-12 text-white outline-none transition placeholder:text-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60"
                                />

                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowPassword((prev) => !prev)
                                    }
                                    aria-label={
                                        showPassword
                                            ? "Hide new password"
                                            : "Show new password"
                                    }
                                    aria-pressed={showPassword}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-white"
                                >
                                    {showPassword ? (
                                        <EyeOff size={18} />
                                    ) : (
                                        <Eye size={18} />
                                    )}
                                </button>
                            </div>

                            <p className="mt-2 text-xs text-gray-500">
                                Use at least 8 characters.
                            </p>
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label
                                htmlFor="confirmPassword"
                                className="mb-2 block text-sm font-medium text-gray-200"
                            >
                                Confirm New Password
                            </label>

                            <div className="relative">
                                <LockKeyhole
                                    size={18}
                                    aria-hidden="true"
                                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                                />

                                <input
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type={
                                        showConfirmPassword
                                            ? "text"
                                            : "password"
                                    }
                                    value={confirmPassword}
                                    onChange={(e) =>
                                        setConfirmPassword(e.target.value)
                                    }
                                    placeholder="Confirm new password"
                                    autoComplete="new-password"
                                    maxLength={128}
                                    required
                                    disabled={loading}
                                    className="w-full rounded-lg border border-white/10 bg-[#191919] py-3 pl-10 pr-12 text-white outline-none transition placeholder:text-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60"
                                />

                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowConfirmPassword((prev) => !prev)
                                    }
                                    aria-label={
                                        showConfirmPassword
                                            ? "Hide confirmation password"
                                            : "Show confirmation password"
                                    }
                                    aria-pressed={showConfirmPassword}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-white"
                                >
                                    {showConfirmPassword ? (
                                        <EyeOff size={18} />
                                    ) : (
                                        <Eye size={18} />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Submit */}
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

                                    <span>Resetting Password...</span>
                                </>
                            ) : (
                                "Reset Password"
                            )}
                        </button>
                    </form>
                ) : (
                    <Link
                        to="/login"
                        replace
                        className="flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-500"
                    >
                        Continue to Login
                    </Link>
                )}

                {!success && (
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
                )}
            </section>
        </main>
    );
}

export default ResetPassword;

