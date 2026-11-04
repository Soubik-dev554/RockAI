const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

export async function sendEmail({ to, subject, text, html }) {
    if (
        typeof to !== "string" ||
        !to.trim() ||
        typeof subject !== "string" ||
        !subject.trim() ||
        (!text && !html)
    ) {
        throw new Error(
            "Recipient, subject, and email content are required."
        );
    }

    const apiKey = process.env.BREVO_API_KEY;
    const senderEmail = process.env.BREVO_SENDER_EMAIL;

    if (!apiKey || !senderEmail) {
        throw new Error(
            "Missing BREVO_API_KEY or BREVO_SENDER_EMAIL configuration."
        );
    }

    const emailPayload = {
        sender: {
            name: "RockAI",
            email: senderEmail,
        },
        to: [{ email: to.trim() }],
        subject,
    };

    if (text) emailPayload.textContent = text;
    if (html) emailPayload.htmlContent = html;

    const response = await fetch(BREVO_API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "api-key": apiKey,
            Accept: "application/json",
        },
        body: JSON.stringify(emailPayload),
        signal: AbortSignal.timeout(20000),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
        const error = new Error(
            result.message || "Brevo failed to submit the email."
        );

        error.status = response.status;
        throw error;
    }

    return result;
}

