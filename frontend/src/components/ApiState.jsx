import React from 'react';

export const LoadingSkeleton = ({ rows = 3 }) => (
    <div className="space-y-4">
        {Array.from({ length: rows }).map((_, index) => (
            <div key={index} className="h-24 skeleton" />
        ))}
    </div>
);

export const ErrorBanner = ({ message, onRetry }) => (
    <div className="rounded-2xl border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
        <div className="flex flex-wrap items-center justify-between gap-3">
            <span>{message || 'Something went wrong.'}</span>
            {onRetry && (
                <button
                    type="button"
                    onClick={onRetry}
                    className="rounded-xl border border-danger/40 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white"
                >
                    Retry
                </button>
            )}
        </div>
    </div>
);
