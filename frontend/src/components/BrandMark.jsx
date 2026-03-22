import React from 'react';

/**
 * @param {Object} props
 * @param {boolean} [props.compact]
 * @param {boolean} [props.centered]
 * @param {string} [props.subtitle]
 * @param {string} [props.className]
 */
const BrandMark = ({
    compact = false,
    centered = false,
    subtitle = 'Smart Timetable OS',
    className = ''
}) => (
    <div className={`brand-lockup ${compact ? 'brand-lockup-compact' : ''} ${centered ? 'justify-center text-center' : ''} ${className}`}>
        <div className={`brand-mark ${compact ? 'brand-mark-compact' : ''}`}>
            <span className="brand-core" />
            <span className="brand-orbit brand-orbit-a" />
            <span className="brand-orbit brand-orbit-b" />
            <span className="brand-orbit brand-orbit-c" />
            <span className="brand-flare" />
        </div>
        <div className={centered ? 'text-center' : ''}>
            <div className="brand-wordmark">LUMOGEN</div>
            {subtitle ? <div className="brand-tagline">{subtitle}</div> : null}
        </div>
    </div>
);

export default BrandMark;
