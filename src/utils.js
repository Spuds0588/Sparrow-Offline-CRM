// Sparrow CRM — utils & constants. NOTE: this file OPENS the IIFE that
// main.js closes; tools/build.py concatenates utils→core→ui→events→main.
(function() {
        "use strict";
        
        const APP_VERSION = '1.2.0';
        const LOG_PREFIX = `[SparrowCRM v${APP_VERSION}]`;
        const CONTACTS_PER_PAGE = 50;
        const FIELD_TYPES = ['text', 'longtext', 'number', 'date', 'phone', 'email', 'url', 'boolean', 'currency'];
        
        // All user data is untrusted when interpolated into HTML templates.
        const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, ch => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[ch]));
        // For values placed inside quoted attributes (same encoding covers both).
        const escapeAttr = escapeHTML;
        
        let AppState, DOM;

        const Utils = {
            generateUUID: () => crypto.randomUUID(),
            showModal: (modal) => modal.classList.add("visible"),
            hideModal: (modal) => {
                modal.classList.remove("visible");
                if (modal.id === 'contactDetailModal') {
                    history.pushState("", document.title, window.location.pathname + window.location.search);
                    AppState.ui.navigationHistory = []; // Clear nav history when main modal is closed
                }
                // NOTE: deliberately does NOT touch the unsaved-changes flag.
                // Closing a modal after committing a change (task, activity,
                // field edit) must not un-mark real unsaved data — the flag
                // tracks file-level state, not in-progress editor state.
            },
            debounce: (func, delay) => {
                let timeout;
                return function(...args) {
                    const context = this;
                    clearTimeout(timeout);
                    timeout = setTimeout(() => func.apply(context, args), delay);
                };
            },
            showConfirm: (title, message, okClass = 'btn-primary') => {
                return new Promise((resolve) => {
                    DOM.confirmModal.title.textContent = title;
                    DOM.confirmModal.message.textContent = message;
                    DOM.confirmModal.okBtn.className = `btn ${okClass}`;
                    Utils.showModal(DOM.confirmModal.el);

                    const okHandler = () => { cleanup(); resolve(true); };
                    const cancelHandler = () => { cleanup(); resolve(false); };
                    
                    DOM.confirmModal.okBtn.addEventListener('click', okHandler, { once: true });
                    DOM.confirmModal.cancelBtn.addEventListener('click', cancelHandler, { once: true });
                    
                    function cleanup() {
                        Utils.hideModal(DOM.confirmModal.el);
                    }
                });
            },
            formatFieldValue: (value, type) => {
                if (value === null || value === undefined) value = '';
                
                switch (type) {
                    case 'currency': {
                        const num = parseFloat(String(value).replace(/[^0-9.-]+/g,""));
                        return isNaN(num) ? escapeHTML(value) : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
                    }
                    case 'date': {
                        if (!value) return '';
                        const d = new Date(value);
                        if (d instanceof Date && !isNaN(d.getTime())) {
                            const utcDate = new Date(d.valueOf() + d.getTimezoneOffset() * 60000); // Adjust for timezone for display
                            return utcDate.toLocaleDateString('en-US', { year: '2-digit', month: 'numeric', day: 'numeric' });
                        }
                        return value;
                    }
                    case 'boolean': {
                        return value === true || String(value).toLowerCase() === 'true' ? 'Yes' : 'No';
                    }
                    case 'url': {
                        if (!value) return '';
                        let href = value;
                        if (!/^https?:\/\//i.test(href)) {
                            href = `https://${href}`;
                        }
                        return `<a href="${escapeAttr(href)}" target="_blank" rel="noopener noreferrer">${escapeHTML(value)}</a>`;
                    }
                    default: return escapeHTML(value);
                }
            },
            getContactDisplayName: (contact) => {
                if (!contact || !contact.fields) return "Unknown Contact";
                const primarySection = AppState.settings.sections[0];
                if(primarySection && primarySection.fields.length > 0) {
                    const primaryFieldName = primarySection.fields[0];
                    const primaryValue = contact.fields[primaryFieldName];
                    if (primaryValue) return primaryValue;
                }
                // Fallback logic
                const firstName = contact.fields['First Name'] || contact.fields.firstName || '';
                const lastName = contact.fields['Last Name'] || contact.fields.lastName || '';
                const fullName = `${firstName} ${lastName}`.trim();
                if (fullName) return fullName;
                const email = contact.fields['Email'] || contact.fields.email || '';
                if (email) return email;
                return `Contact ${contact.sparrow_contact_id.substring(0, 8)}`;
            }
        };
