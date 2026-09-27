// Sparrow CRM — rendering.
const UI = {
            showNotification: (message, type = 'info', duration = 3000) => {
                const id = 'notif-' + Utils.generateUUID();
                const notification = document.createElement('div');
                notification.id = id;
                notification.className = `notification ${type}`;
                notification.textContent = message;
                DOM.notificationContainer.appendChild(notification);
                setTimeout(() => notification.classList.add('visible'), 10);
                if (duration > 0) {
                    setTimeout(() => UI.hideNotification(id), duration);
                }
                return id;
            },
            hideNotification: (id) => {
                const notification = document.getElementById(id);
                if (notification) {
                    notification.classList.remove('visible');
                    notification.addEventListener('transitionend', () => notification.remove());
                }
            },
            setFavicon: () => {
                // Remove any previously injected favicon links (a saved file can
                // accumulate one per session), then append the fresh one.
                document.querySelectorAll('link[rel="icon"]').forEach(l => l.remove());
                const svgElement = document.querySelector('.logo-area svg');
                if (!svgElement) return;
                const svgClone = svgElement.cloneNode(true);
                svgClone.setAttribute('fill', '#f0f8ff'); // Use a hardcoded color for reliability
                const svgString = new XMLSerializer().serializeToString(svgClone);
                const encodedSvg = encodeURIComponent(svgString).replace(/'/g, '%27').replace(/"/g, '%22');
                const link = document.createElement('link');
                link.rel = 'icon';
                link.type = 'image/svg+xml';
                link.href = `data:image/svg+xml,${encodedSvg}`;
                document.head.appendChild(link);
                console.log(`${LOG_PREFIX} Favicon set successfully.`);
            },
            resetToWelcomeScreen: () => {
                Utils.hideModal(DOM.contactDetailModal);
                DOM.appScreen.classList.add("hidden");
                DOM.taskScreen.classList.add("hidden");
                DOM.settingsScreen.classList.add("hidden");
                DOM.welcomeScreen.classList.remove("hidden");
            },
            renderApp: () => {
                DOM.welcomeScreen.classList.add("hidden");
                DOM.taskScreen.classList.add("hidden");
                DOM.settingsScreen.classList.add("hidden");
                DOM.appScreen.classList.remove("hidden");
                UI.renderContactGrid();
            },
            renderContactGrid: (loadMore = false) => {
                const filterText = DOM.mainSearchInput.value.toLowerCase();
                if (filterText !== AppState.ui.currentFilter || !loadMore) {
                    AppState.ui.currentFilter = filterText;
                    AppState.ui.renderedContactsCount = 0;
                    DOM.contactGrid.innerHTML = "";
                }
                let filteredContacts = AppState.contacts.filter(contact => 
                    Object.values(contact.fields).some(val => String(val).toLowerCase().includes(filterText)) ||
                    contact.tags.some(tag => tag.toLowerCase().includes(filterText)) ||
                    (contact.notes && contact.notes.toLowerCase().includes(filterText))
                );
                filteredContacts = UI.sortContacts(filteredContacts);
                const primarySection = AppState.settings.sections[0];
                const fieldsToShowOnCard = primarySection ? primarySection.fields.slice(1,4) : [];
                const contactsToRender = filteredContacts.slice(AppState.ui.renderedContactsCount, AppState.ui.renderedContactsCount + CONTACTS_PER_PAGE);
                const fragment = document.createDocumentFragment();
                contactsToRender.forEach(contact => {
                    const card = document.createElement("div");
                    card.className = "contact-card";
                    card.dataset.contactId = contact.sparrow_contact_id;
                    const tagsHTML = `<div class="contact-card-tags">${contact.tags.map(tag => `<span class="tag-badge">${escapeHTML(tag)}</span>`).join("")}</div>`;
                    let fieldsHTML = `${tagsHTML}<h3>${escapeHTML(Utils.getContactDisplayName(contact))}</h3><div class="contact-card-fields">`;
                    fieldsToShowOnCard.forEach(fieldName => {
                        const fieldDef = AppState.settings.fieldDefinitions[fieldName];
                        if(!fieldDef) return;
                        const value = contact.fields[fieldName];
                        if (value) {
                            fieldsHTML += `<div class="contact-card-field"><strong>${escapeHTML(fieldDef.name)}:</strong> ${Utils.formatFieldValue(value, fieldDef.type)}</div>`;
                        }
                    });
                    card.innerHTML = fieldsHTML + "</div>";
                    fragment.appendChild(card);
                });
                DOM.contactGrid.appendChild(fragment);
                AppState.ui.renderedContactsCount += contactsToRender.length;
                DOM.loadMoreContainer.classList.toggle("hidden", AppState.ui.renderedContactsCount >= filteredContacts.length);
            },
            sortContacts: (contacts) => {
                // Sort mode lives in transient ui state (never saved). Default
                // 'import-order' preserves the array order, matching pre-1.2 behavior.
                const mode = AppState.ui.sortMode || 'import-order';
                if (mode === 'import-order') return contacts;
                const name = c => (Utils.getContactDisplayName(c) || '').toLowerCase();
                const sorted = [...contacts];
                if (mode === 'name-asc') sorted.sort((a, b) => name(a).localeCompare(name(b)));
                else if (mode === 'name-desc') sorted.sort((a, b) => name(b).localeCompare(name(a)));
                else if (mode === 'recently-added') sorted.reverse();
                return sorted;
            },
            renderContactModal: (contactId) => {
                const contact = AppState.contacts.find(c => c.sparrow_contact_id === contactId);
                if (!contact) return;
                
                let backButtonHTML = '';
                if(AppState.ui.navigationHistory.length > 0) {
                    const previousContactId = AppState.ui.navigationHistory[AppState.ui.navigationHistory.length - 1];
                    const previousContact = AppState.contacts.find(c => c.sparrow_contact_id === previousContactId);
                    if(previousContact) {
                        backButtonHTML = `<button id="modal-back-btn" class="btn btn-secondary" style="margin-right: auto;">&larr; Back to ${escapeHTML(Utils.getContactDisplayName(previousContact))}</button>`;
                    }
                }
                
                const sectionsInOrder = AppState.settings.sections.sort((a, b) => a.order - b.order);
                const jumpLinksHTML = `<div class="jump-links-bar"><span>Jump to:</span>${sectionsInOrder.map(s => `<a href="#section-${escapeAttr(s.name.replace(/\s/g, '-'))}">${escapeHTML(s.name)}</a>`).join('')}</div>`;
                const sectionsHTML = sectionsInOrder.map(section => {
                    const sectionFieldsHTML = section.fields.map(fieldName => {
                        const fieldDef = AppState.settings.fieldDefinitions[fieldName];
                        if (!fieldDef || !fieldDef.visible) return "";
                        const value = contact.fields[fieldName];
                        const formattedValue = Utils.formatFieldValue(value, fieldDef.type);
                        
                        let contextualActions = `<button title="Copy" data-action="copy" data-value="${escapeAttr(value || '')}">📋</button>`;
                        if (fieldDef.type === 'email' && value) contextualActions += `<a href="mailto:${value}" title="Email"><button>📧</button></a>`;
                        if (fieldDef.type === 'phone' && value) contextualActions += `<a href="tel:${value}" title="Call"><button>📞</button></a>`;
                        if (fieldDef.type === 'url' && value) contextualActions += `<button title="Edit URL" data-action="edit">✏️</button>`;

                        return `<div class="detail-field-group" data-field-name="${escapeAttr(fieldDef.name)}" data-field-type="${fieldDef.type}" title="${escapeAttr(fieldDef.name)}">
                                    <div class="detail-field-label">${fieldDef.name}</div>
                                    <div class="detail-field-value">
                                        <span class="value-text no-scrollbar">${formattedValue}</span>
                                        <div class="contextual-actions">${contextualActions}</div>
                                    </div>
                                </div>`;
                    }).join('');
                    
                    return `<div class="contact-section" id="section-${escapeAttr(section.name.replace(/\s/g, '-'))}"><h3>${escapeHTML(section.name)}</h3><div class="detail-section-content">${sectionFieldsHTML}</div></div>`;
                }).join('');
                
                const allRelationships = Core.getRelationshipsForContact(contactId);
                const relationshipsHTML = `<div class="detail-section-content">${allRelationships.map(rel => `
                    <div class="detail-field-group">
                        <div class="detail-field-label" title="${escapeAttr(rel.label)}">${escapeHTML(rel.label)}:</div>
                        <div class="detail-field-value" style="pointer-events:all;cursor:default">
                            <a href="#${rel.linkedContact.sparrow_contact_id}" data-contact-id="${rel.linkedContact.sparrow_contact_id}" class="relationship-link">${escapeHTML(Utils.getContactDisplayName(rel.linkedContact))}</a>
                        </div>
                    </div>`).join('') || `<i>No relationships yet.</i>`}</div>`;

                const tasks = AppState.tasks.filter(t => t.sparrow_contact_id === contactId).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
                const tasksHTML = `<div class="detail-section-content"><ul class="item-list">${tasks.map(task => {
                    const isComplete = task.status === 'Completed';
                    const toggleIcon = isComplete ? '⟲' : '✓';
                    return `<li data-task-id="${task.sparrow_task_id}">
                                <span class="item-actions"><button data-action="toggle-task" title="Mark ${isComplete ? 'Incomplete' : 'Complete'}">${toggleIcon}</button></span>
                                <span class="item-title" style="${isComplete ? 'text-decoration:line-through;opacity:0.6;' : ''}">${escapeHTML(task.title)}</span>
                                <span class="item-date" data-action="edit-task-date">${task.dueDate ? Utils.formatFieldValue(task.dueDate, 'date') : 'No date'}</span>
                                <span class="item-actions"><button data-action="delete-task" title="Delete Task">🗑️</button></span>
                            </li>`;
                }).join('')}</ul></div>`;

                const activities = AppState.activities.filter(a => a.sparrow_contact_id === contactId); // Already sorted on add
                const activitiesHTML = `<div class="detail-section-content"><ul class="item-list">${activities.map(act => `
                    <li data-activity-id="${act.sparrow_activity_id}">
                        <span class="item-title"><strong>${escapeHTML(act.type)}:</strong> ${escapeHTML(act.description)}</span>
                        <span class="item-date">${Utils.formatFieldValue(act.date, 'date')}</span>
                        <span class="item-actions"><button data-action="delete-activity" title="Delete Activity">🗑️</button></span>
                    </li>`).join('')}</ul></div>`;
                
                // Escape user content, but keep the intentional <i> markup for the empty state.
                const notesPreview = contact.notes
                    ? escapeHTML(contact.notes.substring(0, 200)) + (contact.notes.length > 200 ? '...' : '')
                    : '<i>No notes yet. Click to add.</i>';
                const notesHTML = `<div class="detail-section-content"><div class="value-text no-scrollbar">${notesPreview}</div></div>`;
                const saveButtonText = AppState.ui.fileHandle ? "Save Changes" : "Grant Permission & Save";
                const versionChip = `<span style="margin-right:auto;opacity:0.65;font-size:0.85rem;">Sparrow CRM v${APP_VERSION}</span>`;
                const modalHTML = `
                    <div class="modal-header">
                        ${backButtonHTML}
                        <h2>${escapeHTML(Utils.getContactDisplayName(contact))}</h2>
                        <div class="actions-area">
                            <button id="add-task-btn-modal" class="btn btn-secondary">+ Task</button>
                            <button id="log-activity-btn-modal" class="btn btn-secondary">+ Activity</button>
                            <button id="add-field-btn-modal" class="btn btn-secondary">+ Field</button>
                            <button id="add-relationship-btn-modal" class="btn btn-secondary">+ Relationship</button>
                        </div>
                        <button class="modal-close-btn">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="main-column no-scrollbar">
                            ${jumpLinksHTML}
                            <div id="contact-fields-container">${sectionsHTML}</div>
                            <div class="danger-zone-section"><h3 style="color:var(--danger-color)">Danger Zone</h3><button id="modal-delete-contact-btn" class="btn btn-danger">Delete This Contact</button></div>
                        </div>
                        <div class="sidebar-column no-scrollbar">
                            <div class="detail-section" data-section="relationships"><h3>Relationships</h3>${relationshipsHTML}</div>
                            <div class="detail-section" data-section="tasks"><h3>Tasks</h3>${tasksHTML}</div>
                            <div class="detail-section" data-section="activities"><h3>Activity Log</h3>${activitiesHTML}</div>
                            <div class="detail-section" data-section="notes"><h3>Notes</h3>${notesHTML}</div>
                        </div>
                    </div>
                    <div class="modal-footer">${versionChip}<button id="modal-save-changes-btn" class="btn btn-primary" ${!AppState.ui.unsavedChanges ? 'disabled' : ''}>${saveButtonText}</button></div>`;
                
                DOM.contactDetailModal.querySelector(".modal-content").innerHTML = modalHTML;
                Events.setupContactModalEventListeners(contactId);
                Utils.showModal(DOM.contactDetailModal);
            },
            renderSettingsPage: () => {
                DOM.appScreen.classList.add('hidden');
                DOM.taskScreen.classList.add('hidden');
                DOM.settingsScreen.classList.remove('hidden');

                const container = DOM.settingsScreen.querySelector('#sections-management-container');
                const jumpLinksContainer = DOM.settingsScreen.querySelector('#settings-jump-links');
                const sectionsInOrder = AppState.settings.sections.sort((a,b) => a.order - b.order);
                const sectionOptions = sectionsInOrder.map(s => `<option value="${escapeAttr(s.name)}">${escapeHTML(s.name)}</option>`).join('');
                
                const staticJumpLinks = `
                    <a href="#settings-data-management">Data Management</a>
                    <a href="#settings-danger-zone">Danger Zone</a>
                `;
                jumpLinksContainer.innerHTML = `<span>Jump to:</span>${sectionsInOrder.map(s => `<a href="#settings-section-${s.name.replace(/\s/g, '-')}">${s.name}</a>`).join('')}${staticJumpLinks}`;

                container.innerHTML = sectionsInOrder.map(section => {
                    const sectionFieldsHTML = section.fields.map((fieldName, index) => {
                                const fieldDef = AppState.settings.fieldDefinitions[fieldName];
                                if (!fieldDef) return '';
                                return `<li data-field-name="${escapeAttr(fieldDef.name)}">
                                            <div class="field-order-controls" style="display:flex;flex-direction:column;">
                                                <button class="field-order-btn" data-action="up" title="Move Up" ${index === 0 ? "disabled" : ""}>▲</button>
                                                <button class="field-order-btn" data-action="down" title="Move Down" ${index === section.fields.length - 1 ? "disabled" : ""}>▼</button>
                                            </div>
                                            <span class="field-name">${escapeHTML(fieldDef.name)}</span>
                                            <select class="field-section-select" data-field-name="${escapeAttr(fieldDef.name)}">${sectionOptions}</select>
                                            <select class="field-type-select" data-field-name="${fieldDef.name}">${FIELD_TYPES.map(t => `<option value="${t}" ${fieldDef.type === t ? "selected" : ""}>${t}</option>`).join("")}</select>
                                            <label><input type="checkbox" class="field-visibility-toggle" data-field-name="${fieldDef.name}" ${fieldDef.visible ? "checked" : ""}> Visible</label>
                                            <button class="field-merge-btn" data-action="merge" title="Merge into Notes">🗒️➡️</button>
                                            <button class="field-delete-btn" data-action="delete" title="Delete Field">🗑️</button>
                                        </li>`;
                                }).join('');

                    return `<div class="settings-section" id="settings-section-${escapeAttr(section.name.replace(/\s/g, '-'))}">
                                <h4>${escapeHTML(section.name)}</h4>
                                <div class="detail-section-content">
                                    <ul class="fields-list">${sectionFieldsHTML}</ul>
                                </div>
                            </div>`;
                }).join('');

                container.querySelectorAll('.field-section-select').forEach(select => {
                    const fieldName = select.dataset.fieldName;
                    const fieldSection = sectionsInOrder.find(s => s.fields.includes(fieldName));
                    if (fieldSection) select.value = fieldSection.name;
                });
            },
            showNewContactModal: () => {
                console.log(`${LOG_PREFIX} Showing New Contact modal.`);
                const container = DOM.newContactModal.querySelector('#new-contact-fields-container');
                DOM.newContactModal.querySelector('form').reset();
                const primarySection = AppState.settings.sections.find(s => s.order === 0) || AppState.settings.sections[0];
                const topFields = primarySection ? primarySection.fields.slice(0, 5) : [];

                container.innerHTML = topFields.map(fieldName => {
                        const fieldDef = AppState.settings.fieldDefinitions[fieldName];
                        if (!fieldDef || !fieldDef.visible) return '';
                        
                        if (fieldDef.type === 'boolean') {
                            return `<div class="form-group" style="grid-column: span 1; display: flex; align-items: center; gap: 0.5rem; margin-top: 1.5rem;">
                                        <input type="checkbox" id="new-contact-${fieldDef.name.replace(/\s/g, '')}" name="${fieldDef.name}">
                                        <label for="new-contact-${fieldDef.name.replace(/\s/g, '')}" style="margin-bottom: 0;">${fieldDef.name}</label>
                                    </div>`;
                        }
                        return `<div class="form-group">
                                    <label for="new-contact-${fieldDef.name.replace(/\s/g, '')}">${fieldDef.name}</label>
                                    <input type="${fieldDef.type === 'date' ? 'date' : 'text'}" id="new-contact-${fieldDef.name.replace(/\s/g, '')}" name="${fieldDef.name}">
                                </div>`;
                    }).join('');
                Utils.showModal(DOM.newContactModal);
            },
            showAddTaskModal:() => { DOM.addTaskModal.querySelector('form').reset(); Utils.showModal(DOM.addTaskModal); },
            showLogActivityModal:() => {
                const form = DOM.logActivityModal.querySelector('form');
                form.reset();
                form.querySelector("#new-activity-type").innerHTML = AppState.settings.customActivityTypes.map(t => `<option value="${t}">${t}</option>`).join("");
                form.querySelector("#new-activity-date").value = (new Date()).toISOString().split("T")[0];
                Utils.showModal(DOM.logActivityModal);
            },
            showAddFieldModal:() => {
                const form = DOM.addFieldModal.querySelector('form');
                form.reset();
                form.querySelector("#new-field-type").innerHTML = FIELD_TYPES.map(t => `<option value="${t}">${t}</option>`).join("");
                Utils.showModal(DOM.addFieldModal);
            },
            showAddRelationshipModal:() => {
                const form = DOM.addRelationshipModal.querySelector('form');
                form.reset();
                form.querySelector("#relationship-target-id").value = "";
                form.querySelector("#relationship-search-results").innerHTML = "";
                Utils.showModal(DOM.addRelationshipModal);
            },
            showNotesEditorModal: (contactId) => {
                const contact = AppState.contacts.find(c => c.sparrow_contact_id === contactId);
                if (!contact) return;
                const editor = DOM.notesEditorModal.querySelector('#notes-editor');
                editor.value = contact.notes || '';
                DOM.notesEditorModal.dataset.contactId = contactId;
                Utils.showModal(DOM.notesEditorModal);
            },
            showLongTextEditorModal: (contactId, fieldName) => {
                const contact = AppState.contacts.find(c => c.sparrow_contact_id === contactId);
                if (!contact) return;
                const editor = DOM.longTextEditorModal.querySelector('#long-text-editor');
                DOM.longTextEditorModal.querySelector('#long-text-editor-title').textContent = `Edit ${fieldName}`;
                editor.value = contact.fields[fieldName] || '';
                DOM.longTextEditorModal.dataset.contactId = contactId;
                DOM.longTextEditorModal.dataset.fieldName = fieldName;
                Utils.showModal(DOM.longTextEditorModal);
            },
            renderTaskView: () => {
                console.log(`${LOG_PREFIX} Rendering All Tasks view.`);
                DOM.appScreen.classList.add('hidden');
                DOM.settingsScreen.classList.add('hidden');
                DOM.taskScreen.classList.remove('hidden');
                
                const globalTaskForm = `
                    <div class="detail-section">
                        <h3>Add Global Task</h3>
                        <form class="add-item-form" data-form-type="global-task">
                            <div class="form-group"><label for="global-task-title">New Task</label><input type="text" id="global-task-title" required></div>
                            <div class="form-group"><label for="global-task-due-date">Due Date</label><input type="date" id="global-task-due-date"></div>
                            <button type="submit" class="btn btn-secondary">Add Global Task</button>
                        </form>
                    </div>`;

                const today = new Date(); today.setHours(0,0,0,0);
                const sortedTasks = [...AppState.tasks].sort((a,b) => {
                    const aDate = a.dueDate ? new Date(a.dueDate) : null;
                    const bDate = b.dueDate ? new Date(b.dueDate) : null;
                    if (a.status !== b.status) return a.status === 'Completed' ? 1 : -1; // Incomplete tasks first
                    if (!aDate && !bDate) return 0; // No dates, equal
                    if (!aDate) return 1; // a has no date, sort after
                    if (!bDate) return -1; // b has no date, sort after
                    const aOverdue = aDate < today, bOverdue = bDate < today;
                    if (aOverdue !== bOverdue) return aOverdue ? -1 : 1; // Overdue tasks first
                    return aDate - bDate; // Sort by date
                });

                const tasksHTML = `<ul class="item-list">${sortedTasks.map(task => {
                    const isComplete = task.status === 'Completed';
                    const toggleIcon = isComplete ? '⟲' : '✓';
                    const contact = task.sparrow_contact_id ? AppState.contacts.find(c => c.sparrow_contact_id === task.sparrow_contact_id) : null;
                    const contactLink = contact ? `<a href="#${contact.sparrow_contact_id}" class="task-contact-link">${escapeHTML(Utils.getContactDisplayName(contact))}</a>` : `<em>Global</em>`;
                    return `<li data-task-id="${task.sparrow_task_id}">
                                <span class="item-actions"><button data-action="toggle-task" title="Mark ${isComplete ? 'Incomplete' : 'Complete'}">${toggleIcon}</button></span>
                                <span class="item-title" style="${isComplete ? 'text-decoration:line-through;opacity:0.6;' : ''}">${escapeHTML(task.title)}</span>
                                <span>${contactLink}</span>
                                <span class="item-date" data-action="edit-task-date">${task.dueDate ? Utils.formatFieldValue(task.dueDate, 'date') : 'No date'}</span>
                                <span class="item-actions"><button data-action="delete-task" title="Delete Task">🗑️</button></span>
                            </li>`;
                }).join('')}</ul>`;
                
                DOM.taskScreen.querySelector('#global-task-container').innerHTML = globalTaskForm;
                DOM.taskScreen.querySelector('#all-tasks-list').innerHTML = tasksHTML;
            }
        };
