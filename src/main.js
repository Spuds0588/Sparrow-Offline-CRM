// Sparrow CRM — bootstrap. NOTE: this file CLOSES the IIFE opened in utils.js.
function init() {
            console.log(`${LOG_PREFIX} Initializing application...`);
            AppState = {
                contacts: [], tasks: [], activities: [], relationships: [],
                settings: { fieldDefinitions: {}, sections:[], customActivityTypes: ["Phone Call", "SMS", "Email", "Meeting"], ghostMode: false },
                ui: { isFsaSupported: false, fileHandle: null, unsavedChanges: false, currentFilter: "", renderedContactsCount: 0, navigationHistory: [], sortMode: "import-order" }
            };

            // Embedded data wins. The localStorage cache is only consulted when the
            // file carries no embedded data, and is refreshed on unload unless
            // Ghost Mode is enabled.
            let preloadedData = null;
            const dataScript = document.getElementById('sparrow-data');
            if (dataScript && dataScript.textContent.trim().length > 2) {
                try {
                    preloadedData = JSON.parse(dataScript.textContent);
                    console.log(`${LOG_PREFIX} Loaded data from embedded JSON script.`);
                } catch(e) { console.error(`${LOG_PREFIX} Failed to parse embedded data.`, e); }
            } else if (localStorage.getItem("sparrow-crm-state")) {
                try {
                    preloadedData = JSON.parse(localStorage.getItem("sparrow-crm-state"));
                    console.log(`${LOG_PREFIX} Loaded data from localStorage cache.`);
                } catch(e) { console.error(`${LOG_PREFIX} Failed to parse local storage data.`, e); }
            }
            if (preloadedData) {
                AppState = { ...AppState, ...preloadedData, ui: AppState.ui }; // Merge preloaded data, but keep transient UI state
                window.addEventListener('unload', () => {
                    if (AppState.settings.ghostMode) {
                        localStorage.removeItem("sparrow-crm-state");
                    } else {
                        const stateToCache = { ...AppState };
                        delete stateToCache.ui;
                        localStorage.setItem("sparrow-crm-state", JSON.stringify(stateToCache));
                    }
                });
            }
            
            // Tolerate state saved by older versions of the app.
            if(!AppState.settings) AppState.settings = {};
            if(!AppState.settings.fieldDefinitions) AppState.settings.fieldDefinitions = {};
            if(!AppState.settings.sections) AppState.settings.sections = [];
            
            Events.init();
            AppState.ui.isFsaSupported = 'showOpenFilePicker' in window;
            
            if (AppState.contacts.length > 0) { UI.renderApp(); } 
            else { UI.resetToWelcomeScreen(); }

            const urlParams = new URLSearchParams(window.location.search);
            if(urlParams.has("q")) {
                const query = urlParams.get("q");
                DOM.mainSearchInput.value = query;
                UI.renderContactGrid();
            }
            
            const hash = window.location.hash.substring(1);
            if (hash && AppState.contacts.find(c => c.sparrow_contact_id === hash)) {
                UI.renderContactModal(hash);
            }
        }
        
        document.addEventListener('DOMContentLoaded', init);
    }());
