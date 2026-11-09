 const API_BASE_URL = "https://3-104-229-106.sslip.io/api";
let unauthorizedHandler = null;

export const setUnauthorizedHandler = (handler) => {
    unauthorizedHandler = handler;
};

export async function apiRequest(endpoint, options = {}) {
    const {
        requireAuth = true,
        ...fetchOptions
    } = options;

    const token = localStorage.getItem("token");

    const headers = {
        ...fetchOptions.headers,
    };

    // Attach JWT to protected requests.
    if (requireAuth && token) {
        headers.Authorization = `Bearer ${token}`;
    }

    // Set JSON content type when sending JSON.
    if (
        fetchOptions.body &&
        !(fetchOptions.body instanceof FormData)
    ) {
        headers["Content-Type"] = "application/json";
    }

    let response;

    try {
        response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...fetchOptions,
            headers,
        });
    } catch {
        throw new Error(
            "Unable to connect to the server. Please try again."
        );
    }

    const data = await response.json().catch(() => ({}));

    // Only protected requests trigger automatic logout.
    if (response.status === 401 && requireAuth) {
        unauthorizedHandler?.();

        throw new Error(
            "Your session has expired. Please log in again."
        );
    }

    if (!response.ok) {
        throw new Error(
            data.message ||
            data.error ||
            `Request failed with status ${response.status}`
        );
    }

    return data;
}