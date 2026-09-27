// Sparrow CRM — event wiring & delegated handlers.
const Events = {
            init: () => {
                Events.populateDomObject();
                UI.setFavicon();
                const triggerImport = () => DOM.csvFileInput.click();
                DOM.importCsvWelcomeBtn.addEventListener("click", triggerImport);
                DOM.importCsvHeaderBtn.addEventListener("click", triggerImport);
                DOM.csvFileInput.addEventListener("change", Events.handleFileSelect);
                DOM.fileDropZone.addEventListener("dragover", Events.handleDragOver);
                DOM.fileDropZone.addEventListener("dragleave", Events.handleDragLeave);
                DOM.fileDropZone.addEventListener("drop", Events.handleDrop);
                DOM.mainSearchInput.addEventListener("input", Utils.debounce(() => {
                    const query = DOM.mainSearchInput.value;
                    const url = new URL(window.location);
                    if (query) { url.searchParams.set("q", query); } else { url.searchParams.delete("q"); }
                    history.replaceState(null, "", url.toString());
                    UI.renderContactGrid();
                }, 300));

                DOM.addContactHeaderBtn.addEventListener('click', UI.showNewContactModal);
                DOM.newContactModal.querySelector('form').addEventListener('submit', Events.handleNewContactSubmit);

                if (DOM.sortSelect) {
                    DOM.sortSelect.value = AppState.ui.sortMode || 'import-order';
                    DOM.sortSelect.addEventListener('change', () => {
                        AppState.ui.sortMode = DOM.sortSelect.value;
                        UI.renderContactGrid();
                    });
                }

                document.querySelector(".actions-area .dropdown").addEventListener("click", e => {
                    const exportType = e.target.dataset.exportType;
                    if(exportType) Core.exportData(exportType);
                });

                DOM.settingsBtn.addEventListener("click", UI.renderSettingsPage);
                DOM.tasksBtn.addEventListener("click", UI.renderTaskView);
                DOM.backToContactsBtn.addEventListener("click", UI.renderApp);
                DOM.settingsBackBtn.addEventListener("click", UI.renderApp);
                DOM.saveNowBtn.addEventListener("click", Core.saveData);
                DOM.loadMoreBtn.addEventListener("click", () => UI.renderContactGrid(true));

                document.body.addEventListener("click", e => { if (e.target.classList.contains("modal-close-btn")) Utils.hideModal(e.target.closest(".modal")); });
                
                DOM.settingsScreen.addEventListener("click", Events.handleSettingsPageClick);
                DOM.settingsScreen.addEventListener("change", Events.handleSettingsPageChange);

                DOM.contactGrid.addEventListener("click", e => {
                    const card = e.target.closest(".contact-card");
                    if (card) window.location.hash = card.dataset.contactId;
                });

                DOM.taskScreen.addEventListener("submit", Events.handleTaskScreenSubmit);
                DOM.taskScreen.addEventListener("click", Events.handleTaskScreenClick);
                DOM.taskScreen.addEventListener("click", e => { // Handle contact links from task view
                    const contactLink = e.target.closest('.task-contact-link');
                    if (contactLink) {
                        e.preventDefault();
                        UI.renderApp();
                        window.location.hash = contactLink.hash;
                    }
                });
                
                window.addEventListener("hashchange", () => {
                    const contactId = window.location.hash.substring(1);
                    const isModalCurrentlyVisible = DOM.contactDetailModal.classList.contains("visible");
                    const currentModalId = isModalCurrentlyVisible ? DOM.contactDetailModal.dataset.contactId : null;
                    const contactExists = AppState.contacts.find(c => c.sparrow_contact_id === contactId);
                    
                    if (contactId && contactExists && contactId !== currentModalId) {
                         UI.renderContactModal(contactId);
                    } else if (!contactId && isModalCurrentlyVisible) {
                        Utils.hideModal(DOM.contactDetailModal);
                    }
                });
                window.addEventListener("beforeunload", e => { if (AppState.ui.unsavedChanges) { e.preventDefault(); e.returnValue = ""; } });
            },
            populateDomObject: () => {
                DOM = {
                    welcomeScreen: document.getElementById("welcomeScreen"), appScreen: document.getElementById("appScreen"), taskScreen: document.getElementById("taskScreen"), settingsScreen: document.getElementById('settingsScreen'),
                    importCsvWelcomeBtn: document.getElementById("import-csv-btn-welcome"), importCsvHeaderBtn: document.getElementById("import-csv-btn-header"),
                    addContactHeaderBtn: document.getElementById("add-contact-btn-header"), csvFileInput: document.getElementById("csv-file-input"),
                    fileDropZone: document.getElementById("file-drop-zone"), contactGrid: document.getElementById("contactGrid"),
                    mainSearchInput: document.getElementById("main-search-input"), sortSelect: document.getElementById("sort-select"), contactDetailModal: document.getElementById("contactDetailModal"),
                    newContactModal: document.getElementById('newContactModal'), settingsBtn: document.getElementById("settings-btn"),
                    tasksBtn: document.getElementById('tasks-btn'), backToContactsBtn: document.getElementById('back-to-contacts-btn'),
                    settingsBackBtn: document.getElementById('settings-back-btn'), saveReminder: document.getElementById("save-reminder"),
                    saveReminderText: document.getElementById("save-reminder-text"), saveNowBtn: document.getElementById("save-now-btn"),
                    loadMoreContainer: document.getElementById("loadMoreContainer"), loadMoreBtn: document.getElementById("loadMoreBtn"),
                    ghostModeCheckbox: document.getElementById("ghostModeCheckbox"), notificationContainer: document.getElementById("notification-container"),
                    confirmModal: {el:document.getElementById("confirmModal"), title:document.getElementById("confirm-title"), message:document.getElementById("confirm-message"), okBtn:document.getElementById("confirm-ok-btn"), cancelBtn:document.getElementById("confirm-cancel-btn")},
                    addTaskModal: document.getElementById("addTaskModal"), logActivityModal: document.getElementById("logActivityModal"),
                    addFieldModal: document.getElementById("addFieldModal"), addRelationshipModal: document.getElementById("addRelationshipModal"),
                    notesEditorModal: document.getElementById('notesEditorModal'), longTextEditorModal: document.getElementById('longTextEditorModal')
                };
            },
            handleFileSelect: e => { const file = e.target.files[0]; if (file) Events.readFile(file); e.target.value = ""; },
            handleDragOver: e => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.add("dragover"); },
            handleDragLeave: e => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.remove("dragover"); },
            handleDrop: e => {
                e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.remove("dragover");
                const file = e.dataTransfer.files[0];
                if (file && (file.type === "text/csv" || file.name.endsWith(".csv"))) { Events.readFile(file); }
                else { UI.showNotification("Please drop a valid .csv file.", "danger"); }
            },
            readFile: file => {
                const reader = new FileReader();
                reader.onload = e => {
                    try {
                        const data = Core.parseCSV(e.target.result);
                        if(data.length > 0) Core.processCSVData(data); else UI.showNotification("CSV file is empty or could not be parsed.","danger");
                    } catch (err) { console.error(`${LOG_PREFIX} Error processing file:`, err); UI.showNotification(`Error processing file: ${err.message}`, "danger"); }
                };
                reader.readAsText(file);
            },
            handleSettingsPageClick: e => {
                const target = e.target;
                if (target.id === 'add-section-btn') {
                    const newSectionName = prompt("Enter new section name:");
                    if (newSectionName && !AppState.settings.sections.find(s => s.name === newSectionName)) {
                        AppState.settings.sections.push({name: newSectionName, order: AppState.settings.sections.length, fields: []});
                        UI.renderSettingsPage();
                        Core.setUnsavedChanges(true);
                    } else if (newSectionName) {
                        UI.showNotification(`Section "${newSectionName}" already exists.`, 'danger');
                    }
                    return;
                }
                if (target.id === 'delete-all-btn') {
                    Core.deleteAllData();
                    return;
                }
                const actionEl = target.closest('[data-action]');
                if (!actionEl) return;
                
                const action = actionEl.dataset.action;
                const fieldLi = actionEl.closest('li[data-field-name]');
                if(!fieldLi) return;

                const fieldName = fieldLi.dataset.fieldName;
                const sectionDiv = fieldLi.closest('.settings-section');
                if(!sectionDiv) { console.error(`${LOG_PREFIX} Could not find parent section for field`, fieldName); return; }

                const sectionName = sectionDiv.querySelector('h4').textContent;
                const section = AppState.settings.sections.find(s => s.name === sectionName);
                if (!section) { console.error(`${LOG_PREFIX} Could not match section name: ${sectionName}`); return; }
                
                const fieldIndex = section.fields.indexOf(fieldName);
                
                if(action === 'up' && fieldIndex > 0) {
                    [section.fields[fieldIndex], section.fields[fieldIndex-1]] = [section.fields[fieldIndex-1], section.fields[fieldIndex]];
                    UI.renderSettingsPage();
                    Core.setUnsavedChanges(true);
                } else if(action === 'down' && fieldIndex < section.fields.length - 1) {
                     [section.fields[fieldIndex], section.fields[fieldIndex+1]] = [section.fields[fieldIndex+1], section.fields[fieldIndex]];
                     UI.renderSettingsPage();
                     Core.setUnsavedChanges(true);
                } else if(action === 'delete') {
                    Core.deleteField(fieldName);
                } else if(action === 'merge') {
                    Core.mergeFieldToNotes(fieldName);
                }
            },
            handleSettingsPageChange: e => {
                const target = e.target;
                Core.setUnsavedChanges(true); // Any change on this page marks as dirty
                if (target.matches('.field-section-select')) {
                    const fieldName = target.dataset.fieldName;
                    const newSectionName = target.value;
                    AppState.settings.sections.forEach(s => s.fields = s.fields.filter(f => f !== fieldName));
                    const newSection = AppState.settings.sections.find(s => s.name === newSectionName);
                    if(newSection) newSection.fields.push(fieldName);
                    UI.renderSettingsPage(); // Re-render to reflect the move
                } else if (target.matches('.field-visibility-toggle')) {
                    const fieldName = target.dataset.fieldName;
                    AppState.settings.fieldDefinitions[fieldName].visible = target.checked;
                } else if (target.matches('.field-type-select')) {
                     const fieldName = target.dataset.fieldName;
                    AppState.settings.fieldDefinitions[fieldName].type = target.value;
                } else if (target.id === 'ghostModeCheckbox') {
                    AppState.settings.ghostMode = target.checked;
                    if(AppState.settings.ghostMode) { localStorage.removeItem("sparrow-crm-state"); UI.showNotification("Ghost Mode On: Session restore is disabled.","info");}
                }
            },
            setupContactModalEventListeners: (contactId) => {
                const modalContent = DOM.contactDetailModal.querySelector(".modal-content");
                if (modalContent) {
                    DOM.contactDetailModal.dataset.contactId = contactId;
                    // The modal content is replaced on every render; replaceListener
                    // keeps us at exactly one delegated listener per event type.
                    const replaceListener = (type, handler) => {
                        modalContent.removeEventListener(type, handler);
                        modalContent.addEventListener(type, handler);
                    };
                    replaceListener("click", Events.handleContactModalClick);
                    replaceListener("focusout", Events.handleContactModalFocusOut);
                    replaceListener("keydown", Events.handleContactModalKeyDown);
                }
                // Secondary modal listeners
                DOM.addTaskModal.querySelector("form").addEventListener("submit", Events.handleModalFormSubmit, { once: true });
                DOM.logActivityModal.querySelector("form").addEventListener("submit", Events.handleModalFormSubmit, { once: true });
                DOM.addFieldModal.querySelector("form").addEventListener("submit", Events.handleModalFormSubmit, { once: true });
                DOM.addRelationshipModal.querySelector("form").addEventListener("submit", Events.handleModalFormSubmit, { once: true });
                DOM.addRelationshipModal.addEventListener("input", Events.handleRelationshipSearchInput);
                DOM.notesEditorModal.querySelector('#save-notes-btn').addEventListener('click', Events.handleNotesSave);
                DOM.longTextEditorModal.querySelector('#save-long-text-btn').addEventListener('click', Events.handleLongTextSave);
            },
            handleNewContactSubmit: e => {
                e.preventDefault();
                const form = e.target;
                const formData = new FormData(form);
                const contactData = {};
                for (let [key, value] of formData.entries()) {
                    contactData[key] = value;
                }
                Core.addNewContact(contactData);
            },
            handleTaskScreenSubmit: e => {
                e.preventDefault();
                if (e.target.dataset.formType === 'global-task') {
                    const title = document.getElementById('global-task-title').value;
                    const dueDate = document.getElementById('global-task-due-date').value;
                    if (title) Core.addTask(null, {title, dueDate});
                    e.target.reset();
                }
            },
            handleTaskScreenClick: e => {
                const actionEl = e.target.closest("[data-action]");
                if (!actionEl) return;
                const action = actionEl.dataset.action;
                const taskId = actionEl.closest("li[data-task-id]")?.dataset.taskId;
                if (!taskId) return;
                if (action === 'toggle-task') {
                    const currentStatus = AppState.tasks.find(t => t.sparrow_task_id === taskId).status;
                    Core.updateTask(taskId, { status: currentStatus === 'Completed' ? 'To-Do' : 'Completed' });
                } else if (action === 'delete-task') {
                    Core.deleteTask(taskId);
                }
            },
            handleModalFormSubmit: e => {
                e.preventDefault();
                const formId = e.target.id;
                const contactId = window.location.hash.substring(1);
                
                if (formId === 'add-task-form') {
                    Core.addTask(contactId, { title: document.getElementById('new-task-title').value, dueDate: document.getElementById('new-task-due-date').value });
                    Utils.hideModal(DOM.addTaskModal);
                } else if (formId === 'log-activity-form') {
                    const dateValue = document.getElementById('new-activity-date').value;
                    const dateISO = dateValue ? new Date(dateValue + 'T00:00:00').toISOString() : new Date().toISOString();
                    Core.logActivity(contactId, {type: document.getElementById('new-activity-type').value, description: document.getElementById('new-activity-desc').value, date: dateISO });
                    Utils.hideModal(DOM.logActivityModal);
                } else if (formId === 'add-field-form') {
                    const fieldName = document.getElementById('new-field-name').value;
                    const fieldType = document.getElementById('new-field-type').value;
                    Core.addCustomField(contactId, fieldName, fieldType);
                    Utils.hideModal(DOM.addFieldModal);
                } else if (formId === 'add-relationship-form') {
                    const label = document.getElementById('relationship-label').value;
                    const targetId = document.getElementById('relationship-target-id').value;
                    Core.addRelationship(contactId, targetId, label);
                    Utils.hideModal(DOM.addRelationshipModal);
                }
            },
            handleContactModalClick: e => {
                const contactId = window.location.hash.substring(1);

                if (e.target.closest("#modal-save-changes-btn")) return Core.saveData();
                if (e.target.closest("#modal-delete-contact-btn")) return Core.deleteContact(contactId);
                if (e.target.closest("#add-task-btn-modal")) return UI.showAddTaskModal();
                if (e.target.closest("#log-activity-btn-modal")) return UI.showLogActivityModal();
                if (e.target.closest("#add-field-btn-modal")) return UI.showAddFieldModal();
                if (e.target.closest("#add-relationship-btn-modal")) return UI.showAddRelationshipModal();
                if (e.target.closest("#modal-back-btn")) {
                    const previousContactId = AppState.ui.navigationHistory.pop();
                    if(previousContactId) window.location.hash = previousContactId;
                    return;
                }

                const relationshipLink = e.target.closest('.relationship-link');
                if(relationshipLink) {
                    AppState.ui.navigationHistory.push(contactId);
                }

                const sectionHeader = e.target.closest('.sidebar-column .detail-section h3');
                if (sectionHeader) {
                    const section = sectionHeader.parentElement;
                    const sidebar = section.closest('.sidebar-column');
                    if (sidebar) {
                        sidebar.querySelectorAll('.detail-section').forEach(s => {
                            if (s !== section) s.classList.add('is-collapsed');
                        });
                        section.classList.toggle('is-collapsed');
                    }
                }
                
                const notesSection = e.target.closest('[data-section="notes"]');
                if (notesSection) {
                    UI.showNotesEditorModal(contactId);
                }

                const actionEl = e.target.closest('[data-action]');
                if (actionEl) {
                    const action = actionEl.dataset.action;
                    if (action === 'copy') return navigator.clipboard.writeText(actionEl.dataset.value).then(() => UI.showNotification("Copied!", "info", 1500));
                    if (action === 'edit-task-date') {
                        const taskId = actionEl.closest('li').dataset.taskId;
                        const task = AppState.tasks.find(t => t.sparrow_task_id === taskId);
                        actionEl.innerHTML = `<input type="date" class="inline-edit-input" value="${escapeAttr(task.dueDate || '')}" data-task-id="${taskId}">`;
                        actionEl.querySelector('input').focus();
                        return;
                    }
                    if (action === 'edit') { // Edit action for text/url/etc fields
                        const fieldGroup = actionEl.closest('.detail-field-group');
                        const fieldName = fieldGroup.dataset.fieldName;
                        const contact = AppState.contacts.find(c => c.sparrow_contact_id === contactId);
                        const originalValue = contact.fields[fieldName] || "";
                        const editor = `<input type="text" class="inline-edit-input" value="${escapeAttr(originalValue)}" data-original-value="${escapeAttr(originalValue)}">`;
                        fieldGroup.querySelector('.detail-field-value').innerHTML = editor;
                        fieldGroup.querySelector('.inline-edit-input').focus();
                        return;
                    }

                    const taskId = actionEl.closest("li[data-task-id]")?.dataset.taskId;
                    if (taskId) {
                        if (action === 'toggle-task') Core.updateTask(taskId, {status: AppState.tasks.find(t => t.sparrow_task_id === taskId).status === 'Completed' ? 'To-Do' : 'Completed'});
                        if (action === 'delete-task') Core.deleteTask(taskId);
                        return;
                    }
                    const activityId = actionEl.closest("li[data-activity-id]")?.dataset.activityId;
                    if (activityId && action === 'delete-activity') return Core.deleteActivity(activityId);
                }
                
                const fieldGroup = e.target.closest('.detail-field-group');
                if (fieldGroup && !fieldGroup.querySelector('input, textarea')) {
                    const fieldType = fieldGroup.dataset.fieldType;
                    const fieldName = fieldGroup.dataset.fieldName;
                    const contact = AppState.contacts.find(c => c.sparrow_contact_id === contactId);
                    const originalValue = contact.fields[fieldName];

                    if (fieldType === 'boolean') {
                        const newValue = !(originalValue === true || String(originalValue).toLowerCase() === 'true');
                        Core.updateContactField(contactId, fieldName, newValue);
                        UI.renderContactModal(contactId); // Re-render to show instant toggle
                    } else if (fieldType === 'longtext') {
                        UI.showLongTextEditorModal(contactId, fieldName);
                    } else if (fieldType !== 'url') { // Non-url/boolean fields become editable on click
                         const editor = `<input type="text" class="inline-edit-input" value="${escapeAttr(originalValue || '')}" data-original-value="${escapeAttr(originalValue || '')}">`;
                        fieldGroup.querySelector('.detail-field-value').innerHTML = editor;
                        fieldGroup.querySelector('.inline-edit-input').focus();
                    }
                }
            },
            handleContactModalFocusOut: e => {
                if (e.target.classList.contains("inline-edit-input")) {
                    const input = e.target;
                    if (input.dataset.taskId) {
                        Core.updateTask(input.dataset.taskId, { dueDate: input.value });
                        return;
                    }
                    const valueContainer = input.parentElement;
                    const fieldGroup = valueContainer.closest('.detail-field-group');
                    const fieldName = fieldGroup.dataset.fieldName;
                    const contactId = window.location.hash.substring(1);
                    Core.updateContactField(contactId, fieldName, input.value);
                    
                    const fieldDef = AppState.settings.fieldDefinitions[fieldName];
                    const formattedValue = Utils.formatFieldValue(input.value, fieldDef.type);
                    
                    let contextualActions = `<button title="Copy" data-action="copy" data-value="${escapeAttr(input.value)}">📋</button>`;
                    if (fieldDef.type === 'email' && input.value) contextualActions += `<a href="mailto:${input.value}" title="Email"><button>📧</button></a>`;
                    if (fieldDef.type === 'phone' && input.value) contextualActions += `<a href="tel:${input.value}" title="Call"><button>📞</button></a>`;
                    if (fieldDef.type === 'url' && input.value) contextualActions += `<button title="Edit URL" data-action="edit">✏️</button>`;

                    valueContainer.innerHTML = `<span class="value-text no-scrollbar">${formattedValue}</span><div class="contextual-actions">${contextualActions}</div>`;
                }
            },
            handleContactModalKeyDown: e => {
                if (e.target.classList.contains("inline-edit-input")) {
                    if (e.key === "Enter" && e.target.nodeName !== 'TEXTAREA') { // Allow enter in textarea
                        e.target.blur();
                    } else if (e.key === "Escape") {
                        const input = e.target;
                        input.value = input.dataset.originalValue; // Revert change
                        input.blur();
                    }
                }
            },
            handleRelationshipSearchInput: e => {
                 if (e.target.id === 'relationship-search') {
                    const searchTerm = e.target.value.toLowerCase();
                    const resultsContainer = DOM.addRelationshipModal.querySelector('#relationship-search-results');
                    resultsContainer.innerHTML = '';
                    if (searchTerm.length < 2) return;
                    const currentContactId = window.location.hash.substring(1);
                    const matches = AppState.contacts.filter(c => c.sparrow_contact_id !== currentContactId && Utils.getContactDisplayName(c).toLowerCase().includes(searchTerm));
                    matches.slice(0, 5).forEach(c => {
                        const div = document.createElement('div');
                        div.className = 'relationship-search-result';
                        div.dataset.contactId = c.sparrow_contact_id;
                        div.textContent = Utils.getContactDisplayName(c);
                        div.onclick = () => {
                             document.getElementById('relationship-target-id').value = c.sparrow_contact_id;
                             document.getElementById('relationship-search').value = div.textContent;
                             resultsContainer.innerHTML = '';
                        };
                        resultsContainer.appendChild(div);
                    });
                }
            },
            handleNotesSave: (e) => {
                const modal = e.target.closest('.modal');
                const notesEditor = modal.querySelector('#notes-editor');
                const contactId = modal.dataset.contactId;
                Core.updateContactField(contactId, 'Notes', notesEditor.value);
                Utils.hideModal(modal);
                UI.renderContactModal(contactId);
            },
            handleLongTextSave: (e) => {
                const modal = e.target.closest('.modal');
                const editor = modal.querySelector('#long-text-editor');
                const contactId = modal.dataset.contactId;
                const fieldName = modal.dataset.fieldName;
                Core.updateContactField(contactId, fieldName, editor.value);
                Utils.hideModal(modal);
                UI.renderContactModal(contactId);
            }
        };
