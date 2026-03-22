import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { ToastProvider } from './components/ToastProvider.jsx'
import './index.css'

const rootElement = document.getElementById('root');

if (!rootElement) {
    throw new Error('Failed to find the root element. Make sure there is an element with id="root" in your index.html.');
}

ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
        <ToastProvider>
            <App />
        </ToastProvider>
    </React.StrictMode>,
)
