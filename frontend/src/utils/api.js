export const API_URL = 'http://localhost:5000/api';

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
        throw new Error(data.error || 'API Request Failed');
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
    localStorage.removeItem('chrono_token');
    localStorage.removeItem('chrono_user');
    window.location.href = '/login';
};
