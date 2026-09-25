/**
 * songs.js - Repertório Didático para Prática Guiada
 * Permite aprender músicas nota a nota ou ouvir demonstrações automáticas
 */

const SONGS_COLLECTION = [
    {
        id: 'ode_to_joy',
        title: 'Ode à Alegria',
        composer: 'L. v. Beethoven',
        difficulty: 'Iniciante',
        tempo: 108,
        description: 'Tema clássico da 9ª Sinfonia. Perfeita para praticar os 5 dedos da mão direita.',
        notes: [
            { note: 'E4', lyric: 'O-', duration: 1 },
            { note: 'E4', lyric: 'de', duration: 1 },
            { note: 'F4', lyric: 'à', duration: 1 },
            { note: 'G4', lyric: 'A-', duration: 1 },
            { note: 'G4', lyric: 'le-', duration: 1 },
            { note: 'F4', lyric: 'gri-', duration: 1 },
            { note: 'E4', lyric: 'a,', duration: 1 },
            { note: 'D4', lyric: 'luz', duration: 1 },
            { note: 'C4', lyric: 'do', duration: 1 },
            { note: 'C4', lyric: 'céu', duration: 1 },
            { note: 'D4', lyric: 'e', duration: 1 },
            { note: 'E4', lyric: 'do', duration: 1 },
            { note: 'E4', lyric: 'a-', duration: 1.5 },
            { note: 'D4', lyric: 'mor', duration: 0.5 },
            { note: 'D4', lyric: '!', duration: 2 },

            { note: 'E4', lyric: 'Can-', duration: 1 },
            { note: 'E4', lyric: 'ta-', duration: 1 },
            { note: 'F4', lyric: 're-', duration: 1 },
            { note: 'G4', lyric: 'mos', duration: 1 },
            { note: 'G4', lyric: 'com', duration: 1 },
            { note: 'F4', lyric: 'fe-', duration: 1 },
            { note: 'E4', lyric: 'rvo-', duration: 1 },
            { note: 'D4', lyric: 'so', duration: 1 },
            { note: 'C4', lyric: 'o', duration: 1 },
            { note: 'C4', lyric: 'teu', duration: 1 },
            { note: 'D4', lyric: 'no-', duration: 1 },
            { note: 'E4', lyric: 'me', duration: 1 },
            { note: 'D4', lyric: 'oh', duration: 1.5 },
            { note: 'C4', lyric: 'Se-', duration: 0.5 },
            { note: 'C4', lyric: 'nhor!', duration: 2 }
        ]
    },
    {
        id: 'twinkle',
        title: 'Brilha, Brilha Estrelinha',
        composer: 'Canção Tradicional',
        difficulty: 'Iniciante',
        tempo: 96,
        description: 'Melodia universal com saltos limpos de 5ª (de Dó para Sol).',
        notes: [
            { note: 'C4', lyric: 'Bri-', duration: 1 },
            { note: 'C4', lyric: 'lha,', duration: 1 },
            { note: 'G4', lyric: 'bri-', duration: 1 },
            { note: 'G4', lyric: 'lha,', duration: 1 },
            { note: 'A4', lyric: 'es-', duration: 1 },
            { note: 'A4', lyric: 'tre-', duration: 1 },
            { note: 'G4', lyric: 'linha,', duration: 2 },
            { note: 'F4', lyric: 'lá', duration: 1 },
            { note: 'F4', lyric: 'no', duration: 1 },
            { note: 'E4', lyric: 'céu', duration: 1 },
            { note: 'E4', lyric: 'a', duration: 1 },
            { note: 'D4', lyric: 'bri-', duration: 1 },
            { note: 'D4', lyric: 'lhar', duration: 1 },
            { note: 'C4', lyric: 'sozinha.', duration: 2 }
        ]
    },
    {
        id: 'parabens',
        title: 'Parabéns pra Você',
        composer: 'Mildred & Patty Hill',
        difficulty: 'Fácil',
        tempo: 104,
        description: 'A música mais tocada do mundo! Ótima para treinar ritmo ternário.',
        notes: [
            { note: 'C4', lyric: 'Pa-ra-', duration: 0.75 },
            { note: 'C4', lyric: 'béns', duration: 0.25 },
            { note: 'D4', lyric: 'pra', duration: 1 },
            { note: 'C4', lyric: 'vo-', duration: 1 },
            { note: 'F4', lyric: 'cê,', duration: 1 },
            { note: 'E4', lyric: '...', duration: 2 },

            { note: 'C4', lyric: 'nes-ta', duration: 0.75 },
            { note: 'C4', lyric: 'da-', duration: 0.25 },
            { note: 'D4', lyric: 'ta', duration: 1 },
            { note: 'C4', lyric: 'que-', duration: 1 },
            { note: 'G4', lyric: 'ri-', duration: 1 },
            { note: 'F4', lyric: 'da,', duration: 2 },

            { note: 'C4', lyric: 'mui-tas', duration: 0.75 },
            { note: 'C4', lyric: 'fe-', duration: 0.25 },
            { note: 'C5', lyric: 'li-ci-', duration: 1 },
            { note: 'A4', lyric: 'da-', duration: 1 },
            { note: 'F4', lyric: 'des,', duration: 1 },
            { note: 'E4', lyric: 'mui-tos', duration: 1 },
            { note: 'D4', lyric: 'a-nos', duration: 1.5 },

            { note: 'A#4', lyric: 'de', duration: 0.75 },
            { note: 'A#4', lyric: 'vi-', duration: 0.25 },
            { note: 'A4', lyric: 'da!', duration: 1 },
            { note: 'F4', lyric: '', duration: 1 },
            { note: 'G4', lyric: '', duration: 1 },
            { note: 'F4', lyric: '', duration: 2 }
        ]
    },
    {
        id: 'asa_branca',
        title: 'Asa Branca',
        composer: 'Luiz Gonzaga & Humberto Teixeira',
        difficulty: 'Fácil',
        tempo: 100,
        description: 'O clássico hino do forró e baião nordestino brasileiro em tom de Dó.',
        notes: [
            { note: 'C4', lyric: 'Quan-do', duration: 0.5 },
            { note: 'D4', lyric: 'o-', duration: 0.5 },
            { note: 'E4', lyric: 'lhei', duration: 1 },
            { note: 'G4', lyric: 'a', duration: 1 },
            { note: 'G4', lyric: 'ter-ra', duration: 1 },
            { note: 'E4', lyric: 'ar-', duration: 1 },
            { note: 'F4', lyric: 'den-', duration: 1 },
            { note: 'F4', lyric: 'do,', duration: 2 },

            { note: 'C4', lyric: 'qua-le', duration: 0.5 },
            { note: 'D4', lyric: 'fo-guei-', duration: 0.5 },
            { note: 'E4', lyric: 'ra', duration: 1 },
            { note: 'G4', lyric: 'de', duration: 1 },
            { note: 'G4', lyric: 'São', duration: 1 },
            { note: 'F4', lyric: 'Jo-', duration: 1 },
            { note: 'E4', lyric: 'ão...', duration: 2 }
        ]
    }
];

window.SONGS_COLLECTION = SONGS_COLLECTION;
