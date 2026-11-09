import {
    createContext,
    useState,
    useEffect,
    useCallback
} from "react";
import { setUnauthorizedHandler } from "../services/api";

const AuthContext = createContext(null);

// Decode JWT expiration time
const getTokenExpiration = (token) => {
    try {
        const payload = JSON.parse(atob(token.split(".")[1]));

        return typeof payload.exp === "number"
            ? payload.exp * 1000
            : null;

    } catch {
        return null;
    }
};

// Safely read stored user information
const getSavedUser = () => {
    try {
        const savedUser = localStorage.getItem("user");

        return savedUser ? JSON.parse(savedUser) : null;
    } catch {
        return null;
    }
};

const getValidToken = () => {
    try {
        const token = localStorage.getItem("token");

        if (!token) return null;

        const expirationTime = getTokenExpiration(token);

        return expirationTime && expirationTime > Date.now()
            ? token
            : null;

    } catch {
        return null;
    }
};

export function AuthProvider({ children }) {

    const [token, setToken] = useState(getValidToken);

    const [user, setUser] = useState(() => {
        return getValidToken() ? getSavedUser() : null;
    });

    // Centralized logout
    const logout = useCallback(() => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        setToken(null);
        setUser(null);
    }, []);

    // Centralized login
    const login = useCallback((userData, accessToken) => {

        const expirationTime = getTokenExpiration(accessToken);

        if (!userData || !expirationTime || expirationTime <= Date.now()) {
            throw new Error("Invalid or expired authentication token.");
        }

        localStorage.setItem("token", accessToken);
        localStorage.setItem("user", JSON.stringify(userData));

        setUser(userData);
        setToken(accessToken);

    }, []);

    // Automatically logout when JWT expires
    useEffect(() => {
        if (!token) return;

        const expirationTime = getTokenExpiration(token);

        if (!expirationTime || expirationTime <= Date.now()) {
            const timer = setTimeout(() => {
                logout();
            }, 0);

            return () => clearTimeout(timer);
        }

        const remainingTime = expirationTime - Date.now();

        const timer = setTimeout(() => {
            logout();
        }, remainingTime);

        return () => clearTimeout(timer);

    }, [token, logout]);
    useEffect(() => {
        setUnauthorizedHandler(logout);

        return () => {
            setUnauthorizedHandler(null);
        };
    }, [logout]);

    const authValue = {
        user,
        token,
        login,
        logout,
        isAuthenticated: Boolean(token)
    };

    return (
        <AuthContext.Provider value={authValue}>
            {children}
        </AuthContext.Provider>
    );
}

export default AuthContext;