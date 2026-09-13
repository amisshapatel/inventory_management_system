import React from 'react';
import { BrandLogoIcon, SpinnerIcon } from './Icons';

/**
 * ScreenLoader: Full-screen branded loading experience
 * Used during initial authentication check, app boot, and route preparation.
 */
export const ScreenLoader = ({ message = "Loading StockPilot...", subtitle = "Initializing secure warehouse workspace..." }) => {
  return (
    <div className="screen-loader-overlay">
      <div className="screen-loader-card">
        {/* Orbital Brand Emblem */}
        <div className="screen-loader-emblem-wrap">
          <div className="screen-loader-halo"></div>
          <div className="screen-loader-orbit-ring"></div>
          <div className="screen-loader-orbit-ring-reverse"></div>
          <div className="screen-loader-logo">
            <BrandLogoIcon size={48} />
          </div>
        </div>

        {/* Brand Typography */}
        <div className="screen-loader-text">
          <h2 className="screen-loader-title">StockPilot</h2>
          <p className="screen-loader-message">{message}</p>
          <span className="screen-loader-subtitle">{subtitle}</span>
        </div>

        {/* Modern Shimmer Progress Indicator */}
        <div className="screen-loader-progress-track">
          <div className="screen-loader-progress-bar"></div>
        </div>
      </div>
    </div>
  );
};

/**
 * ContentLoader: In-page loader for tables, cards, and query sections
 */
export const Loader = ({ 
  message = "Loading data...", 
  subtitle = "Querying latest inventory updates...",
  size = "md",
  className = ""
}) => {
  return (
    <div className={`content-loader-container content-loader-${size} ${className}`}>
      <div className="content-loader-spinner-wrap">
        <div className="content-loader-ring"></div>
        <div className="content-loader-ring-inner"></div>
        <div className="content-loader-core-dot"></div>
      </div>
      <div className="content-loader-info">
        <h4 className="content-loader-title">{message}</h4>
        {subtitle && <p className="content-loader-sub">{subtitle}</p>}
      </div>
    </div>
  );
};

/**
 * Spinner: Lightweight inline spinner for buttons and badges
 */
export const Spinner = ({ size = 18, color = "currentColor", className = "" }) => {
  return (
    <SpinnerIcon 
      size={size} 
      className={`inline-spinner ${className}`} 
      style={{ color }} 
    />
  );
};

/**
 * SkeletonCard: Shimmer placeholder for dashboard metric cards
 */
export const SkeletonCard = () => {
  return (
    <div className="skeleton-card">
      <div className="skeleton-header">
        <div className="skeleton-line skeleton-title"></div>
        <div className="skeleton-box skeleton-icon"></div>
      </div>
      <div className="skeleton-line skeleton-value"></div>
      <div className="skeleton-line skeleton-trend"></div>
    </div>
  );
};

/**
 * SkeletonTable: Shimmer placeholder for data tables
 */
export const SkeletonTable = ({ rows = 5, cols = 5 }) => {
  return (
    <div className="skeleton-table-wrap">
      <div className="skeleton-table-header">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="skeleton-line skeleton-th"></div>
        ))}
      </div>
      <div className="skeleton-table-body">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="skeleton-table-row">
            {Array.from({ length: cols }).map((_, c) => (
              <div key={c} className="skeleton-line skeleton-td"></div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Loader;
