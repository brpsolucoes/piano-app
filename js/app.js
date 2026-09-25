/**
 * app.js - Orquestrador Principal do Piano
 * Controla renderização das teclas, eventos de mouse/touch/teclado,
 * integração MIDI, modo didático de músicas, dicionário de acordes e metrônomo.
 */

document.addEventListener('DOMContentLoaded', () => {
    const audio = new PianoAudioEngine();

    // Definição e intervalo de oitavas dinâmico
    let baseOctaveStart = 3;
    let numOctaves = 3;
    let currentOctaves = [3, 4, 5];

    const WHITE_NOTES = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
    const NOTE_CONFIG = [
        { pitch: 'C',  isBlack: false },
        { pitch: 'C#', isBlack: true, flat: 'Db' },
        { pitch: 'D',  isBlack: false },
        { pitch: 'D#', isBlack: true, flat: 'Eb' },
        { pitch: 'E',  isBlack: false },
        { pitch: 'F',  isBlack: false },
        { pitch: 'F#', isBlack: true, flat: 'Gb' },
        { pitch: 'G',  isBlack: false },
        { pitch: 'G#', isBlack: true, flat: 'Ab' },
        { pitch: 'A',  isBlack: false },
        { pitch: 'A#', isBlack: true, flat: 'Bb' },
        { pitch: 'B',  isBlack: false },
    ];

    // Mapeamento ergonômico de teclado do computador (Centrado na Home Row C4)
    const KEYBOARD_MAP = {
        // Oitava 3 (Baixos / Mão Esquerda)
        'z': 'C3', 's': 'C#3', 'x': 'D3', 'd': 'D#3', 'c': 'E3', 'v': 'F3', 'g': 'F#3', 'b': 'G3', 'h': 'G#3', 'n': 'A3', 'j': 'A#3', 'm': 'B3',
        // Oitava 4 (Dó Central / Mão Direita - Home Row)
        'q': 'C4', '2': 'C#4', 'w': 'D4', '3': 'D#4', 'e': 'E4', 'r': 'F4', '5': 'F#4', 't': 'G4', '6': 'G#4', 'y': 'A4', '7': 'A#4', 'u': 'B4',
        // Oitava 5 (Agudos)
        'i': 'C5', '9': 'C#5', 'o': 'D5', '0': 'D#5', 'p': 'E5', '[': 'F5', '=': 'F#5', ']': 'G5'
    };

    // Mapeamento reverso para exibir o atalho na tecla
    const NOTE_TO_KEYBOARD = {};
    for (const [key, note] of Object.entries(KEYBOARD_MAP)) {
        NOTE_TO_KEYBOARD[note] = key.toUpperCase();
    }

    // Elementos DOM
    const pianoContainer = document.getElementById('piano-keys');
    const sustainBtn = document.getElementById('btn-sustain');
    const labelModeSelect = document.getElementById('label-mode');
    const volumeSlider = document.getElementById('volume-slider');
    const sampleStatusEl = document.getElementById('sample-status');
    const chordDetectorEl = document.getElementById('chord-detected-name');
    const chordDetectorDesc = document.getElementById('chord-detected-desc');

    // Estado da Aplicação
    const rhythmGame = new PianoRhythmGame();
    let currentAppMode = 'sandbox'; // 'sandbox' ou 'game'
    let currentLabelMode = 'both'; // 'both', 'notes', 'pc', 'none'
    let isMouseDown = false;
    let activeHeldNotes = new Set();
    let currentSong = null;
    let songStepIndex = 0;
    let isPlayingDemo = false;
    let demoTimeouts = [];

    // Metrônomo
    let metronomeInterval = null;
    let metronomeBpm = 100;
    let metronomeBeat = 0;
    let isMetronomeRunning = false;

    // ==========================================
    // 1. RENDERIZAÇÃO DO TECLADO
    // ==========================================
    const allNotesList = [];

    function buildPiano() {
        pianoContainer.innerHTML = '';
        allNotesList.length = 0;

        currentOctaves.forEach(octave => {
            NOTE_CONFIG.forEach(item => {
                const noteName = `${item.pitch}${octave}`;
                allNotesList.push(noteName);

                const keyEl = document.createElement('div');
                keyEl.className = `piano-key ${item.isBlack ? 'black-key' : 'white-key'}`;
                keyEl.dataset.note = noteName;
                if (item.flat) {
                    keyEl.dataset.altNote = `${item.flat}${octave}`;
                }
                keyEl.dataset.pitch = item.pitch;
                keyEl.dataset.octave = octave;

                // Marcação especial de Dó Central (C4)
                if (noteName === 'C4') {
                    keyEl.classList.add('middle-c');
                }

                // Conteúdo textual didático
                const labelContainer = document.createElement('div');
                labelContainer.className = 'key-label-wrapper';

                const ptInfo = NOTE_INFO[item.pitch] || { pt: item.pitch };
                const keyboardKey = NOTE_TO_KEYBOARD[noteName] || '';

                labelContainer.innerHTML = `
                    <span class="note-name">${item.pitch}${octave}</span>
                    <span class="note-pt">${ptInfo.pt}</span>
                    <span class="pc-key">${keyboardKey ? `[${keyboardKey}]` : ''}</span>
                `;

                keyEl.appendChild(labelContainer);
                pianoContainer.appendChild(keyEl);
            });
        });

        // Adiciona tecla final para fechar a última oitava harmonicamente
        const lastOctave = currentOctaves[currentOctaves.length - 1];
        const finalNote = `C${lastOctave + 1}`;
        allNotesList.push(finalNote);
        const finalKey = document.createElement('div');
        finalKey.className = 'piano-key white-key';
        finalKey.dataset.note = finalNote;
        finalKey.dataset.pitch = 'C';
        finalKey.dataset.octave = (lastOctave + 1).toString();

        const finalLabel = document.createElement('div');
        finalLabel.className = 'key-label-wrapper';
        finalLabel.innerHTML = `
            <span class="note-name">C${lastOctave + 1}</span>
            <span class="note-pt">Dó</span>
            <span class="pc-key"></span>
        `;
        finalKey.appendChild(finalLabel);
        pianoContainer.appendChild(finalKey);

        // Atualiza layout para tamanho das teclas no tablet
        const furniture = document.querySelector('.piano-furniture');
        if (furniture) {
            furniture.classList.remove('octaves-1', 'octaves-2', 'octaves-3');
            furniture.classList.add(`octaves-${currentOctaves.length}`);
        }

        const rangeBadge = document.getElementById('current-range-badge');
        if (rangeBadge) {
            rangeBadge.textContent = `C${currentOctaves[0]} - C${lastOctave + 1}`;
        }

        updateLabelsVisibility();

        // Se o motor do jogo estiver ativo, redimensiona o canvas para acompanhar as teclas
        if (rhythmGame && rhythmGame.canvas) {
            rhythmGame.resizeCanvas();
        }

        // Se estiver praticando música, restaura o destaque da nota alvo
        if (currentSong && typeof updateSongPracticeUI === 'function') {
            updateSongPracticeUI();
        }
    }

    function updateLabelsVisibility() {
        pianoContainer.className = `piano-keys-wrapper label-mode-${currentLabelMode}`;
    }

    function getKeyElement(noteName) {
        if (!noteName) return null;
        return pianoContainer.querySelector(`[data-note="${noteName}"]`) ||
               pianoContainer.querySelector(`[data-alt-note="${noteName}"]`);
    }

    function areNotesEqual(n1, n2) {
        if (!n1 || !n2) return false;
        if (n1 === n2) return true;
        const norm = (n) => {
            const flats = { 'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#' };
            const p = n.slice(0, -1);
            const oct = n.slice(-1);
            return (flats[p] || p) + oct;
        };
        return norm(n1) === norm(n2);
    }

    // ==========================================
    // 2. DISPARO E FEEDBACK VISUAL DAS NOTAS
    // ==========================================
    function triggerNoteOn(note, velocity = 0.85, isUserAction = true) {
        audio.playNote(note, velocity);
        activeHeldNotes.add(note);

        const keyEl = getKeyElement(note);
        if (keyEl) {
            keyEl.classList.add('active');
        }

        updateChordDetection();

        // Se estiver no Modo Jogo de Ritmo (Synthesia)
        if (isUserAction && currentAppMode === 'game' && rhythmGame && rhythmGame.isPlaying) {
            rhythmGame.handleNoteDown(note);
        }

        // Se estiver no modo de prática guiada de música (Sandbox)
        if (isUserAction && currentAppMode === 'sandbox' && currentSong && !isPlayingDemo) {
            checkSongPracticeStep(note);
        }
    }

    function triggerNoteOff(note) {
        audio.stopNote(note);
        activeHeldNotes.delete(note);

        const keyEl = getKeyElement(note);
        if (keyEl) {
            keyEl.classList.remove('active');
        }

        updateChordDetection();

        // Se estiver no Modo Jogo de Ritmo (Synthesia)
        if (currentAppMode === 'game' && rhythmGame && rhythmGame.isPlaying) {
            rhythmGame.handleNoteUp(note);
        }
    }

    function updateChordDetection() {
        const detected = MusicTheoryHelper.identifyChord(Array.from(activeHeldNotes));
        if (detected) {
            chordDetectorEl.textContent = `${detected.fullName} (${detected.symbol})`;
            chordDetectorDesc.textContent = detected.description;
            chordDetectorEl.classList.add('detected');
        } else if (activeHeldNotes.size > 0) {
            const notesPt = Array.from(activeHeldNotes).map(n => {
                const pitch = n.replace(/[0-9]/g, '');
                return (NOTE_INFO[pitch] ? NOTE_INFO[pitch].pt : pitch);
            }).join(' - ');
            chordDetectorEl.textContent = `Notas: ${notesPt}`;
            chordDetectorDesc.textContent = 'Toque 3 notas simultâneas para formar um acorde!';
            chordDetectorEl.classList.remove('detected');
        } else {
            chordDetectorEl.textContent = 'Nenhum acorde tocado';
            chordDetectorDesc.textContent = 'Toque as teclas para ouvir o som e identificar acordes';
            chordDetectorEl.classList.remove('detected');
        }
    }

    // ==========================================
    // 3. EVENTOS DE MOUSE E TOUCH
    // ==========================================
    function bindMouseAndTouchEvents() {
        window.addEventListener('mousedown', () => {
            isMouseDown = true;
            audio.initContext();
        });

        window.addEventListener('mouseup', () => {
            isMouseDown = false;
            // Solta notas seguradas pelo mouse
            activeHeldNotes.forEach(note => {
                triggerNoteOff(note);
            });
        });

        pianoContainer.addEventListener('mousedown', (e) => {
            const keyEl = e.target.closest('.piano-key');
            if (keyEl) {
                const note = keyEl.dataset.note;
                triggerNoteOn(note);
            }
        });

        pianoContainer.addEventListener('mouseover', (e) => {
            if (isMouseDown) {
                const keyEl = e.target.closest('.piano-key');
                if (keyEl) {
                    const note = keyEl.dataset.note;
                    triggerNoteOn(note);
                }
            }
        });

        pianoContainer.addEventListener('mouseout', (e) => {
            if (isMouseDown) {
                const keyEl = e.target.closest('.piano-key');
                if (keyEl) {
                    const note = keyEl.dataset.note;
                    triggerNoteOff(note);
                }
            }
        });

        // Suporte a Multi-Touch para celulares e tablets
        const activeTouches = new Map(); // identifier -> note

        pianoContainer.addEventListener('touchstart', (e) => {
            e.preventDefault();
            audio.initContext();
            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                const target = document.elementFromPoint(touch.clientX, touch.clientY);
                const keyEl = target ? target.closest('.piano-key') : null;
                if (keyEl) {
                    const note = keyEl.dataset.note;
                    activeTouches.set(touch.identifier, note);
                    triggerNoteOn(note);
                }
            }
        }, { passive: false });

        pianoContainer.addEventListener('touchmove', (e) => {
            e.preventDefault();
            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                const target = document.elementFromPoint(touch.clientX, touch.clientY);
                const keyEl = target ? target.closest('.piano-key') : null;
                const prevNote = activeTouches.get(touch.identifier);

                if (keyEl) {
                    const newNote = keyEl.dataset.note;
                    if (newNote !== prevNote) {
                        if (prevNote) triggerNoteOff(prevNote);
                        activeTouches.set(touch.identifier, newNote);
                        triggerNoteOn(newNote);
                    }
                } else if (prevNote) {
                    triggerNoteOff(prevNote);
                    activeTouches.delete(touch.identifier);
                }
            }
        }, { passive: false });

        const endTouch = (e) => {
            e.preventDefault();
            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                const note = activeTouches.get(touch.identifier);
                if (note) {
                    triggerNoteOff(note);
                    activeTouches.delete(touch.identifier);
                }
            }
        };

        pianoContainer.addEventListener('touchend', endTouch, { passive: false });
        pianoContainer.addEventListener('touchcancel', endTouch, { passive: false });
    }

    // ==========================================
    // 4. EVENTOS DE TECLADO DO COMPUTADOR
    // ==========================================
    const pressedKeys = new Set();

    function bindKeyboardEvents() {
        window.addEventListener('keydown', (e) => {
            // Ignora se estiver digitando em input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

            // Barra de espaço = Pedal de Sustain
            if (e.code === 'Space') {
                e.preventDefault();
                if (!audio.isSustainActive) {
                    setSustainState(true);
                }
                return;
            }

            const key = e.key.toLowerCase();
            if (KEYBOARD_MAP[key] && !pressedKeys.has(key)) {
                pressedKeys.add(key);
                const note = KEYBOARD_MAP[key];
                triggerNoteOn(note);
            }
        });

        window.addEventListener('keyup', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                setSustainState(false);
                return;
            }

            const key = e.key.toLowerCase();
            if (KEYBOARD_MAP[key]) {
                pressedKeys.delete(key);
                const note = KEYBOARD_MAP[key];
                triggerNoteOff(note);
            }
        });
    }

    function setSustainState(active) {
        audio.setSustain(active);
        if (sustainBtn) {
            sustainBtn.classList.toggle('active', active);
        }
        const tabletPedal = document.getElementById('btn-tablet-pedal');
        if (tabletPedal) {
            tabletPedal.classList.toggle('active', active);
        }
    }

    // ==========================================
    // 5. SUPORTE A CONTROLADOR MIDI USB
    // ==========================================
    function setupWebMIDI() {
        if (navigator.requestMIDIAccess) {
            navigator.requestMIDIAccess().then((midiAccess) => {
                const midiStatus = document.getElementById('midi-status');
                if (midiStatus) midiStatus.textContent = 'MIDI: Pronto';

                const inputs = midiAccess.inputs.values();
                for (let input of inputs) {
                    input.onmidimessage = handleMIDIMessage;
                }

                midiAccess.onstatechange = (e) => {
                    if (e.port.type === 'input') {
                        if (e.port.state === 'connected') {
                            e.port.onmidimessage = handleMIDIMessage;
                            if (midiStatus) midiStatus.textContent = `MIDI: ${e.port.name}`;
                        } else {
                            if (midiStatus) midiStatus.textContent = 'MIDI: Desconectado';
                        }
                    }
                };
            }).catch(() => {
                const midiStatus = document.getElementById('midi-status');
                if (midiStatus) midiStatus.textContent = 'MIDI: Não disponível';
            });
        }
    }

    function handleMIDIMessage(event) {
        const [status, noteNumber, velocity] = event.data;
        const command = status >> 4;
        // const channel = status & 0xf;

        // Converter MIDI note number para nota (ex: 60 = C4)
        const notePitch = SEMITONE_NOTES[noteNumber % 12];
        const octave = Math.floor(noteNumber / 12) - 1;
        const noteName = `${notePitch}${octave}`;

        if (command === 9 && velocity > 0) {
            // Note On
            triggerNoteOn(noteName, velocity / 127);
        } else if (command === 8 || (command === 9 && velocity === 0)) {
            // Note Off
            triggerNoteOff(noteName);
        } else if (command === 11 && noteNumber === 64) {
            // Sustain Pedal CC 64
            setSustainState(velocity > 63);
        }
    }

    // ==========================================
    // 6. MÓDULO DIDÁTICO: ACORDES E ESCALAS
    // ==========================================
    const chordRootSelect = document.getElementById('chord-root-select');
    const chordTypeSelect = document.getElementById('chord-type-select');
    const btnPlayChord = document.getElementById('btn-play-chord');
    const btnClearHighlight = document.getElementById('btn-clear-highlight');
    const scaleRootSelect = document.getElementById('scale-root-select');
    const scaleTypeSelect = document.getElementById('scale-type-select');
    const chordTheoryDesc = document.getElementById('chord-theory-desc');

    function highlightKeys(notesWithRoles, colorClass = 'highlighted-chord') {
        clearKeyHighlights();
        notesWithRoles.forEach(item => {
            const keyEl = getKeyElement(item.note);
            if (keyEl) {
                keyEl.classList.add(colorClass);
                if (item.role) {
                    const badge = document.createElement('span');
                    badge.className = 'interval-badge';
                    badge.textContent = item.role;
                    keyEl.appendChild(badge);
                }
            }
        });
    }

    function clearKeyHighlights() {
        pianoContainer.querySelectorAll('.piano-key').forEach(k => {
            k.classList.remove('highlighted-chord', 'highlighted-scale', 'target-song-key');
            const badge = k.querySelector('.interval-badge');
            if (badge) badge.remove();
        });
    }

    function applyChordHighlight() {
        const root = chordRootSelect.value;
        const type = chordTypeSelect.value;
        if (!root || !type) return;

        const chordNotes = MusicTheoryHelper.getChordNotes(root, type, 4);
        highlightKeys(chordNotes, 'highlighted-chord');

        const formula = CHORD_FORMULAS[type];
        if (formula) {
            const rootPt = NOTE_INFO[root] ? NOTE_INFO[root].pt : root;
            chordTheoryDesc.innerHTML = `<strong>${rootPt} ${formula.name}:</strong> ${formula.desc} <br><small>Notas: ${chordNotes.map(n => n.note).join(', ')}</small>`;
        }
    }

    function applyScaleHighlight() {
        const root = scaleRootSelect.value;
        const type = scaleTypeSelect.value;
        if (!root || !type) return;

        const scaleNotes = MusicTheoryHelper.getScaleNotes(root, type, 3, 5);
        clearKeyHighlights();
        scaleNotes.forEach(noteName => {
            const keyEl = getKeyElement(noteName);
            if (keyEl) {
                keyEl.classList.add('highlighted-scale');
            }
        });

        const formula = SCALE_FORMULAS[type];
        if (formula) {
            const rootPt = NOTE_INFO[root] ? NOTE_INFO[root].pt : root;
            chordTheoryDesc.innerHTML = `<strong>${formula.name} em ${rootPt}:</strong> ${formula.desc}`;
        }
    }

    // ==========================================
    // 7. MÓDULO DIDÁTICO: MÚSICAS GUIADAS
    // ==========================================
    const songSelect = document.getElementById('song-select');
    const songTargetNoteEl = document.getElementById('song-target-note');
    const songLyricEl = document.getElementById('song-lyric');
    const songProgressEl = document.getElementById('song-progress-fill');
    const songCounterEl = document.getElementById('song-counter');
    const btnPlayDemo = document.getElementById('btn-play-demo');
    const btnResetSong = document.getElementById('btn-reset-song');

    function initSongSelect() {
        songSelect.innerHTML = '<option value="">-- Selecione uma Música para Praticar --</option>';
        SONGS_COLLECTION.forEach(song => {
            const opt = document.createElement('option');
            opt.value = song.id;
            opt.textContent = `${song.title} (${song.difficulty})`;
            songSelect.appendChild(opt);
        });
    }

    function selectSong(songId) {
        stopDemo();
        currentSong = SONGS_COLLECTION.find(s => s.id === songId) || null;
        songStepIndex = 0;

        if (currentSong) {
            document.getElementById('song-practice-panel').classList.remove('hidden');
            document.getElementById('song-title-display').textContent = currentSong.title;
            document.getElementById('song-composer-display').textContent = `${currentSong.composer} • ${currentSong.description}`;
            updateSongPracticeUI();
        } else {
            document.getElementById('song-practice-panel').classList.add('hidden');
            clearKeyHighlights();
        }
    }

    function updateSongPracticeUI() {
        if (!currentSong) return;

        const currentStep = currentSong.notes[songStepIndex];
        const total = currentSong.notes.length;
        const progressPct = ((songStepIndex) / total) * 100;

        songProgressEl.style.width = `${progressPct}%`;
        songCounterEl.textContent = `${songStepIndex + 1} de ${total}`;

        if (currentStep) {
            const pitch = currentStep.note.replace(/[0-9]/g, '');
            const ptName = NOTE_INFO[pitch] ? NOTE_INFO[pitch].pt : pitch;
            const pcKey = NOTE_TO_KEYBOARD[currentStep.note] || '';

            songTargetNoteEl.textContent = `${currentStep.note} (${ptName}) ${pcKey ? `[${pcKey}]` : ''}`;
            songLyricEl.textContent = currentStep.lyric ? `"${currentStep.lyric}"` : '';

            // Destaca no teclado do piano
            clearKeyHighlights();
            const keyEl = getKeyElement(currentStep.note);
            if (keyEl) {
                keyEl.classList.add('target-song-key');
            }
        } else {
            // Concluiu a música!
            songProgressEl.style.width = '100%';
            songTargetNoteEl.textContent = '🎉 Parabéns!';
            songLyricEl.textContent = 'Você completou a música perfeitamente!';
            clearKeyHighlights();
        }
    }

    function checkSongPracticeStep(playedNote) {
        if (!currentSong || songStepIndex >= currentSong.notes.length) return;

        const expectedNote = currentSong.notes[songStepIndex].note;
        if (areNotesEqual(playedNote, expectedNote)) {
            songStepIndex++;
            updateSongPracticeUI();
        }
    }

    function playDemo() {
        if (!currentSong) return;
        if (isPlayingDemo) {
            stopDemo();
            return;
        }

        isPlayingDemo = true;
        btnPlayDemo.textContent = '⏹ Parar Demonstração';
        btnPlayDemo.classList.add('playing');

        const tempo = currentSong.tempo || 100;
        const beatMs = (60 / tempo) * 1000;
        let cumulativeDelay = 0;

        demoTimeouts.forEach(t => clearTimeout(t));
        demoTimeouts = [];

        currentSong.notes.forEach((step, idx) => {
            const durationMs = step.duration * beatMs;
            const tOn = setTimeout(() => {
                songStepIndex = idx;
                updateSongPracticeUI();
                triggerNoteOn(step.note, 0.85, false);
            }, cumulativeDelay);

            const tOff = setTimeout(() => {
                triggerNoteOff(step.note);
            }, cumulativeDelay + durationMs * 0.85);

            demoTimeouts.push(tOn, tOff);
            cumulativeDelay += durationMs;
        });

        // Final da música
        const tEnd = setTimeout(() => {
            stopDemo();
            songStepIndex = 0;
            updateSongPracticeUI();
        }, cumulativeDelay + 800);
        demoTimeouts.push(tEnd);
    }

    function stopDemo() {
        isPlayingDemo = false;
        demoTimeouts.forEach(t => clearTimeout(t));
        demoTimeouts = [];
        audio.stopAllNotes();
        btnPlayDemo.textContent = '▶ Ouvir Demonstração';
        btnPlayDemo.classList.remove('playing');
        clearKeyHighlights();
    }

    // ==========================================
    // 8. METRÔNOMO
    // ==========================================
    const metronomeToggleBtn = document.getElementById('btn-metronome-toggle');
    const bpmSlider = document.getElementById('bpm-slider');
    const bpmDisplay = document.getElementById('bpm-display');
    const metronomeLed = document.getElementById('metronome-led');

    function playMetronomeClick(isAccent = false) {
        if (!audio.ctx) audio.initContext();
        const now = audio.ctx.currentTime;
        const osc = audio.ctx.createOscillator();
        const gain = audio.ctx.createGain();

        osc.frequency.setValueAtTime(isAccent ? 1200 : 800, now);
        gain.gain.setValueAtTime(isAccent ? 0.6 : 0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

        osc.connect(gain);
        gain.connect(audio.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.06);

        if (metronomeLed) {
            metronomeLed.classList.add('flash');
            setTimeout(() => metronomeLed.classList.remove('flash'), 100);
        }
    }

    function toggleMetronome() {
        if (isMetronomeRunning) {
            clearInterval(metronomeInterval);
            isMetronomeRunning = false;
            metronomeToggleBtn.textContent = '▶ Iniciar';
            metronomeToggleBtn.classList.remove('running');
        } else {
            audio.initContext();
            isMetronomeRunning = true;
            metronomeToggleBtn.textContent = '⏹ Parar';
            metronomeToggleBtn.classList.add('running');
            metronomeBeat = 0;

            const intervalMs = (60 / metronomeBpm) * 1000;
            playMetronomeClick(true);
            metronomeBeat = (metronomeBeat + 1) % 4;

            metronomeInterval = setInterval(() => {
                const isAccent = (metronomeBeat === 0);
                playMetronomeClick(isAccent);
                metronomeBeat = (metronomeBeat + 1) % 4;
            }, intervalMs);
        }
    }

    function updateBpm(newBpm) {
        metronomeBpm = parseInt(newBpm, 10);
        bpmDisplay.textContent = `${metronomeBpm} BPM`;
        if (isMetronomeRunning) {
            toggleMetronome(); // Reinicia com o novo BPM
            toggleMetronome();
        }
    }

    // ==========================================
    // 9. CONFIGURAÇÃO DE CONTROLES E LISTENERS
    // ==========================================
    function setupControls() {
        // Label Mode
        labelModeSelect.addEventListener('change', (e) => {
            currentLabelMode = e.target.value;
            updateLabelsVisibility();
        });

        // Volume
        volumeSlider.addEventListener('input', (e) => {
            const vol = parseFloat(e.target.value);
            audio.setVolume(vol);
        });

        // Sustain Button
        sustainBtn.addEventListener('click', () => {
            setSustainState(!audio.isSustainActive);
        });

        // Acordes
        chordRootSelect.addEventListener('change', applyChordHighlight);
        chordTypeSelect.addEventListener('change', applyChordHighlight);
        scaleRootSelect.addEventListener('change', applyScaleHighlight);
        scaleTypeSelect.addEventListener('change', applyScaleHighlight);

        btnPlayChord.addEventListener('click', () => {
            const root = chordRootSelect.value;
            const type = chordTypeSelect.value;
            const chordNotes = MusicTheoryHelper.getChordNotes(root, type, 4);
            chordNotes.forEach((item, idx) => {
                setTimeout(() => {
                    triggerNoteOn(item.note, 0.8, false);
                    setTimeout(() => triggerNoteOff(item.note), 1200);
                }, idx * 60); // Efeito leve de arpejo dedilhado
            });
        });

        btnClearHighlight.addEventListener('click', () => {
            clearKeyHighlights();
            chordTheoryDesc.textContent = '';
        });

        // Músicas
        initSongSelect();
        songSelect.addEventListener('change', (e) => {
            selectSong(e.target.value);
        });

        btnPlayDemo.addEventListener('click', playDemo);
        btnResetSong.addEventListener('click', () => {
            stopDemo();
            songStepIndex = 0;
            updateSongPracticeUI();
        });

        // Metrônomo
        metronomeToggleBtn.addEventListener('click', toggleMetronome);
        bpmSlider.addEventListener('input', (e) => updateBpm(e.target.value));

        // ==========================================
        // CONTROLES DE OITAVAS E TAMANHO DE TECLAS
        // ==========================================
        const keyboardRangeSelect = document.getElementById('keyboard-range-select');
        const octaveShiftContainer = document.getElementById('octave-shift-container');
        const btnOctaveDown = document.getElementById('btn-octave-down');
        const btnOctaveUp = document.getElementById('btn-octave-up');

        function updateOctaveRange() {
            currentOctaves = [];
            for (let i = 0; i < numOctaves; i++) {
                currentOctaves.push(baseOctaveStart + i);
            }
            buildPiano();
            audio.preloadNotes(allNotesList);
        }

        if (keyboardRangeSelect) {
            keyboardRangeSelect.addEventListener('change', (e) => {
                const val = parseInt(e.target.value, 10);
                numOctaves = val;
                if (val === 3) {
                    baseOctaveStart = 3;
                    if (octaveShiftContainer) octaveShiftContainer.classList.add('hidden');
                } else if (val === 2) {
                    baseOctaveStart = 4; // C4 a C6 por padrão para tablet
                    if (octaveShiftContainer) octaveShiftContainer.classList.remove('hidden');
                } else if (val === 1) {
                    baseOctaveStart = 4; // C4 a C5
                    if (octaveShiftContainer) octaveShiftContainer.classList.remove('hidden');
                }
                updateOctaveRange();
            });
        }

        if (btnOctaveDown) {
            btnOctaveDown.addEventListener('click', () => {
                if (baseOctaveStart > 2) {
                    baseOctaveStart--;
                    updateOctaveRange();
                }
            });
        }

        if (btnOctaveUp) {
            btnOctaveUp.addEventListener('click', () => {
                if (baseOctaveStart + numOctaves <= 6) {
                    baseOctaveStart++;
                    updateOctaveRange();
                }
            });
        }

        // ==========================================
        // TELA CHEIA (FULLSCREEN API)
        // ==========================================
        const btnFullscreen = document.getElementById('btn-fullscreen');
        const fullscreenText = document.getElementById('fullscreen-text');
        const fullscreenIcon = document.getElementById('fullscreen-icon');

        function toggleFullscreen() {
            if (!document.fullscreenElement && !document.webkitFullscreenElement) {
                const elem = document.documentElement;
                if (elem.requestFullscreen) {
                    elem.requestFullscreen().catch(() => {});
                } else if (elem.webkitRequestFullscreen) {
                    elem.webkitRequestFullscreen();
                }
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen().catch(() => {});
                } else if (document.webkitExitFullscreen) {
                    document.webkitExitFullscreen();
                }
            }
        }

        function updateFullscreenUI() {
            const isFull = !!(document.fullscreenElement || document.webkitFullscreenElement);
            if (fullscreenText) fullscreenText.textContent = isFull ? 'Sair' : 'Tela Cheia';
            if (fullscreenIcon) fullscreenIcon.textContent = isFull ? '✕' : '⛶';
        }

        document.addEventListener('fullscreenchange', updateFullscreenUI);
        document.addEventListener('webkitfullscreenchange', updateFullscreenUI);
        if (btnFullscreen) btnFullscreen.addEventListener('click', toggleFullscreen);

        // ==========================================
        // BANNER DE ORIENTAÇÃO PARA TABLET
        // ==========================================
        const bannerClose = document.getElementById('btn-close-orientation');
        const orientationBanner = document.getElementById('orientation-banner');
        if (bannerClose && orientationBanner) {
            bannerClose.addEventListener('click', () => {
                orientationBanner.classList.add('closed');
            });
        }

        // ==========================================
        // BARRA DO PEDAL TOUCH PARA TABLET
        // ==========================================
        const btnTabletPedal = document.getElementById('btn-tablet-pedal');
        const pedalHoldCheckbox = document.getElementById('pedal-hold-checkbox');
        const pedalModeHint = document.getElementById('pedal-mode-hint');

        if (btnTabletPedal) {
            btnTabletPedal.addEventListener('touchstart', (e) => {
                e.preventDefault();
                audio.initContext();
                if (pedalHoldCheckbox && pedalHoldCheckbox.checked) {
                    setSustainState(true);
                }
            }, { passive: false });

            btnTabletPedal.addEventListener('touchend', (e) => {
                e.preventDefault();
                if (pedalHoldCheckbox && pedalHoldCheckbox.checked) {
                    setSustainState(false);
                }
            }, { passive: false });

            btnTabletPedal.addEventListener('touchcancel', (e) => {
                e.preventDefault();
                if (pedalHoldCheckbox && pedalHoldCheckbox.checked) {
                    setSustainState(false);
                }
            }, { passive: false });

            btnTabletPedal.addEventListener('click', () => {
                if (!pedalHoldCheckbox || !pedalHoldCheckbox.checked) {
                    setSustainState(!audio.isSustainActive);
                }
            });

            if (pedalHoldCheckbox) {
                pedalHoldCheckbox.addEventListener('change', () => {
                    if (pedalHoldCheckbox.checked) {
                        if (pedalModeHint) pedalModeHint.textContent = 'Toque e segure para ressoar as notas';
                        setSustainState(false);
                    } else {
                        if (pedalModeHint) pedalModeHint.textContent = 'Toque para ligar / desligar';
                    }
                });
            }
        }

        // Previne menu de clique direito e gestos indesejados no piano
        const furniture = document.querySelector('.piano-furniture');
        if (furniture) {
            furniture.addEventListener('contextmenu', (e) => e.preventDefault());
        }

        // ==========================================
        // MOTOR DO MODO JOGO DE RITMO (SYNTHESIA)
        // ==========================================
        const gameCanvas = document.getElementById('game-canvas');
        if (gameCanvas) {
            rhythmGame.init(gameCanvas, audio, pianoContainer);
        }

        const btnModeSandbox = document.getElementById('btn-mode-sandbox');
        const btnModeGame = document.getElementById('btn-mode-game');
        const sandboxToolbar = document.getElementById('sandbox-toolbar');
        const gameHudPanel = document.getElementById('game-hud-panel');
        const gameCanvasWrapper = document.getElementById('game-canvas-wrapper');
        const chordHud = document.querySelector('.chord-hud');
        const songPracticePanel = document.getElementById('song-practice-panel');

        function switchMode(newMode) {
            currentAppMode = newMode;
            if (newMode === 'sandbox') {
                rhythmGame.stop();
                btnModeSandbox.classList.add('active');
                btnModeGame.classList.remove('active');
                if (sandboxToolbar) sandboxToolbar.classList.remove('hidden');
                if (chordHud) chordHud.classList.remove('hidden');
                if (gameHudPanel) gameHudPanel.classList.add('hidden');
                if (gameCanvasWrapper) gameCanvasWrapper.classList.add('hidden');
            } else {
                btnModeSandbox.classList.remove('active');
                btnModeGame.classList.add('active');
                if (sandboxToolbar) sandboxToolbar.classList.add('hidden');
                if (chordHud) chordHud.classList.add('hidden');
                if (songPracticePanel) songPracticePanel.classList.add('hidden');
                if (gameHudPanel) gameHudPanel.classList.remove('hidden');
                if (gameCanvasWrapper) gameCanvasWrapper.classList.remove('hidden');
                rhythmGame.resizeCanvas();
            }
        }

        if (btnModeSandbox) btnModeSandbox.addEventListener('click', () => switchMode('sandbox'));
        if (btnModeGame) btnModeGame.addEventListener('click', () => switchMode('game'));

        // Popula músicas do modo jogo
        const gameSongSelect = document.getElementById('game-song-select');
        const gameSpeedSelect = document.getElementById('game-speed-select');
        const btnGameStart = document.getElementById('btn-game-start');
        const btnGamePause = document.getElementById('btn-game-pause');
        const btnGameStop = document.getElementById('btn-game-stop');

        if (gameSongSelect) {
            gameSongSelect.innerHTML = '';
            SONGS_COLLECTION.forEach(song => {
                const opt = document.createElement('option');
                opt.value = song.id;
                opt.textContent = `${song.title} (${song.difficulty})`;
                gameSongSelect.appendChild(opt);
            });
        }

        if (btnGameStart) {
            btnGameStart.addEventListener('click', () => {
                const songId = gameSongSelect.value;
                const song = SONGS_COLLECTION.find(s => s.id === songId);
                if (!song) return;

                const speed = parseFloat(gameSpeedSelect.value) || 1.0;
                rhythmGame.loadSong(song, speed);
                rhythmGame.start();

                btnGameStart.classList.add('hidden');
                btnGamePause.classList.remove('hidden');
                btnGameStop.classList.remove('hidden');
                btnGamePause.textContent = '⏸ Pausar';
            });
        }

        if (btnGamePause) {
            btnGamePause.addEventListener('click', () => {
                if (rhythmGame.isPaused) {
                    rhythmGame.resume();
                    btnGamePause.textContent = '⏸ Pausar';
                } else {
                    rhythmGame.pause();
                    btnGamePause.textContent = '▶ Continuar';
                }
            });
        }

        if (btnGameStop) {
            btnGameStop.addEventListener('click', () => {
                rhythmGame.stop();
                btnGameStart.classList.remove('hidden');
                btnGamePause.classList.add('hidden');
                btnGameStop.classList.add('hidden');
            });
        }

        // Callbacks de Score do Jogo
        const scoreDisplay = document.getElementById('game-score-display');
        const comboDisplay = document.getElementById('game-combo-display');
        const accuracyDisplay = document.getElementById('game-accuracy-display');
        const progressFill = document.getElementById('game-progress-fill');

        rhythmGame.onScoreUpdate = (data) => {
            if (scoreDisplay) scoreDisplay.textContent = data.score.toLocaleString();
            if (comboDisplay) comboDisplay.textContent = `${data.combo}x`;
            if (accuracyDisplay) accuracyDisplay.textContent = `${data.accuracy}%`;
            if (progressFill) progressFill.style.width = `${data.progress}%`;
        };

        // Modal de Vitória / Resultados
        const resultsModal = document.getElementById('game-results-modal');
        const modalStars = document.getElementById('modal-stars');
        const modalScore = document.getElementById('modal-score');
        const modalMaxCombo = document.getElementById('modal-max-combo');
        const modalHitRate = document.getElementById('modal-hit-rate');
        const modalRatings = document.getElementById('modal-ratings');
        const btnModalReplay = document.getElementById('btn-modal-replay');
        const btnModalClose = document.getElementById('btn-modal-close');

        rhythmGame.onSongComplete = (data) => {
            btnGameStart.classList.remove('hidden');
            btnGamePause.classList.add('hidden');
            btnGameStop.classList.add('hidden');

            if (resultsModal) {
                resultsModal.classList.remove('hidden');
                if (modalStars) modalStars.textContent = '⭐'.repeat(data.stars);
                if (modalScore) modalScore.textContent = data.score.toLocaleString();
                if (modalMaxCombo) modalMaxCombo.textContent = `${data.maxCombo}x`;
                if (modalHitRate) modalHitRate.textContent = `${data.hitRate}%`;
                if (modalRatings) modalRatings.textContent = `${data.stats.perfect} / ${data.stats.good}`;
            }
        };

        if (btnModalReplay) {
            btnModalReplay.addEventListener('click', () => {
                resultsModal.classList.add('hidden');
                if (btnGameStart) btnGameStart.click();
            });
        }

        if (btnModalClose) {
            btnModalClose.addEventListener('click', () => {
                resultsModal.classList.add('hidden');
            });
        }

        // Pré-carregamento dos samples acústicos reais em segundo plano
        audio.onSampleLoadProgress = (loaded, total) => {
            const pct = Math.round((loaded / total) * 100);
            if (sampleStatusEl) {
                if (loaded >= total) {
                    sampleStatusEl.innerHTML = '<span class="status-dot ready"></span> Amostras de Piano de Cauda Prontas (100%)';
                } else {
                    sampleStatusEl.innerHTML = `<span class="status-dot loading"></span> Carregando Som Acústico (${pct}%)`;
                }
            }
        };

        // Inicia download dos samples das oitavas visíveis
        audio.preloadNotes(allNotesList);
    }

    // Inicialização
    buildPiano();
    bindMouseAndTouchEvents();
    bindKeyboardEvents();
    setupWebMIDI();
    setupControls();
});
