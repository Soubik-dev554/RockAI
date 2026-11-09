import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    Bot,
    Eye,
    EyeOff,
    LoaderCircle,
    LockKeyhole,
    Mail,
    UserRound,
} from "lucide-react";
import { apiRequest } from "../services/api";

function Register() {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
    });

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const [otpSent, setOtpSent] = useState(false);
    const [otp, setOtp] = useState("");
    const [verifying, setVerifying] = useState(false);

    const [resendLoading, setResendLoading] = useState(false);
    const [resendCountdown, setResendCountdown] = useState(60);
    const [otpMessage, setOtpMessage] = useState("");

    // OTP resend countdown
    useEffect(() => {
        if (!otpSent || resendCountdown <= 0) return;

        const timer = setTimeout(() => {
            setResendCountdown((prev) => prev - 1);
        }, 1000);

        return () => clearTimeout(timer);
    }, [otpSent, resendCountdown]);

    const handleChange = (e) => {
        const { name, value } = e.target;

        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));

        if (error) setError("");
    };

    // Step 1: Send OTP
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (loading) return;

        setError("");
        setOtpMessage("");

        const name = formData.name.trim();
        const email = formData.email.trim().toLowerCase();
        const password = formData.password;
        const confirmPassword = formData.confirmPassword;

        if (!name || !email || !password) {
            setError("Please complete all required fields.");
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        if (password.length < 8) {
            setError("Password must contain at least 8 characters.");
            return;
        }

        setLoading(true);

        try {
            await apiRequest("/send-otp", {
                method: "POST",
                requireAuth: false,
                body: JSON.stringify({
                    name,
                    email,
                    password,
                }),
            });

            setOtp("");
            setOtpSent(true);
            setResendCountdown(60);
            setOtpMessage("Verification code sent successfully.");

        } catch (err) {
            setError(err.message || "Something went wrong.");
        } finally {
            setLoading(false);
        }
    };

    // Step 2: Verify OTP and create account
    const handleVerifyOTP = async (e) => {
        e.preventDefault();

        if (verifying) return;

        setError("");
        setOtpMessage("");

        if (!/^\d{6}$/.test(otp)) {
            setError("Please enter a valid 6-digit OTP.");
            return;
        }

        setVerifying(true);

        try {
            // Verify OTP
            await apiRequest("/verify-otp", {
                method: "POST",
                requireAuth: false,
                body: JSON.stringify({
                    email: formData.email.trim().toLowerCase(),
                    otp,
                }),
            });

            // Create account after successful OTP verification
            await apiRequest("/register", {
                method: "POST",
                requireAuth: false,
                body: JSON.stringify({
                    email: formData.email.trim().toLowerCase(),
                }),
            });

            // Redirect to login
            navigate("/login", {
                replace: true,
                state: {
                    message: "Your account has been created successfully. Please log in.",
                },
            });

        } catch (err) {
            setError(err.message || "Something went wrong.");
        } finally {
            setVerifying(false);
        }
    };

    // Step 3: Resend OTP
    const handleResendOTP = async () => {
        if (resendLoading || resendCountdown > 0) return;

        setError("");
        setOtpMessage("");
        setResendLoading(true);

        try {
            await apiRequest("/send-otp", {
                method: "POST",
                requireAuth: false,
                body: JSON.stringify({
                    name: formData.name.trim(),
                    email: formData.email.trim().toLowerCase(),
                    password: formData.password,
                }),
            });

            setOtp("");
            setResendCountdown(60);
            setOtpMessage(
                "A new verification code has been sent to your email."
            );

        } catch (err) {
            setError(err.message || "Unable to resend OTP.");
        } finally {
            setResendLoading(false);
        }
    };

    const inputClass =
        "w-full rounded-lg border border-white/10 bg-[#191919] py-2.5 pl-10 pr-12 text-white outline-none transition placeholder:text-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";

    return (
        <main className="flex min-h-screen items-center justify-center bg-[#171717] px-4 py-4 text-white">

            <section className="w-full max-w-md rounded-2xl border border-white/10 bg-[#222222] p-5 shadow-2xl sm:p-6">

                {/* Brand */}
                <div className="mb-5 text-center">

                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 shadow-lg shadow-blue-600/20">
                        <Bot size={26} aria-hidden="true" />
                    </div>

                    <h1 className="text-3xl font-bold tracking-tight">
                        Join <span className="text-blue-400">RockAI</span>
                    </h1>

                    <p className="mt-2 text-sm text-gray-400">
                        Create an account and start exploring.
                    </p>

                </div>

                {/* Error */}
                {error && (
                    <div
                        role="alert"
                        className="mb-5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
                    >
                        {error}
                    </div>
                )}

                {/* Registration form */}
                {!otpSent ? (

                    <form onSubmit={handleSubmit} className="space-y-3">

                        {/* Name */}
                        <div>

                            <label
                                htmlFor="name"
                                className="mb-2 block text-sm font-medium text-gray-200"
                            >
                                Full name
                            </label>

                            <div className="relative">

                                <UserRound
                                    size={18}
                                    aria-hidden="true"
                                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                                />

                                <input
                                    id="name"
                                    name="name"
                                    type="text"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="Enter your name"
                                    autoComplete="name"
                                    maxLength={100}
                                    required
                                    className={inputClass}
                                />

                            </div>
                        </div>

                        {/* Email */}
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
                                    className={inputClass}
                                />

                            </div>
                        </div>

                        {/* Password */}
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
                                    placeholder="At least 8 characters"
                                    autoComplete="new-password"
                                    minLength={8}
                                    required
                                    className={inputClass}
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
                        </div>

                        {/* Confirm password */}
                        <div>

                            <label
                                htmlFor="confirmPassword"
                                className="mb-2 block text-sm font-medium text-gray-200"
                            >
                                Confirm password
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
                                    type={showConfirmPassword ? "text" : "password"}
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    placeholder="Re-enter your password"
                                    autoComplete="new-password"
                                    minLength={8}
                                    required
                                    className={inputClass}
                                />

                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowConfirmPassword((prev) => !prev)
                                    }
                                    aria-label={
                                        showConfirmPassword
                                            ? "Hide confirm password"
                                            : "Show confirm password"
                                    }
                                    aria-pressed={showConfirmPassword}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 transition hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    {showConfirmPassword ? (
                                        <EyeOff size={18} aria-hidden="true" />
                                    ) : (
                                        <Eye size={18} aria-hidden="true" />
                                    )}
                                </button>

                            </div>
                        </div>

                        {/* Submit */}
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

                            {loading ? "Creating account..." : "Create Account"}
                        </button>

                    </form>

                ) : (

                    /* OTP verification form */
                    <form onSubmit={handleVerifyOTP} className="space-y-4">

                        <div className="text-center">

                            <h2 className="text-xl font-semibold">
                                Verify Your Email
                            </h2>

                            <p className="mt-2 text-sm text-gray-400">
                                We've sent a 6-digit verification code to
                                <span className="text-blue-400">
                                    {" "}{formData.email}
                                </span>
                            </p>

                        </div>

                        {/* OTP input */}
                        <input
                            type="text"
                            value={otp}
                            onChange={(e) => {
                                const value = e.target.value
                                    .replace(/\D/g, "")
                                    .slice(0, 6);

                                setOtp(value);
                                setError("");
                            }}
                            placeholder="Enter 6-digit OTP"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            maxLength={6}
                            required
                            className="w-full rounded-lg border border-white/10 bg-[#191919] px-4 py-3 text-center text-xl tracking-[10px] text-white outline-none focus:border-blue-500"
                        />

                        {/* Verify button */}
                        <button
                            type="submit"
                            disabled={verifying || otp.length !== 6}
                            className="flex w-full items-center justify-center gap-2 cursor-pointer rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {verifying && (
                                <LoaderCircle
                                    size={18}
                                    className="animate-spin"
                                    aria-hidden="true"
                                />
                            )}

                            {verifying ? "Verifying..." : "Verify OTP"}
                        </button>

                        {/* Resend success message */}
                        {otpMessage && (
                            <p
                                role="status"
                                className="text-center text-sm text-green-400"
                            >
                                {otpMessage}
                            </p>
                        )}

                        {/* Resend OTP */}
                        <button
                            type="button"
                            onClick={handleResendOTP}
                            disabled={resendLoading || resendCountdown > 0}
                            className="flex w-full items-center justify-center gap-2 cursor-pointer text-sm font-medium text-blue-400 transition hover:text-blue-300 disabled:cursor-not-allowed disabled:text-gray-500"
                        >
                            {resendLoading && (
                                <LoaderCircle
                                    size={16}
                                    className="animate-spin"
                                    aria-hidden="true"
                                />
                            )}

                            {resendLoading
                                ? "Sending OTP..."
                                : resendCountdown > 0
                                    ? `Resend OTP in ${resendCountdown}s`
                                    : "Resend OTP"}
                        </button>

                        {/* Back to registration */}
                        <button
                            type="button"
                            onClick={() => {
                                setOtpSent(false);
                                setOtp("");
                                setError("");
                                setOtpMessage("");
                                setResendCountdown(60);
                            }}
                            className="w-full text-sm cursor-pointer text-gray-400 hover:text-white"
                        >
                            Back to registration
                        </button>

                    </form>
                )}

                {/* Login link */}
                <p className="mt-6 text-center text-sm text-gray-400">

                    Already have an account?{" "}

                    <Link
                        to="/login"
                        className="font-medium text-blue-400 transition hover:text-blue-300"
                    >
                        Sign in
                    </Link>

                </p>

            </section>

        </main>
    );
}

export default Register;