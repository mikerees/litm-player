import { ACTION_TYPES, OBJECT_TYPES } from '../utils/constants.js';
import { TagSystem } from './TagSystem.js';

export class FellowshipManager {
    constructor(gameClient) {
        this.gameClient = gameClient;
        this.fellowship = null;
        this.editingFellowship = null;
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Edit Fellowship button
        document.getElementById('edit-fellowship-btn')?.addEventListener('click', () => {
            this.showFellowshipEdit();
        });

        // Fellowship modal close button
        document.getElementById('close-fellowship')?.addEventListener('click', () => {
            this.hideFellowshipEdit();
        });

        // Fellowship modal cancel button
        document.getElementById('cancel-fellowship')?.addEventListener('click', () => {
            this.hideFellowshipEdit();
        });

        // Fellowship form submission
        const fellowshipForm = document.getElementById('fellowship-form');
        console.log('🔍 fellowship-form found:', !!fellowshipForm);
        fellowshipForm?.addEventListener('submit', (e) => {
            console.log('🔍 Fellowship form submitted');
            e.preventDefault();
            this.handleSaveFellowship();
        });
    }

    removeEventListeners() {
        document.getElementById('edit-fellowship-btn')?.removeEventListener('click', () => {
            this.showFellowshipEdit();
        });

        document.getElementById('close-fellowship')?.removeEventListener('click', () => {
            this.hideFellowshipEdit();
        });

        document.getElementById('cancel-fellowship')?.removeEventListener('click', () => {
            this.hideFellowshipEdit();
        });

        document.getElementById('fellowship-form')?.removeEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSaveFellowship();
        });
    }

    updateFellowship(fellowshipData) {
        console.log('🔍 updateFellowship called with:', fellowshipData);
        this.fellowship = fellowshipData;
        this.renderFellowship();
    }

    renderFellowship() {
        console.log('🔍 renderFellowship called');
        const fellowshipList = document.getElementById('fellowship-list');
        console.log('🔍 fellowship-list found:', !!fellowshipList);
        console.log('🔍 fellowship data:', this.fellowship);
        if (!fellowshipList || !this.fellowship) return;

        fellowshipList.innerHTML = '';

        // Get the first theme card (fellowship typically has one theme card)
        const themeCard = this.fellowship.themeCards && this.fellowship.themeCards.length > 0 
            ? this.fellowship.themeCards[0] 
            : null;

        if (!themeCard) return;

        // Display fellowship tag
        if (themeCard.themeTag) {
            const themeTag = this.gameClient.tagSystem.createTagElement(themeCard.themeTag);
            themeTag.classList.add('theme-tag');
            fellowshipList.appendChild(themeTag);
        }

        // Display positive attributes
        if (themeCard.positiveAttributes && themeCard.positiveAttributes.length > 0) {
            themeCard.positiveAttributes.forEach(attr => {
                const tag = this.gameClient.tagSystem.createTagElement(attr);
                tag.classList.add('positive');
                fellowshipList.appendChild(tag);
            });
        }

        // Display negative attributes
        if (themeCard.negativeAttributes && themeCard.negativeAttributes.length > 0) {
            themeCard.negativeAttributes.forEach(attr => {
                const tag = this.gameClient.tagSystem.createTagElement(attr);
                tag.classList.add('negative');
                fellowshipList.appendChild(tag);
            });
        }

        // Display quest
        if (themeCard.quest) {
            const questDiv = document.createElement('div');
            questDiv.className = 'fellowship-quest';
            questDiv.innerHTML = `<strong>Quest:</strong> ${themeCard.quest}`;
            fellowshipList.appendChild(questDiv);
        }

        // Display tracks with visual pips
        const tracksDiv = document.createElement('div');
        tracksDiv.className = 'fellowship-tracks';
        
        const tracksLabel = document.createElement('div');
        tracksLabel.innerHTML = '<strong>Tracks:</strong>';
        tracksLabel.style.cssText = 'margin-bottom: 8px; color: #8b4513; font-weight: bold;';
        tracksDiv.appendChild(tracksLabel);

        const trackNames = ['Abandon', 'Improve', 'Milestone'];
        const trackValues = [themeCard.abandonTrack || 0, themeCard.improveTrack || 0, themeCard.milestoneTrack || 0];
        
        trackNames.forEach((trackName, index) => {
            const trackDiv = document.createElement('div');
            trackDiv.style.cssText = 'margin-bottom: 8px;';
            
            const trackLabel = document.createElement('div');
            trackLabel.textContent = trackName;
            trackLabel.style.cssText = 'font-weight: bold; margin-bottom: 4px; color: #8b4513; font-size: 0.9em;';
            trackDiv.appendChild(trackLabel);
            
            const pipsContainer = document.createElement('div');
            pipsContainer.style.cssText = 'display: flex; gap: 4px;';
            
            for (let i = 1; i <= 3; i++) {
                const pip = document.createElement('div');
                pip.style.cssText = 'width: 16px; height: 16px; border: 2px solid #d2b48c; border-radius: 50%; background: ' + (i <= trackValues[index] ? '#8b4513' : 'white') + ';';
                pipsContainer.appendChild(pip);
            }
            
            trackDiv.appendChild(pipsContainer);
            tracksDiv.appendChild(trackDiv);
        });
        
        fellowshipList.appendChild(tracksDiv);

        // Display special improvements
        if (themeCard.specialImprovements && themeCard.specialImprovements.length > 0) {
            themeCard.specialImprovements.forEach(improvement => {
                const tag = this.gameClient.tagSystem.createTagElement(improvement);
                tag.classList.add('improvement');
                fellowshipList.appendChild(tag);
            });
        }
    }

    showFellowshipEdit() {
        // Initialize fellowship if it doesn't exist
        if (!this.fellowship) {
            this.fellowship = {
                themeCards: [{
                    themeTag: '',
                    positiveAttributes: [],
                    negativeAttributes: [],
                    quest: '',
                    abandonTrack: 0,
                    improveTrack: 0,
                    milestoneTrack: 0,
                    specialImprovements: []
                }]
            };
        }

        // Copy fellowship data for editing
        this.editingFellowship = JSON.parse(JSON.stringify(this.fellowship));
        
        // Ensure there's at least one theme card
        if (!this.editingFellowship.themeCards || this.editingFellowship.themeCards.length === 0) {
            this.editingFellowship.themeCards = [{
                themeTag: '',
                positiveAttributes: [],
                negativeAttributes: [],
                quest: '',
                abandonTrack: 0,
                improveTrack: 0,
                milestoneTrack: 0,
                specialImprovements: []
            }];
        }

        this.populateFellowshipEditForm();
        
        const overlay = document.getElementById('fellowship-overlay');
        if (overlay) {
            overlay.classList.remove('hidden');
            overlay.classList.add('show');
        }
    }

    hideFellowshipEdit() {
        const overlay = document.getElementById('fellowship-overlay');
        if (overlay) {
            overlay.classList.remove('show');
            overlay.classList.add('hidden');
        }
        this.editingFellowship = null;
    }

    populateFellowshipEditForm() {
        console.log('🔍 populateFellowshipEditForm called');
        const container = document.getElementById('fellowship-theme-cards-container');
        console.log('🔍 container found:', !!container);
        if (!container) return;

        container.innerHTML = '';

        // Always create exactly one theme card for fellowship
        const themeCard = this.editingFellowship.themeCards[0] || {
            themeTag: '',
            positiveAttributes: [],
            negativeAttributes: [],
            quest: '',
            abandonTrack: 0,
            improveTrack: 0,
            milestoneTrack: 0,
            specialImprovements: []
        };

        console.log('🔍 themeCard to populate:', themeCard);
        this.createFellowshipThemeCard(container, themeCard);
        console.log('🔍 Form populated');
    }

    createFellowshipThemeCard(container, theme) {
        const themeCard = document.createElement('div');
        themeCard.className = 'theme-card';
        themeCard.style.cssText = 'background: #f5f5dc; border: 2px solid #d2b48c; border-radius: 8px; padding: 15px; margin-bottom: 15px;';

        // Fellowship Tag Section
        const themeTagSection = this.createThemeInputSection('FELLOWSHIP TAG', 'theme-tag-input', theme.themeTag || '', 'Enter fellowship tag');
        themeCard.appendChild(themeTagSection);

        // Attributes Section
        const attributesSection = this.createThemeAttributesSection(theme);
        themeCard.appendChild(attributesSection);

        // Quest Section
        const questSection = this.createThemeInputSection('QUEST', 'quest-input', theme.quest || '', 'Enter quest', 'textarea');
        themeCard.appendChild(questSection);

        // Tracks Section
        const tracksSection = this.createThemeTracksSection(theme);
        themeCard.appendChild(tracksSection);

        // Special Improvements Section
        const improvementsSection = this.createThemeSpecialImprovementsSection(theme);
        themeCard.appendChild(improvementsSection);

        container.appendChild(themeCard);
        this.setupThemeCardEventListeners(themeCard);
    }

    createThemeInputSection(label, className, value, placeholder, type = 'input') {
        const section = document.createElement('div');
        section.className = 'theme-section';
        section.style.cssText = 'margin-bottom: 15px;';
        
        const labelElement = document.createElement('label');
        labelElement.textContent = label;
        labelElement.style.cssText = 'display: block; font-weight: bold; margin-bottom: 5px; color: #8b4513; font-family: "Crimson Text", serif;';
        
        let input;
        if (type === 'textarea') {
            input = document.createElement('textarea');
            input.rows = 3;
        } else {
            input = document.createElement('input');
            input.type = 'text';
        }
        
        input.className = className;
        input.value = value;
        input.placeholder = placeholder;
        input.style.cssText = 'width: 100%; padding: 8px 12px; border: 2px solid #d2b48c; border-radius: 4px; font-family: inherit; box-sizing: border-box;';
        
        section.appendChild(labelElement);
        section.appendChild(input);
        return section;
    }

    createThemeAttributesSection(theme) {
        const section = document.createElement('div');
        section.className = 'theme-attributes-section';
        section.style.cssText = 'margin-bottom: 15px;';
        
        const label = document.createElement('label');
        label.textContent = 'ATTRIBUTES';
        label.style.cssText = 'display: block; font-weight: bold; margin-bottom: 5px; color: #8b4513; font-family: "Crimson Text", serif;';
        
        const list = document.createElement('div');
        list.className = 'theme-attributes-list';
        list.style.cssText = 'margin-bottom: 10px;';
        
        // Add existing attributes
        const allAttributes = [
            ...(theme.positiveAttributes || []).map(attr => ({ text: attr, type: 'positive' })),
            ...(theme.negativeAttributes || []).map(attr => ({ text: attr, type: 'negative' }))
        ];
        
        if (allAttributes.length === 0) {
            const attributeItem = this.createThemeAttributeItem();
            list.appendChild(attributeItem);
        } else {
            allAttributes.forEach(attr => {
                const attributeItem = this.createThemeAttributeItem(attr.text, attr.type);
                list.appendChild(attributeItem);
            });
        }
        
        const addBtn = document.createElement('button');
        addBtn.type = 'button';
        addBtn.className = 'add-attribute-btn';
        addBtn.textContent = 'Add Attribute';
        addBtn.style.cssText = 'padding: 8px 12px; background: #8bc34a; color: white; border: none; border-radius: 4px; cursor: pointer;';
        addBtn.onclick = () => {
            const newItem = this.createThemeAttributeItem();
            list.appendChild(newItem);
        };
        
        section.appendChild(label);
        section.appendChild(list);
        section.appendChild(addBtn);
        return section;
    }

    createThemeAttributeItem(value = '', type = 'positive') {
        const item = document.createElement('div');
        item.className = 'theme-attribute-item';
        item.style.cssText = 'display: flex; gap: 10px; margin-bottom: 10px; align-items: center;';
        
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'attribute-input';
        input.value = value;
        input.placeholder = 'Attribute name';
        input.style.cssText = 'flex: 1; padding: 8px 12px; border: 2px solid #d2b48c; border-radius: 4px; font-family: inherit;';
        
        const typeDiv = document.createElement('div');
        typeDiv.className = 'attribute-type';
        typeDiv.style.cssText = 'display: flex; gap: 5px;';
        
        const positiveBtn = document.createElement('button');
        positiveBtn.type = 'button';
        positiveBtn.className = 'positive';
        positiveBtn.textContent = '+';
        positiveBtn.title = 'Positive attribute';
        positiveBtn.style.cssText = 'padding: 6px 10px; background: #4caf50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;';
        positiveBtn.onclick = () => {
            positiveBtn.classList.add('active');
            negativeBtn.classList.remove('active');
            negativeBtn.style.opacity = '0.5';
            positiveBtn.style.opacity = '1';
        };
        
        const negativeBtn = document.createElement('button');
        negativeBtn.type = 'button';
        negativeBtn.className = 'negative';
        negativeBtn.textContent = '-';
        negativeBtn.title = 'Negative attribute';
        negativeBtn.style.cssText = 'padding: 6px 10px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;';
        negativeBtn.onclick = () => {
            negativeBtn.classList.add('active');
            positiveBtn.classList.remove('active');
            positiveBtn.style.opacity = '0.5';
            negativeBtn.style.opacity = '1';
        };
        
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'remove-btn';
        removeBtn.textContent = '×';
        removeBtn.style.cssText = 'padding: 6px 10px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;';
        removeBtn.onclick = () => item.remove();
        
        // Set initial state
        if (type === 'positive') {
            positiveBtn.classList.add('active');
            negativeBtn.style.opacity = '0.5';
        } else {
            negativeBtn.classList.add('active');
            positiveBtn.style.opacity = '0.5';
        }
        
        typeDiv.appendChild(positiveBtn);
        typeDiv.appendChild(negativeBtn);
        
        item.appendChild(input);
        item.appendChild(typeDiv);
        item.appendChild(removeBtn);
        return item;
    }

    createThemeTracksSection(theme) {
        const section = document.createElement('div');
        section.className = 'theme-tracks-section';
        section.style.cssText = 'margin-bottom: 15px;';
        
        const label = document.createElement('label');
        label.textContent = 'TRACKS';
        label.style.cssText = 'display: block; font-weight: bold; margin-bottom: 5px; color: #8b4513; font-family: "Crimson Text", serif;';
        
        const tracks = document.createElement('div');
        tracks.className = 'theme-tracks';
        tracks.style.cssText = 'display: flex; gap: 15px;';
        
        const trackNames = ['ABANDON', 'IMPROVE', 'MILESTONE'];
        const trackValues = [theme.abandonTrack || 0, theme.improveTrack || 0, theme.milestoneTrack || 0];
        
        trackNames.forEach((trackName, index) => {
            const track = document.createElement('div');
            track.className = 'theme-track';
            track.style.cssText = 'flex: 1; text-align: center;';
            
            const name = document.createElement('div');
            name.className = 'theme-track-name';
            name.textContent = trackName;
            name.style.cssText = 'font-weight: bold; margin-bottom: 5px; color: #8b4513; font-size: 0.9em;';
            
            const pips = document.createElement('div');
            pips.className = 'theme-track-pips';
            pips.style.cssText = 'display: flex; gap: 5px; justify-content: center;';
            
            for (let i = 1; i <= 3; i++) {
                const pip = document.createElement('div');
                pip.className = 'theme-track-pip';
                pip.dataset.track = trackName.toLowerCase();
                pip.dataset.pip = i;
                pip.style.cssText = 'width: 20px; height: 20px; border: 2px solid #d2b48c; border-radius: 50%; cursor: pointer; background: white; transition: all 0.2s ease;';
                
                // Set initial state
                if (i <= trackValues[index]) {
                    pip.classList.add('filled');
                    pip.style.backgroundColor = '#8b4513';
                }
                
                pip.onclick = () => {
                    const trackPips = pips.querySelectorAll('.theme-track-pip');
                    const clickedValue = i;
                    
                    // If clicking a filled pip, clear all pips (set to 0)
                    if (pip.classList.contains('filled')) {
                        trackPips.forEach(p => {
                            p.classList.remove('filled');
                            p.style.backgroundColor = 'white';
                        });
                    } else {
                        // Fill pips up to the clicked value
                        trackPips.forEach((p, pipIndex) => {
                            const pipValue = pipIndex + 1;
                            if (pipValue <= clickedValue) {
                                p.classList.add('filled');
                                p.style.backgroundColor = '#8b4513';
                            } else {
                                p.classList.remove('filled');
                                p.style.backgroundColor = 'white';
                            }
                        });
                    }
                };
                pips.appendChild(pip);
            }
            
            track.appendChild(name);
            track.appendChild(pips);
            tracks.appendChild(track);
        });
        
        section.appendChild(label);
        section.appendChild(tracks);
        return section;
    }

    createThemeSpecialImprovementsSection(theme) {
        const section = document.createElement('div');
        section.className = 'theme-improvements-section';
        section.style.cssText = 'margin-bottom: 15px;';
        
        const label = document.createElement('label');
        label.textContent = 'SPECIAL IMPROVEMENTS';
        label.style.cssText = 'display: block; font-weight: bold; margin-bottom: 5px; color: #8b4513; font-family: "Crimson Text", serif;';
        
        const list = document.createElement('div');
        list.className = 'theme-improvements-list';
        list.style.cssText = 'margin-bottom: 10px;';
        
        // Add existing improvements
        const improvements = theme.specialImprovements || [];
        if (improvements.length === 0) {
            const improvementItem = this.createThemeImprovementItem();
            list.appendChild(improvementItem);
        } else {
            improvements.forEach(improvement => {
                const improvementItem = this.createThemeImprovementItem(improvement);
                list.appendChild(improvementItem);
            });
        }
        
        const addBtn = document.createElement('button');
        addBtn.type = 'button';
        addBtn.className = 'add-improvement-btn';
        addBtn.textContent = 'Add Special Improvement';
        addBtn.style.cssText = 'padding: 8px 12px; background: #8bc34a; color: white; border: none; border-radius: 4px; cursor: pointer;';
        addBtn.onclick = () => {
            const newItem = this.createThemeImprovementItem();
            list.appendChild(newItem);
        };
        
        section.appendChild(label);
        section.appendChild(list);
        section.appendChild(addBtn);
        return section;
    }

    createThemeImprovementItem(value = '') {
        const item = document.createElement('div');
        item.className = 'theme-improvement-item';
        item.style.cssText = 'display: flex; gap: 10px; margin-bottom: 10px; align-items: center;';
        
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'improvement-input';
        input.value = value;
        input.placeholder = 'Special improvement';
        input.style.cssText = 'flex: 1; padding: 8px 12px; border: 2px solid #d2b48c; border-radius: 4px; font-family: inherit;';
        
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'remove-btn';
        removeBtn.textContent = '×';
        removeBtn.style.cssText = 'padding: 6px 10px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;';
        removeBtn.onclick = () => item.remove();
        
        item.appendChild(input);
        item.appendChild(removeBtn);
        return item;
    }

    setupThemeCardEventListeners(themeCard) {
        // Track pip clicks
        themeCard.querySelectorAll('.theme-track-pip').forEach(pip => {
            pip.addEventListener('click', (e) => {
                const track = e.target.dataset.track;
                const trackPips = e.target.parentElement.querySelectorAll('.theme-track-pip');
                const clickedValue = parseInt(e.target.dataset.pip);
                
                // Calculate new value
                let newValue = 0;
                if (!e.target.classList.contains('filled')) {
                    newValue = clickedValue;
                }
                
                // Update the editing fellowship
                this.editingFellowship.themeCards[0][`${track}Track`] = newValue;
            });
        });
    }

    handleSaveFellowship() {
        console.log('🔍 handleSaveFellowship called');
        console.log('🔍 editingFellowship:', this.editingFellowship);
        
        const themeCard = this.editingFellowship.themeCards[0];
        console.log('🔍 themeCard:', themeCard);
        
        // Collect fellowship tag
        const themeTagInput = document.querySelector('.theme-tag-input');
        console.log('🔍 themeTagInput found:', !!themeTagInput);
        if (themeTagInput) {
            themeCard.themeTag = themeTagInput.value.trim();
            console.log('🔍 themeTag set to:', themeCard.themeTag);
        }
        
        // Collect attributes
        const attributeItems = document.querySelectorAll('.theme-attribute-item');
        const positiveAttributes = [];
        const negativeAttributes = [];
        
        attributeItems.forEach(item => {
            const input = item.querySelector('.attribute-input');
            const positiveBtn = item.querySelector('.positive');
            const negativeBtn = item.querySelector('.negative');
            
            if (input && input.value.trim()) {
                const value = input.value.trim();
                if (positiveBtn && positiveBtn.classList.contains('active')) {
                    positiveAttributes.push(value);
                } else if (negativeBtn && negativeBtn.classList.contains('active')) {
                    negativeAttributes.push(value);
                }
            }
        });
        
        themeCard.positiveAttributes = positiveAttributes;
        themeCard.negativeAttributes = negativeAttributes;
        
        // Collect quest
        const questInput = document.querySelector('.quest-input');
        if (questInput) {
            themeCard.quest = questInput.value.trim();
        }
        
        // Collect tracks
        const trackNames = ['abandon', 'improve', 'milestone'];
        trackNames.forEach(trackName => {
            const trackPips = document.querySelectorAll(`[data-track="${trackName}"]`);
            let value = 0;
            trackPips.forEach(pip => {
                if (pip.classList.contains('filled')) {
                    value = Math.max(value, parseInt(pip.dataset.pip));
                }
            });
            themeCard[`${trackName}Track`] = value;
        });
        
        // Collect special improvements
        const improvementItems = document.querySelectorAll('.theme-improvement-item');
        const specialImprovements = [];
        
        improvementItems.forEach(item => {
            const input = item.querySelector('.improvement-input');
            if (input && input.value.trim()) {
                specialImprovements.push(input.value.trim());
            }
        });
        
        themeCard.specialImprovements = specialImprovements;
        
        // Update the fellowship data
        this.editingFellowship.themeCards[0] = themeCard;
        
        // Send to server
        const fellowshipData = {
            themeCards: this.editingFellowship.themeCards
        };
        
        console.log('🔍 fellowshipData to send:', fellowshipData);
        
        // Check if fellowship object exists
        const existingFellowship = this.gameClient.gameState?.gameObjects?.find(obj => obj.type === 'fellowship');
        console.log('🔍 existingFellowship found:', !!existingFellowship);
        console.log('🔍 existingFellowship:', existingFellowship);
        
        if (existingFellowship) {
            // Update existing fellowship
            const updateAction = {
                type: ACTION_TYPES.UPDATE_OBJECT,
                objectType: OBJECT_TYPES.FELLOWSHIP,
                objectId: existingFellowship.id,
                contents: fellowshipData,
                tags: []
            };
            console.log('🔍 Sending UPDATE_OBJECT action:', updateAction);
            this.gameClient.webSocketManager.sendGameAction(updateAction);
        } else {
            // Create new fellowship
            const createAction = {
                type: ACTION_TYPES.CREATE_OBJECT,
                objectType: OBJECT_TYPES.FELLOWSHIP,
                contents: fellowshipData,
                tags: []
            };
            console.log('🔍 Sending CREATE_OBJECT action:', createAction);
            this.gameClient.webSocketManager.sendGameAction(createAction);
        }
        
        console.log('🔍 Hiding fellowship edit');
        this.hideFellowshipEdit();
    }
}
