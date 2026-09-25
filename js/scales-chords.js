/**
 * scales-chords.js - Dicionário e Teoria Musical Didática
 * Contém acordes, escalas, tradução de notas e identificador automático de acordes
 */

const NOTE_INFO = {
    'C':  { pt: 'Dó', name: 'C' },
    'C#': { pt: 'Dó#', name: 'C#', alt: 'Db' },
    'Db': { pt: 'Ré♭', name: 'Db', alt: 'C#' },
    'D':  { pt: 'Ré', name: 'D' },
    'D#': { pt: 'Ré#', name: 'D#', alt: 'Eb' },
    'Eb': { pt: 'Mi♭', name: 'Eb', alt: 'D#' },
    'E':  { pt: 'Mi', name: 'E' },
    'F':  { pt: 'Fá', name: 'F' },
    'F#': { pt: 'Fá#', name: 'F#', alt: 'Gb' },
    'Gb': { pt: 'Sol♭', name: 'Gb', alt: 'F#' },
    'G':  { pt: 'Sol', name: 'G' },
    'G#': { pt: 'Sol#', name: 'G#', alt: 'Ab' },
    'Ab': { pt: 'Lá♭', name: 'Ab', alt: 'G#' },
    'A':  { pt: 'Lá', name: 'A' },
    'A#': { pt: 'Lá#', name: 'A#', alt: 'Bb' },
    'Bb': { pt: 'Si♭', name: 'Bb', alt: 'A#' },
    'B':  { pt: 'Si', name: 'B' }
};

const SEMITONE_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const CHORD_FORMULAS = {
    'major': {
        name: 'Maior (M)',
        intervals: [0, 4, 7],
        labels: ['Fundamental', '3ª Maior', '5ª Justa'],
        desc: 'Som alegre, brilhante e estável.'
    },
    'minor': {
        name: 'Menor (m)',
        intervals: [0, 3, 7],
        labels: ['Fundamental', '3ª Menor', '5ª Justa'],
        desc: 'Som suave, reflexivo e melancólico.'
    },
    '7': {
        name: 'Dominante (7)',
        intervals: [0, 4, 7, 10],
        labels: ['Fundamental', '3ª Maior', '5ª Justa', '7ª Menor'],
        desc: 'Gera tensão harmônica que pede resolução no acorde seguinte.'
    },
    'maj7': {
        name: 'Sétima Maior (7M)',
        intervals: [0, 4, 7, 11],
        labels: ['Fundamental', '3ª Maior', '5ª Justa', '7ª Maior'],
        desc: 'Som sonhador e sofisticado, muito usado no Jazz e Bossa Nova.'
    },
    'm7': {
        name: 'Menor com 7ª (m7)',
        intervals: [0, 3, 7, 10],
        labels: ['Fundamental', '3ª Menor', '5ª Justa', '7ª Menor'],
        desc: 'Aconchegante e maduro, presente no Soul, R&B e Pop.'
    },
    'sus4': {
        name: 'Suspenso 4 (sus4)',
        intervals: [0, 5, 7],
        labels: ['Fundamental', '4ª Justa', '5ª Justa'],
        desc: 'Sensação aberta de expectativa, sem terça.'
    },
    'dim': {
        name: 'Diminuto (dim)',
        intervals: [0, 3, 6],
        labels: ['Fundamental', '3ª Menor', '5ª Diminuta'],
        desc: 'Som tenso e misterioso.'
    }
};

const SCALE_FORMULAS = {
    'major': {
        name: 'Escala Maior (Natural)',
        intervals: [0, 2, 4, 5, 7, 9, 11],
        desc: 'A escala fundamental do ocidente. Fórmula: Tom - Tom - Semitom - Tom - Tom - Tom - Semitom.'
    },
    'minor': {
        name: 'Escala Menor (Natural)',
        intervals: [0, 2, 3, 5, 7, 8, 10],
        desc: 'Escala melancólica e emotiva. Relativa menor.'
    },
    'penta_major': {
        name: 'Pentatônica Maior',
        intervals: [0, 2, 4, 7, 9],
        desc: 'Apenas 5 notas que sempre soam bem juntas. Perfeita para improvisar!'
    },
    'penta_minor': {
        name: 'Pentatônica Menor / Blues',
        intervals: [0, 3, 5, 7, 10],
        desc: 'A rainha do Rock, Blues e Pop contemporâneo.'
    }
};

class MusicTheoryHelper {
    /**
     * Retorna a lista de notas pertencentes a um acorde
     * Exemplo: getChordNotes('C', 'major', 4) => ['C4', 'E4', 'G4']
     */
    static getChordNotes(rootNote, chordType = 'major', baseOctave = 4) {
        const chord = CHORD_FORMULAS[chordType];
        if (!chord) return [];

        let rootIndex = SEMITONE_NOTES.indexOf(rootNote);
        if (rootIndex === -1) {
            // Tenta equivalente enarmônico
            const flatEquiv = { 'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#' };
            rootIndex = SEMITONE_NOTES.indexOf(flatEquiv[rootNote]);
            if (rootIndex === -1) return [];
        }

        return chord.intervals.map((interval, i) => {
            const semitoneTotal = rootIndex + interval;
            const notePitch = SEMITONE_NOTES[semitoneTotal % 12];
            const octaveOffset = Math.floor(semitoneTotal / 12);
            const octave = baseOctave + octaveOffset;
            return {
                note: `${notePitch}${octave}`,
                pitch: notePitch,
                role: chord.labels[i]
            };
        });
    }

    /**
     * Retorna as notas de uma escala espalhadas pelas oitavas disponíveis (ex: 3 a 5)
     */
    static getScaleNotes(rootNote, scaleType = 'major', minOctave = 3, maxOctave = 5) {
        const scale = SCALE_FORMULAS[scaleType];
        if (!scale) return [];

        let rootIndex = SEMITONE_NOTES.indexOf(rootNote);
        if (rootIndex === -1) {
            const flatEquiv = { 'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#' };
            rootIndex = SEMITONE_NOTES.indexOf(flatEquiv[rootNote]);
            if (rootIndex === -1) return [];
        }

        const notes = [];
        for (let oct = minOctave; oct <= maxOctave; oct++) {
            scale.intervals.forEach((interval) => {
                const semitoneTotal = rootIndex + interval;
                const notePitch = SEMITONE_NOTES[semitoneTotal % 12];
                const octaveOffset = Math.floor(semitoneTotal / 12);
                const finalOctave = oct + octaveOffset;
                if (finalOctave <= maxOctave) {
                    notes.push(`${notePitch}${finalOctave}`);
                }
            });
        }
        return [...new Set(notes)]; // Remove notas duplicadas se houver
    }

    /**
     * Analisa as teclas atualmente pressionadas e tenta identificar o acorde tocado
     * Exemplo: se o usuário aperta C4, E4 e G4 simultaneamente, identifica "Dó Maior (C)"
     */
    static identifyChord(activeNotesList) {
        if (!activeNotesList || activeNotesList.length < 3) return null;

        // Extrai pitches sem oitava e remove duplicadas
        const pitches = [...new Set(activeNotesList.map(n => {
            let p = n.replace(/[0-9]/g, '');
            const flats = { 'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#' };
            return flats[p] || p;
        }))];

        if (pitches.length < 3) return null;

        // Testa cada nota como possível tônica
        for (let i = 0; i < pitches.length; i++) {
            const root = pitches[i];
            const rootIdx = SEMITONE_NOTES.indexOf(root);

            // Calcula semitons relativos à tônica
            const intervals = pitches.map(p => {
                const idx = SEMITONE_NOTES.indexOf(p);
                return (idx - rootIdx + 12) % 12;
            }).sort((a, b) => a - b);

            // Compara com acordes conhecidos
            for (const [typeKey, info] of Object.entries(CHORD_FORMULAS)) {
                const required = info.intervals;
                const matches = required.every(inter => intervals.includes(inter));
                if (matches) {
                    const ptRoot = NOTE_INFO[root]?.pt || root;
                    return {
                        root: root,
                        rootPt: ptRoot,
                        chordType: typeKey,
                        fullName: `${ptRoot} ${info.name}`,
                        symbol: typeKey === 'major' ? root : `${root}${typeKey}`,
                        description: info.desc
                    };
                }
            }
        }

        return null;
    }
}

window.NOTE_INFO = NOTE_INFO;
window.CHORD_FORMULAS = CHORD_FORMULAS;
window.SCALE_FORMULAS = SCALE_FORMULAS;
window.MusicTheoryHelper = MusicTheoryHelper;
