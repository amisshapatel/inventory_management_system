import React from 'react';
import { XIcon } from './Icons';

const Modal = ({ isOpen, onClose, title, children, footerButtons }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button className="close-btn" onClick={onClose} title="Close dialog" aria-label="Close">
            <XIcon />
          </button>
        </div>

        <div className="modal-body">{children}</div>

        {footerButtons && (
          <div className="modal-footer">{footerButtons}</div>
        )}
      </div>
    </div>
  );
};

export default Modal;
