// Sparrow CRM — state mutations & persistence.
const Core = {
            setUnsavedChanges: (status) => {
                // Guard against calls that fire before init has built AppState/DOM.
                if (!AppState || !DOM || !DOM.saveReminder) return;
                if (AppState.ui.unsavedChanges === status) return;
                console.log(`${LOG_PREFIX} Unsaved changes status set to: ${status}`);
                AppState.ui.unsavedChanges = status;
                DOM.saveReminder.classList.toggle('visible', status);

                const contactModalSaveBtn = document.getElementById('modal-save-changes-btn');
                if (contactModalSaveBtn) {
                    contactModalSaveBtn.disabled = !status;
                }

                if (status) {
                    if (AppState.ui.isFsaSupported) {
                        if (AppState.ui.fileHandle) {
                            DOM.saveReminderText.textContent = "You have unsaved changes.";
                            DOM.saveNowBtn.textContent = "Save Now";
                        } else {
                            DOM.saveReminderText.textContent = "To enable one-click saving, grant permission to edit this file.";
                            DOM.saveNowBtn.textContent = "Grant Permission & Save";
                        }
                    } else {
                        DOM.saveReminderText.textContent = "You have unsaved changes. Download a new copy to save.";
                        DOM.saveNowBtn.textContent = "Download & Save";
                    }
                }
            },
            parseCSV: (text) => {
                // RFC 4180-style parse: quoted fields may contain commas and
                // newlines; doubled quotes are literal quotes. Parsed as one
                // stream so a mismatched quote can't swallow the whole file.
                const rows = [];
                let row = [], field = '', inQuotes = false;
                const endRow = () => {
                    row.push(field); field = '';
                    if (row.some(v => v.trim() !== '')) rows.push(row);
                    row = [];
                };
                for (let i = 0; i < text.length; i++) {
                    const ch = text[i];
                    if (inQuotes) {
                        if (ch === '"') {
                            if (text[i + 1] === '"') { field += '"'; i++; }
                            else inQuotes = false;
                        } else field += ch;
                    } else if (ch === '"') {
                        inQuotes = true;
                    } else if (ch === ',') {
                        row.push(field); field = '';
                    } else if (ch === '\n') {
                        endRow();
                    } else if (ch === '\r') {
                        if (text[i + 1] === '\n') i++;
                        endRow();
                    } else {
                        field += ch;
                    }
                }
                if (field !== '' || row.length > 0) endRow();
                if (rows.length === 0) return [];
                const headers = rows[0].map(h => h.trim());
                const result = rows.slice(1).map(values => {
                    const obj = {};
                    headers.forEach((h, j) => { obj[h] = (values[j] ?? '').trim(); });
                    return obj;
                });
                console.log(`${LOG_PREFIX} Parsed ${result.length} rows from CSV.`);
                return result;
            },
            detectFieldType: (header, rows) => {
                // Probe up to 20 non-empty values; a column becomes email/phone/url/
                // number/currency/date/boolean only when EVERY sampled value fits.
                const values = rows.map(r => (r[header] || '').trim()).filter(Boolean).slice(0, 20);
                if (values.length === 0) return 'text';
                const all = (re) => values.every(v => re.test(v));
                if (all(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) return 'email';
                if (all(/^\+?[\d\s().-]{7,20}$/)) return 'phone';
                if (all(/^(https?:\/\/)?[\w-]+(\.[\w-]+)+(\/\S*)?$/i) && values.every(v => v.includes('.'))) return 'url';
                if (all(/^[$€£]\s?-?\d([\d,]*)(\.\d+)?$/)) return 'currency';
                if (all(/^-?\d+([.,]\d+)?$/)) return 'number';
                if (all(/^\d{4}-\d{2}-\d{2}([T ].*)?$/)) return 'date';
                if (all(/^(true|false|yes|no)$/i)) return 'boolean';
                return 'text';
            },
            processCSVData: async (data) => {
                if (!data.length) return;
                const importTagInput = prompt("Enter a tag for this import (e.g., 'Leads'). Leave blank for none.", "");
                if (importTagInput === null) { UI.showNotification("Import cancelled.", "info"); return; }
                const importTag = importTagInput.trim();
                const headers = Object.keys(data[0]);
                // Metadata columns are handled separately and must not become contact fields.
                const newHeaders = headers.filter(h => !AppState.settings.fieldDefinitions[h] && h !== 'notes' && h !== 'tags' && h !== 'sparrow_contact_id');
                
                // On first import, create base sections
                const isDataColumn = h => h !== 'notes' && h !== 'tags' && h !== 'sparrow_contact_id';
                if (AppState.settings.sections.length === 0) {
                     AppState.settings.sections.push({ name: 'Primary Details', order: 0, fields: headers.slice(0, 5).filter(isDataColumn) });
                     const additionalFields = headers.slice(5).filter(isDataColumn);
                     if (additionalFields.length > 0) {
                        AppState.settings.sections.push({ name: 'Additional Details', order: 1, fields: additionalFields });
                     }
                     headers.forEach(h => {
                         if (isDataColumn(h)) {
                             AppState.settings.fieldDefinitions[h] = { name: h, type: Core.detectFieldType(h, data), visible: true };
                         }
                     });
                } else if (newHeaders.length > 0) { // On subsequent imports, handle new fields
                    newHeaders.forEach(h => {
                        AppState.settings.fieldDefinitions[h] = { name: h, type: Core.detectFieldType(h, data), visible: true };
                    });
                    let importSection = AppState.settings.sections.find(s => s.name === importTag);
                    if (!importSection) {
                        importSection = { name: importTag, fields: [], order: AppState.settings.sections.length };
                        AppState.settings.sections.push(importSection);
                    }
                    newHeaders.forEach(h => { if(!importSection.fields.includes(h)) importSection.fields.push(h) });
                }
                
                for (const row of data) {
                    let existingContact = null;
                    if (row.sparrow_contact_id) existingContact = AppState.contacts.find(c => c.sparrow_contact_id === row.sparrow_contact_id);
                    if (!existingContact && row.Email) { const m=AppState.contacts.filter(c=>c.fields.Email && c.fields.Email.toLowerCase()===row.Email.toLowerCase()); if (m.length===1) existingContact=m[0]; }
                    if (existingContact) {
                        if (await Utils.showConfirm("Update Contact?", `Found existing contact for '${Utils.getContactDisplayName(existingContact)}'. Update with new data?`)) {
                            Object.entries(row).forEach(([k,v]) => { if (v !== null && v !== "") {
                                if (k === 'notes') existingContact.notes = (existingContact.notes ? existingContact.notes + '\n' : '') + v;
                                else if (AppState.settings.fieldDefinitions[k]) existingContact.fields[k] = v;
                            }});
                            if (importTag && !existingContact.tags.includes(importTag)) existingContact.tags.push(importTag);
                        }
                    } else {
                        const newContact = { sparrow_contact_id: row.sparrow_contact_id || Utils.generateUUID(), tags: importTag ? [importTag] : [], fields: {}, notes: row.notes || '' };
                        if (row.tags) {
                            String(row.tags).split(';').map(t => t.trim()).filter(Boolean).forEach(t => {
                                if (!newContact.tags.includes(t)) newContact.tags.push(t);
                            });
                        }
                        Object.keys(AppState.settings.fieldDefinitions).forEach(fName => {
                            newContact.fields[fName] = row[fName] || '';
                        });
                        AppState.contacts.push(newContact);
                    }
                }
                Core.setUnsavedChanges(true);
                UI.renderApp();
            },
            saveData: async () => {
                console.log(`${LOG_PREFIX} Attempting to save data...`);
                DOM.saveReminder.classList.remove('visible');
                const savingNotifId = UI.showNotification('Saving...', 'info', 0);
                try {
                    if (AppState.ui.isFsaSupported) {
                        if (!AppState.ui.fileHandle) { AppState.ui.fileHandle = await window.showSaveFilePicker({ types: [{ description: 'Sparrow CRM File', accept: {'text/html': ['.html']} }] }); }
                        const writable = await AppState.ui.fileHandle.createWritable();
                        await writable.write(Core.generateHtmlToSave());
                        await writable.close();
                        Core.setUnsavedChanges(false);
                        UI.showNotification('File saved successfully.', 'success');
                    } else {
                        const blob = new Blob([Core.generateHtmlToSave()], { type: 'text/html' });
                        const a = document.createElement('a');
                        a.href = URL.createObjectURL(blob);
                        a.download = 'sparrow-crm-data.html';
                        a.click();
                        a.remove();
                        URL.revokeObjectURL(a.href);
                        Core.setUnsavedChanges(false);
                        UI.showNotification('File downloaded successfully.', 'success');
                    }
                    console.log(`${LOG_PREFIX} Save successful.`);
                } catch (err) {
                    if (err.name !== 'AbortError') { console.error(`${LOG_PREFIX} Error saving file:`, err); UI.showNotification(`Error saving file: ${err.message}`, 'danger'); }
                    else { UI.showNotification('Save cancelled.', 'info'); }
                } finally {
                    UI.hideNotification(savingNotifId);
                }
            },
            generateHtmlToSave: () => {
                // The live DOM contains rendered state (contact cards, task list,
                // settings rows, modal contents). Everything dynamic must be reset
                // before serialization so saved files never ship render artifacts
                // (or other people's data) baked into their markup. See agents.md:
                // "The template/data rule" — any new dynamic region goes here.
                const docClone = document.cloneNode(true);
                const clearById = (id) => {
                    const el = docClone.getElementById(id);
                    if (el) el.innerHTML = '';
                };
                ['notification-container', 'contactGrid', 'all-tasks-list', 'global-task-container',
                 'sections-management-container', 'settings-jump-links', 'new-contact-fields-container',
                 'contact-fields-container', 'relationship-search-results'].forEach(clearById);
                // Only the contact-detail modal is fully dynamic; the secondary modals
                // keep their static form shells (their variable parts are re-populated
                // on open).
                const contactModalContent = docClone.querySelector('#contactDetailModal .modal-content');
                if (contactModalContent) contactModalContent.innerHTML = '';
                // The confirm modal's title/message hold the last prompt's text
                // (which names a real contact) — restore the pristine defaults.
                const confirmClone = docClone.getElementById('confirmModal');
                if (confirmClone) {
                    const t = confirmClone.querySelector('#confirm-title');
                    const m = confirmClone.querySelector('#confirm-message');
                    if (t) t.textContent = 'FINAL CONFIRMATION';
                    if (m) m.textContent = 'This is your last chance. Clicking OK will permanently erase everything.';
                    const ok = confirmClone.querySelector('#confirm-ok-btn');
                    if (ok) ok.className = 'btn btn-danger';
                }
                docClone.querySelectorAll('.modal').forEach(el => {
                    el.classList.remove('visible');
                    el.removeAttribute('data-contact-id');
                    el.removeAttribute('data-field-name');
                });
                docClone.querySelectorAll('#welcomeScreen, #appScreen, #taskScreen, #settingsScreen').forEach(el => {
                    el.classList.toggle('hidden', el.id !== 'welcomeScreen');
                });
                docClone.getElementById('loadMoreContainer')?.classList.add('hidden');
                docClone.getElementById('save-reminder')?.classList.remove('visible');
                const dataToSave = { ...AppState };
                delete dataToSave.ui; // Don't save transient UI state
                const jsonString = JSON.stringify(dataToSave, null, 2);
                const scriptTagClone = docClone.getElementById('sparrow-data');
                scriptTagClone.textContent = jsonString;
                return `<!DOCTYPE html>\n` + docClone.documentElement.outerHTML;
            },
            generateCSVString: (dataType) => {
                const data = AppState[dataType];
                if (!data || data.length === 0) return "";
                let headers, rows;
                if (dataType === 'contacts') {
                    headers = Object.keys(AppState.settings.fieldDefinitions);
                    if (!headers.includes('sparrow_contact_id')) headers.unshift('sparrow_contact_id');
                    if (!headers.includes('tags')) headers.push('tags');
                    headers.push('notes');
                    rows = data.map(contact => headers.map(header => {
                        if (header === 'sparrow_contact_id') return contact.sparrow_contact_id;
                        if (header === 'tags') return contact.tags.join(';');
                        if (header === 'notes') return contact.notes || '';
                        return contact.fields[header] || '';
                    }));
                } else { // For tasks, activities, etc.
                    headers = Object.keys(data[0]);
                    rows = data.map(item => headers.map(header => item[header] || ''));
                }
                const csvRows = [headers.join(',')];
                rows.forEach(row => {
                    const values = row.map(value => {
                        const stringValue = String(value);
                        return stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') ? `"${stringValue.replace(/"/g,'""')}"` : stringValue;
                    });
                    csvRows.push(values.join(','))
                });
                return csvRows.join('\n');
            },
            exportData: (dataType) => {
                console.log(`${LOG_PREFIX} Exporting ${dataType}...`);
                const csvString = Core.generateCSVString(dataType);
                if (!csvString) { UI.showNotification(`No ${dataType} to export.`, "info"); return }
                const blob = new Blob([csvString], {type:"text/csv;charset=utf-8;"});
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = `sparrow-crm-${dataType}-${new Date().toISOString().split("T")[0]}.csv`;
                a.click();
                a.remove();
                URL.revokeObjectURL(a.href);
            },
            addNewContact: (formData) => {
                console.log(`${LOG_PREFIX} Creating new contact.`, formData);
                const newContact = {
                    sparrow_contact_id: Utils.generateUUID(),
                    tags: [],
                    fields: {},
                    notes: formData.notes || ''
                };
                delete formData.notes; // Remove notes from formdata to only loop over custom fields
                Object.keys(AppState.settings.fieldDefinitions).forEach(fName => {
                    newContact.fields[fName] = (formData[fName] || '').trim();
                });
                AppState.contacts.unshift(newContact); // Add to top for immediate visibility
                Core.setUnsavedChanges(true);
                UI.renderContactGrid();
                Utils.hideModal(DOM.newContactModal);
                UI.showNotification("Contact created successfully.", "success");
                // Auto-open new contact detail view
                window.location.hash = newContact.sparrow_contact_id;
            },
            updateContactField: (contactId, fieldName, newValue) => {
                const contact = AppState.contacts.find(c => c.sparrow_contact_id === contactId);
                if (contact) {
                    const originalValue = (fieldName === 'Notes') ? contact.notes : contact.fields[fieldName];
                    if(newValue === originalValue) return;
                    console.log(`${LOG_PREFIX} Updating field '${fieldName}' for contact ${contactId}.`);
                    if (fieldName === 'Notes') {
                        contact.notes = newValue;
                    } else {
                        contact.fields[fieldName] = newValue;
                    }
                    Core.setUnsavedChanges(true);
                }
            },
            addTask: (contactId, taskData) => {
                const newTask = { sparrow_task_id: Utils.generateUUID(), sparrow_contact_id: contactId, title: taskData.title, dueDate: taskData.dueDate, status: 'To-Do' };
                AppState.tasks.push(newTask); Core.setUnsavedChanges(true);
                if (contactId) UI.renderContactModal(contactId); else UI.renderTaskView();
            },
            updateTask: (taskId, newValues) => {
                const task = AppState.tasks.find(t => t.sparrow_task_id === taskId);
                if (task) { Object.assign(task, newValues); Core.setUnsavedChanges(true);
                    const contactId = task.sparrow_contact_id;
                    if(DOM.taskScreen.classList.contains('hidden')) { UI.renderContactModal(contactId); } else { UI.renderTaskView(); }
                }
            },
            deleteTask: async(taskId) => {
                const task = AppState.tasks.find(t => t.sparrow_task_id === taskId);
                if (!task) return;
                if (await Utils.showConfirm("Delete Task?", `Are you sure you want to delete the task: "${task.title}"?`, 'btn-danger')) {
                    const contactId = task.sparrow_contact_id;
                    AppState.tasks = AppState.tasks.filter(t => t.sparrow_task_id !== taskId);
                    Core.setUnsavedChanges(true);
                    if(DOM.taskScreen.classList.contains('hidden')) { UI.renderContactModal(contactId); } else { UI.renderTaskView(); }
                }
            },
            logActivity: (contactId, activityData) => {
                const newActivity = { sparrow_activity_id: Utils.generateUUID(), sparrow_contact_id: contactId, type: activityData.type, date: activityData.date, description: activityData.description };
                AppState.activities.unshift(newActivity); Core.setUnsavedChanges(true);
                UI.renderContactModal(contactId);
            },
            deleteActivity: async(activityId) => {
                const activity = AppState.activities.find(a => a.sparrow_activity_id === activityId);
                if (!activity) return;
                if (await Utils.showConfirm("Delete Activity Log?", `Are you sure you want to delete this ${activity.type} log from ${new Date(activity.date).toLocaleDateString()}?`, 'btn-danger')) {
                    const contactId = activity.sparrow_contact_id;
                    AppState.activities = AppState.activities.filter(a => a.sparrow_activity_id !== activityId);
                    Core.setUnsavedChanges(true);
                    UI.renderContactModal(contactId);
                }
            },
            addCustomField: (contactId, newFieldName, newFieldType) => {
                if (!newFieldName || AppState.settings.fieldDefinitions[newFieldName]) { UI.showNotification(`Field "${newFieldName}" already exists or name is empty.`, "danger"); return; }
                console.log(`${LOG_PREFIX} Adding new custom field: '${newFieldName}' of type '${newFieldType}'.`);
                AppState.settings.fieldDefinitions[newFieldName] = { name: newFieldName, type: newFieldType, visible: true };
                
                // Add to the last section by default
                const lastSection = AppState.settings.sections[AppState.settings.sections.length - 1];
                if (lastSection) {
                    lastSection.fields.push(newFieldName);
                } else { // Or create a new one if none exist
                     AppState.settings.sections.push({name: 'Custom Fields', order: 0, fields: [newFieldName]});
                }

                AppState.contacts.forEach(c => { c.fields[newFieldName] = ''; });
                Core.setUnsavedChanges(true);
                UI.renderContactModal(contactId);
            },
            addRelationship: (sourceId, targetId, label) => {
                if (!targetId || !label) { UI.showNotification("Please select a contact and provide a relationship label.", "danger"); return; }
                const newRelationship = { sparrow_relationship_id: Utils.generateUUID(), source_contact_id: sourceId, target_contact_id: targetId, label: label };
                AppState.relationships.push(newRelationship);
                Core.setUnsavedChanges(true);
                UI.renderContactModal(sourceId);
            },
            deleteContact: async (contactId) => {
                const contact = AppState.contacts.find(c => c.sparrow_contact_id === contactId);
                if (await Utils.showConfirm("Delete Contact?", `Are you sure you want to permanently delete ${Utils.getContactDisplayName(contact)}? This action cannot be undone.`, 'btn-danger')) {
                    console.log(`${LOG_PREFIX} Deleting contact ${contactId}.`);
                    AppState.contacts = AppState.contacts.filter(c => c.sparrow_contact_id !== contactId);
                    AppState.relationships = AppState.relationships.filter(r => r.source_contact_id !== contactId && r.target_contact_id !== contactId);
                    Core.setUnsavedChanges(true);
                    Utils.hideModal(DOM.contactDetailModal);
                    UI.renderApp();
                }
            },
            deleteField: async(fieldName) => {
                if (await Utils.showConfirm("Delete Field?", `Are you sure you want to permanently delete the field "${fieldName}"? This will remove the field and all its data from every contact.`, 'btn-danger')) {
                    console.log(`${LOG_PREFIX} Deleting field '${fieldName}'.`);
                    delete AppState.settings.fieldDefinitions[fieldName];
                    AppState.settings.sections.forEach(section => {
                        section.fields = section.fields.filter(f => f !== fieldName);
                    });
                    AppState.contacts.forEach(contact => { delete contact.fields[fieldName]; });
                    Core.setUnsavedChanges(true);
                    UI.renderSettingsPage();
                    UI.showNotification(`Field "${fieldName}" deleted.`, "success");
                }
            },
            mergeFieldToNotes: async(fieldName) => {
                 if (await Utils.showConfirm("Merge Field into Notes?", `This will add "${fieldName}: [value]" to the Notes for every contact with a value, and then permanently delete the field. This cannot be undone.`, 'btn-danger')) {
                    console.log(`${LOG_PREFIX} Merging field '${fieldName}' into Notes.`);
                    AppState.contacts.forEach(c => {
                        const value = c.fields[fieldName];
                        if(value) {
                            c.notes = (c.notes ? c.notes + '\n' : '') + `${fieldName}: ${value}`;
                        }
                    });
                    // Delete field without confirmation
                    delete AppState.settings.fieldDefinitions[fieldName];
                    AppState.settings.sections.forEach(section => {
                        section.fields = section.fields.filter(f => f !== fieldName);
                    });
                    AppState.contacts.forEach(contact => { delete contact.fields[fieldName]; });
                    
                    Core.setUnsavedChanges(true);
                    UI.renderSettingsPage();
                    UI.showNotification(`Field "${fieldName}" merged into Notes.`, 'success');
                }
            },
            deleteAllData: async() => {
                if (!(await Utils.showConfirm("DELETE ALL DATA?","This action will erase all contacts, relationships, and custom fields from this file.","btn-danger"))) return;
                if (await Utils.showConfirm("FINAL CONFIRMATION", "This is your last chance. Clicking OK will permanently erase everything.", "btn-danger")) {
                    console.log(`${LOG_PREFIX} DELETING ALL USER DATA.`);
                    AppState.contacts = []; AppState.tasks = []; AppState.activities = []; AppState.relationships = [];
                    AppState.settings.fieldDefinitions = {};
                    AppState.settings.sections = [];
                    Core.setUnsavedChanges(true);
                    UI.resetToWelcomeScreen();
                    UI.showNotification("All data has been deleted. Save the file to make it permanent.", "success");
                } else {
                    UI.showNotification("Delete cancelled.", "info");
                }
            },
            getRelationshipsForContact: (contactId) => {
                const relationships = [];
                // Find relationships where the contact is the source
                AppState.relationships.filter(r => r.source_contact_id === contactId).forEach(r => {
                    const targetContact = AppState.contacts.find(c => c.sparrow_contact_id === r.target_contact_id);
                    if (targetContact) {
                        relationships.push({
                            label: r.label,
                            linkedContact: targetContact
                        });
                    }
                });
                // Find relationships where the contact is the target
                AppState.relationships.filter(r => r.target_contact_id === contactId).forEach(r => {
                    const sourceContact = AppState.contacts.find(c => c.sparrow_contact_id === r.source_contact_id);
                    if (sourceContact) {
                        relationships.push({
                            label: `${r.label} for`, // Use the templated label
                            linkedContact: sourceContact
                        });
                    }
                });
                return relationships;
            }
        };
