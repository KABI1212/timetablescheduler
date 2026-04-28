export const API_URL = 'http://localhost:5000/api';

const clearAuthState = () => {
    localStorage.removeItem('chrono_token');
    localStorage.removeItem('chrono_user');
};

const getAuthHeaders = () => {
    const token = localStorage.getItem('chrono_token');
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
};

/**
 * @param {string} endpoint
 * @param {RequestInit} [options={}]
 */
export const apiFetch = async (endpoint, options = {}) => {
    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: {
            ...getAuthHeaders(),
            ...(options.headers || {})
        }
    });

    const data = await response.json();
    if (!response.ok) {
        const message = data.error || 'API Request Failed';
        const isAuthFailure = response.status === 401
            && endpoint !== '/auth/login'
            && endpoint !== '/auth/register';

        if (isAuthFailure) {
            clearAuthState();
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
            throw new Error('Session expired. Please sign in again.');
        }
        throw new Error(message);
    }
    return data;
};

/**
 * Quick Auth
 * @param {string} email
 * @param {string} password
 */
export const login = async (email, password) => {
    const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
    });
    localStorage.setItem('chrono_token', data.token);
    localStorage.setItem('chrono_user', JSON.stringify(data.user));
    return data;
};

export const logout = () => {
    clearAuthState();
    window.location.href = '/login';
};
