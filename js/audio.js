/**
 * audio.js - Motor de Áudio do Piano
 * Suporte a Samples de Piano Acústico de Alta Fidelidade + Fallback Sintético instantâneo
 * Suporte a Polifonia, Sustain Pedal, Volume e Efeito de Ambiência (Reverb)
 */

class PianoAudioEngine {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.reverbNode = null;
        this.isSustainActive = false;
        this.activeNotes = new Map(); // noteName -> { source, gainNode, isHeld }
        this.sampleBuffers = new Map(); // noteName -> AudioBuffer
        this.loadingPromises = new Map();
        this.volume = 0.8;
        this.useSamples = true;
        this.onSampleLoadProgress = null; // Callback (loaded, total)

        // Lista de notas suportadas com mapeamento para arquivos da CDN
        // Gleitz soundfont usa bemol (ex: Db em vez de C#)
        this.noteNames = [
            'C2', 'Db2', 'D2', 'Eb2', 'E2', 'F2', 'Gb2', 'G2', 'Ab2', 'A2', 'Bb2', 'B2',
            'C3', 'Db3', 'D3', 'Eb3', 'E3', 'F3', 'Gb3', 'G3', 'Ab3', 'A3', 'Bb3', 'B3',
            'C4', 'Db4', 'D4', 'Eb4', 'E4', 'F4', 'Gb4', 'G4', 'Ab4', 'A4', 'Bb4', 'B4',
            'C5', 'Db5', 'D5', 'Eb5', 'E5', 'F5', 'Gb5', 'G5', 'Ab5', 'A5', 'Bb5', 'B5',
            'C6', 'Db6', 'D6', 'Eb6', 'E6', 'F6', 'Gb6', 'G6', 'Ab6', 'A6', 'Bb6', 'B6',
            'C7'
        ];

        this.cdnBase = 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/acoustic_grand_piano-mp3/';
    }

    /**
     * Inicializa o AudioContext na primeira interação do usuário
     */
    initContext() {
        if (!this.ctx) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContextClass();

            // Master Gain
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);

            // Reverb / Convolver sintético sutil para simular acústica de sala de concerto
            this.reverbGain = this.ctx.createGain();
            this.reverbGain.gain.setValueAtTime(0.2, this.ctx.currentTime);
            this.createSyntheticReverb();

            // Roteamento
            this.masterGain.connect(this.ctx.destination);
            if (this.convolver) {
                this.masterGain.connect(this.convolver);
                this.convolver.connect(this.reverbGain);
                this.reverbGain.connect(this.ctx.destination);
            }
        }

        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    /**
     * Cria resposta ao impulso sintética para reverb acústico natural de piano de cauda
     */
    createSyntheticReverb() {
        if (!this.ctx) return;
        const rate = this.ctx.sampleRate;
        const length = rate * 1.8; // 1.8 segundos de cauda de reverberação
        const impulse = this.ctx.createBuffer(2, length, rate);
        const left = impulse.getChannelData(0);
        const right = impulse.getChannelData(1);

        for (let i = 0; i < length; i++) {
            const decay = Math.exp(-i / (rate * 0.5));
            left[i] = (Math.random() * 2 - 1) * decay;
            right[i] = (Math.random() * 2 - 1) * decay;
        }

        this.convolver = this.ctx.createConvolver();
        this.convolver.buffer = impulse;
    }

    /**
     * Converte notação com sustenido (C#4) para o padrão do repositório com bemol (Db4)
     */
    normalizeNoteName(note) {
        const enharmonics = {
            'C#': 'Db',
            'D#': 'Eb',
            'F#': 'Gb',
            'G#': 'Ab',
            'A#': 'Bb'
        };
        const pitch = note.slice(0, -1);
        const octave = note.slice(-1);
        const converted = enharmonics[pitch] ? enharmonics[pitch] + octave : note;
        return converted;
    }

    /**
     * Converte nota (ex: C4, A#4) para frequência em Hertz
     */
    noteToFrequency(note) {
        const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        // Normaliza bemóis para sustenidos para cálculo matemático
        const flats = { 'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#' };
        let pitch = note.slice(0, -1);
        const octave = parseInt(note.slice(-1), 10);
        if (flats[pitch]) pitch = flats[pitch];

        const semitoneIndex = notes.indexOf(pitch);
        if (semitoneIndex === -1) return 440;

        // A4 = 440Hz, semitoneIndex de A é 9, oitava 4
        const midiNumber = semitoneIndex + (octave + 1) * 12;
        return 440 * Math.pow(2, (midiNumber - 69) / 12);
    }

    /**
     * Pré-carrega um lote de notas prioritárias (as oitavas ativas na tela)
     */
    async preloadNotes(notesList) {
        this.initContext();
        let loaded = 0;
        const total = notesList.length;

        const promises = notesList.map(async (rawNote) => {
            const note = this.normalizeNoteName(rawNote);
            if (this.sampleBuffers.has(note)) {
                loaded++;
                if (this.onSampleLoadProgress) this.onSampleLoadProgress(loaded, total);
                return;
            }

            try {
                const url = `${this.cdnBase}${note}.mp3`;
                const res = await fetch(url);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const arrayBuffer = await res.arrayBuffer();
                const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
                this.sampleBuffers.set(note, audioBuffer);
            } catch (err) {
                // Se falhar o download individual, o sintetizador assumirá sem travar a interface
                // console.warn(`Nota ${note} usará síntese acústica fallback`);
            } finally {
                loaded++;
                if (this.onSampleLoadProgress) this.onSampleLoadProgress(loaded, total);
            }
        });

        await Promise.all(promises);
    }

    /**
     * Toca uma nota (Key Down)
     */
    playNote(noteInput, velocity = 0.85) {
        this.initContext();
        const note = this.normalizeNoteName(noteInput);

        // Se a nota já está soando, encerra a anterior suavemente
        if (this.activeNotes.has(note)) {
            this.stopNote(note, true);
        }

        const now = this.ctx.currentTime;
        const buffer = this.sampleBuffers.get(note);

        if (this.useSamples && buffer) {
            // Tocar sample gravado real
            const source = this.ctx.createBufferSource();
            source.buffer = buffer;

            const noteGain = this.ctx.createGain();
            // Ataque ultra rápido e natural
            noteGain.gain.setValueAtTime(0, now);
            noteGain.gain.linearRampToValueAtTime(velocity, now + 0.005);

            source.connect(noteGain);
            noteGain.connect(this.masterGain);

            source.start(now);

            this.activeNotes.set(note, {
                type: 'sample',
                source: source,
                gain: noteGain,
                isHeld: true,
                startTime: now
            });
        } else {
            // Fallback sintético rico e harmônico (aditivo com filtro de corpo de madeira)
            this.playSyntheticNote(note, velocity, now);
        }
    }

    /**
     * Síntese com múltiplos harmônicos e filtro simulador de tampo harmônico de piano
     */
    playSyntheticNote(note, velocity, now) {
        const freq = this.noteToFrequency(note);
        const fundamental = this.ctx.createOscillator();
        const harmonic2 = this.ctx.createOscillator();
        const harmonic3 = this.ctx.createOscillator();

        fundamental.type = 'triangle';
        fundamental.frequency.setValueAtTime(freq, now);

        harmonic2.type = 'sine';
        harmonic2.frequency.setValueAtTime(freq * 2, now);

        harmonic3.type = 'sine';
        harmonic3.frequency.setValueAtTime(freq * 3, now);

        // Filtro passa-baixas para simular o abafamento acústico conforme decai
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(freq * 6, now);
        filter.frequency.exponentialRampToValueAtTime(Math.max(freq * 1.5, 300), now + 2.5);

        // Transiente de martelo percussivo (ruído inicial sutil)
        const noteGain = this.ctx.createGain();
        noteGain.gain.setValueAtTime(0, now);
        noteGain.gain.linearRampToValueAtTime(velocity * 0.9, now + 0.004);
        // Decaimento natural inicial
        noteGain.gain.exponentialRampToValueAtTime(velocity * 0.4, now + 1.2);

        fundamental.connect(filter);
        harmonic2.connect(filter);
        harmonic3.connect(filter);

        filter.connect(noteGain);
        noteGain.connect(this.masterGain);

        fundamental.start(now);
        harmonic2.start(now);
        harmonic3.start(now);

        this.activeNotes.set(note, {
            type: 'synth',
            oscillators: [fundamental, harmonic2, harmonic3],
            gain: noteGain,
            filter: filter,
            isHeld: true,
            startTime: now
        });
    }

    /**
     * Solta uma nota (Key Up)
     */
    stopNote(noteInput, forceImmediate = false) {
        const note = this.normalizeNoteName(noteInput);
        const active = this.activeNotes.get(note);
        if (!active) return;

        active.isHeld = false;

        // Se o pedal de sustain estiver ativo e não for parada forçada, não corta
        if (this.isSustainActive && !forceImmediate) {
            return;
        }

        const now = this.ctx ? this.ctx.currentTime : 0;
        const releaseTime = forceImmediate ? 0.05 : 0.28; // Abafamento mecânico realista (feltro abafador descendo na corda)

        try {
            active.gain.gain.cancelScheduledValues(now);
            const currentGain = active.gain.gain.value;
            active.gain.gain.setValueAtTime(Math.max(currentGain, 0.001), now);
            active.gain.gain.exponentialRampToValueAtTime(0.0001, now + releaseTime);

            setTimeout(() => {
                if (active.type === 'sample' && active.source) {
                    try { active.source.stop(); } catch (e) {}
                    try { active.source.disconnect(); } catch (e) {}
                } else if (active.type === 'synth' && active.oscillators) {
                    active.oscillators.forEach(osc => {
                        try { osc.stop(); } catch (e) {}
                        try { osc.disconnect(); } catch (e) {}
                    });
                }
                if (this.activeNotes.get(note) === active) {
                    this.activeNotes.delete(note);
                }
            }, releaseTime * 1000 + 50);
        } catch (e) {
            this.activeNotes.delete(note);
        }
    }

    /**
     * Alterna o estado do Pedal de Sustentação
     */
    setSustain(active) {
        this.isSustainActive = active;
        if (!this.isSustainActive) {
            // Ao soltar o pedal, silencia todas as notas que já não estão mais sendo seguradas
            this.activeNotes.forEach((data, note) => {
                if (!data.isHeld) {
                    this.stopNote(note);
                }
            });
        }
    }

    /**
     * Ajuste de Volume Master (0.0 a 1.0)
     */
    setVolume(vol) {
        this.volume = Math.max(0, Math.min(1, vol));
        if (this.masterGain && this.ctx) {
            this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
        }
    }

    /**
     * Silencia todas as notas ativas imediatamente
     */
    stopAllNotes() {
        this.activeNotes.forEach((_, note) => {
            this.stopNote(note, true);
        });
        this.activeNotes.clear();
    }
}

window.PianoAudioEngine = PianoAudioEngine;
