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
    subtitle = 'Academic Timetable Suite',
    className = ''
}) => (
    <div className={`brand-lockup ${compact ? 'brand-lockup-compact' : ''} ${centered ? 'justify-center text-center' : ''} ${className}`}>
        <div className={`brand-mark ${compact ? 'brand-mark-compact' : ''}`}>
            <span className="brand-shell" />
            <span className="brand-header" />
            <span className="brand-crest" />
            <span className="brand-cell brand-cell-a" />
            <span className="brand-cell brand-cell-b" />
            <span className="brand-cell brand-cell-c" />
            <span className="brand-cell brand-cell-d" />
        </div>
        <div className={centered ? 'text-center' : ''}>
            <div className="brand-wordmark">ChronoCampus</div>
            {subtitle ? <div className="brand-tagline">{subtitle}</div> : null}
        </div>
    </div>
);

export default BrandMark;
