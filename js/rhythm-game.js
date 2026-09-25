/**
 * rhythm-game.js - Motor do Modo Jogo de Ritmo (Estilo Synthesia / Falling Notes)
 * Renderiza barras de notas caindo alinhadas com as teclas do piano,
 * gerencia precisão de timing, tempo de pressão (hold), pontuação, combos e partículas.
 */

class PianoRhythmGame {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.audio = null;
        this.pianoContainer = null;

        // Estado do Jogo
        this.isPlaying = false;
        this.isPaused = false;
        this.currentSong = null;
        this.speed = 1.0;
        this.leadInSeconds = 2.8; // Tempo para a 1ª nota viajar do topo até a linha de acerto
        this.gameStartTime = 0;
        this.currentTime = 0;
        this.pausedTimeAccumulated = 0;
        this.pauseStartTimestamp = 0;
        this.animFrameId = null;

        // Dados de Notas
        this.notes = [];
        this.activeHoldingNotes = new Map(); // noteName -> noteData

        // Pontuação e Precisão
        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.stats = {
            perfect: 0,
            good: 0,
            earlyLate: 0,
            miss: 0
        };

        // Efeitos Visuais
        this.particles = [];
        this.floatingTexts = [];
        this.keyPositions = new Map(); // noteName -> { x, width, isBlack }

        // Callbacks para UI
        this.onScoreUpdate = null;
        this.onSongComplete = null;
    }

    /**
     * Inicializa o canvas e referências de DOM
     */
    init(canvas, audio, pianoContainer) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.audio = audio;
        this.pianoContainer = pianoContainer;

        window.addEventListener('resize', () => {
            if (this.canvas) this.resizeCanvas();
        });

        this.resizeCanvas();
    }

    /**
     * Redimensiona o canvas para acompanhar exatamente as teclas do piano
     */
    resizeCanvas() {
        if (!this.canvas || !this.pianoContainer) return;
        
        // A largura do canvas deve ser idêntica à do pianoContainer
        const width = this.pianoContainer.offsetWidth || 960;
        const height = 300; // Altura da pista de queda
        
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = width * dpr;
        this.canvas.height = height * dpr;
        this.canvas.style.width = `${width}px`;
        this.canvas.style.height = `${height}px`;
        
        this.ctx.scale(dpr, dpr);
        this.cacheKeyPositions();
    }

    /**
     * Mapeia posição X e largura de cada tecla no canvas
     */
    cacheKeyPositions() {
        this.keyPositions.clear();
        if (!this.pianoContainer) return;

        const containerRect = this.pianoContainer.getBoundingClientRect();
        const keys = this.pianoContainer.querySelectorAll('.piano-key');

        keys.forEach(k => {
            const note = k.dataset.note;
            const altNote = k.dataset.altNote;
            const isBlack = k.classList.contains('black-key');

            // Posição relativa dentro do container do piano
            const x = k.offsetLeft;
            const width = k.offsetWidth;

            const posData = { x, width, isBlack, el: k };
            this.keyPositions.set(note, posData);
            if (altNote) this.keyPositions.set(altNote, posData);
        });
    }

    /**
     * Prepara a música selecionada para o jogo
     */
    loadSong(song, speed = 1.0) {
        this.stop();
        this.currentSong = song;
        this.speed = Math.max(0.5, Math.min(2.0, speed));
        this.resizeCanvas();

        const beatSec = 60 / (song.tempo || 100);
        let cumulative = this.leadInSeconds;

        this.notes = song.notes.map((item, index) => {
            const durationSec = Math.max(0.2, (item.duration || 1) * beatSec);
            const start = cumulative;
            cumulative += durationSec;

            return {
                id: index,
                note: item.note,
                lyric: item.lyric || '',
                startTime: start,
                durationSeconds: durationSec,
                endTime: start + durationSec,
                hitState: 'pending', // 'pending', 'holding', 'released', 'missed'
                hitRating: null,     // 'PERFEITO', 'BOM', 'CEDO', 'TARDE', 'MISS'
                pressStart: 0,
                holdCredited: false
            };
        });

        this.resetStats();
    }

    resetStats() {
        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.stats = { perfect: 0, good: 0, earlyLate: 0, miss: 0 };
        this.particles = [];
        this.floatingTexts = [];
        this.activeHoldingNotes.clear();
        this.notifyScoreUpdate();
    }

    /**
     * Inicia a reprodução do jogo de ritmo
     */
    start() {
        if (!this.currentSong || this.notes.length === 0) return;
        this.audio.initContext();
        this.resetStats();

        this.isPlaying = true;
        this.isPaused = false;
        this.pausedTimeAccumulated = 0;
        this.gameStartTime = performance.now();
        this.currentTime = 0;

        if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
        this.loop = this.loop.bind(this);
        this.animFrameId = requestAnimationFrame(this.loop);
    }

    pause() {
        if (!this.isPlaying || this.isPaused) return;
        this.isPaused = true;
        this.pauseStartTimestamp = performance.now();
    }

    resume() {
        if (!this.isPlaying || !this.isPaused) return;
        this.isPaused = false;
        this.pausedTimeAccumulated += (performance.now() - this.pauseStartTimestamp);
        this.animFrameId = requestAnimationFrame(this.loop);
    }

    stop() {
        this.isPlaying = false;
        this.isPaused = false;
        if (this.animFrameId) {
            cancelAnimationFrame(this.animFrameId);
            this.animFrameId = null;
        }
        this.activeHoldingNotes.clear();
        this.clearCanvas();
    }

    /**
     * Loop principal de renderização e física
     */
    loop(timestamp) {
        if (!this.isPlaying) return;
        if (this.isPaused) return;

        // Tempo decorrido em segundos ajustado pela velocidade
        const elapsedRealMs = timestamp - this.gameStartTime - this.pausedTimeAccumulated;
        this.currentTime = (elapsedRealMs / 1000) * this.speed;

        this.updateGameLogic();
        this.render();

        // Checa término da música
        const lastNote = this.notes[this.notes.length - 1];
        if (lastNote && this.currentTime > lastNote.endTime + 2.0) {
            this.finishGame();
            return;
        }

        this.animFrameId = requestAnimationFrame(this.loop);
    }

    /**
     * Atualização de colisões, miss e segurar de notas
     */
    updateGameLogic() {
        const missTolerance = 0.32; // Se passou 320ms da linha e não apertou, é MISS

        for (let i = 0; i < this.notes.length; i++) {
            const n = this.notes[i];

            // 1. Detectar notas perdidas (MISS)
            if (n.hitState === 'pending' && this.currentTime > n.startTime + missTolerance) {
                n.hitState = 'missed';
                n.hitRating = 'MISS';
                this.stats.miss++;
                this.combo = 0;
                this.addFloatingText('MISS', n.note, '#ef4444');
                this.notifyScoreUpdate();
            }

            // 2. Processar notas em modo HOLD (sendo seguradas)
            if (n.hitState === 'holding') {
                // Adiciona pontos contínuos de sustentação
                this.score += Math.round(2 * this.getComboMultiplier());

                // Spawna pequenas partículas elétricas de energia na tecla
                const keyPos = this.keyPositions.get(n.note);
                if (keyPos && Math.random() < 0.4) {
                    this.spawnParticles(keyPos.x + keyPos.width / 2, this.getHitLineY(), 2, '#ffd700');
                }

                // Se o tempo da nota acabou enquanto ainda estava segurando
                if (this.currentTime >= n.endTime) {
                    n.hitState = 'released';
                    if (!n.holdCredited) {
                        n.holdCredited = true;
                        this.score += Math.round(50 * this.getComboMultiplier());
                        this.addFloatingText('HOLD COMPLETO! ⭐', n.note, '#10b981');
                    }
                }
            }
        }

        // Atualizar partículas
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += p.gravity;
            p.alpha -= p.decay;
            if (p.alpha <= 0) {
                this.particles.splice(i, 1);
            }
        }

        // Atualizar textos flutuantes
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const ft = this.floatingTexts[i];
            ft.y += ft.vy;
            ft.alpha -= 0.025;
            if (ft.alpha <= 0) {
                this.floatingTexts.splice(i, 1);
            }
        }
    }

    getHitLineY() {
        const height = this.canvas ? (this.canvas.height / (window.devicePixelRatio || 1)) : 300;
        return height - 8; // Linha logo acima do feltro vermelho
    }

    getComboMultiplier() {
        if (this.combo >= 30) return 4;
        if (this.combo >= 20) return 3;
        if (this.combo >= 10) return 2;
        return 1;
    }

    /**
     * Intercepta quando o jogador aperta uma tecla (Mouse, Teclado ou Touch)
     */
    handleNoteDown(noteInput) {
        if (!this.isPlaying || this.isPaused) return false;

        const tolerance = 0.38; // Janela de acerto
        let closestNote = null;
        let minDiff = 999;

        // Procura a nota pendente mais próxima da linha de acerto
        for (let i = 0; i < this.notes.length; i++) {
            const n = this.notes[i];
            if (n.hitState !== 'pending') continue;

            if (this.areNotesEqual(noteInput, n.note)) {
                const diff = this.currentTime - n.startTime;
                if (Math.abs(diff) < tolerance && Math.abs(diff) < Math.abs(minDiff)) {
                    minDiff = diff;
                    closestNote = n;
                }
            }
        }

        if (closestNote) {
            closestNote.hitState = 'holding';
            closestNote.pressStart = this.currentTime;
            this.activeHoldingNotes.set(closestNote.note, closestNote);

            const absDiff = Math.abs(minDiff);
            let rating = 'PERFEITO';
            let pts = 100;
            let color = '#00d2ff';

            if (absDiff <= 0.12) {
                rating = 'PERFEITO!';
                pts = 100;
                color = '#00d2ff';
                this.stats.perfect++;
            } else if (absDiff <= 0.24) {
                rating = 'MUITO BOM!';
                pts = 70;
                color = '#10b981';
                this.stats.good++;
            } else {
                rating = minDiff < 0 ? 'CEDO' : 'TARDE';
                pts = 40;
                color = '#f59e0b';
                this.stats.earlyLate++;
            }

            closestNote.hitRating = rating;
            this.combo++;
            if (this.combo > this.maxCombo) this.maxCombo = this.combo;

            const multiplier = this.getComboMultiplier();
            this.score += pts * multiplier;

            const keyPos = this.keyPositions.get(closestNote.note);
            if (keyPos) {
                this.spawnParticles(keyPos.x + keyPos.width / 2, this.getHitLineY(), 15, color);
            }
            this.addFloatingText(`${rating} +${pts * multiplier}`, closestNote.note, color);
            this.notifyScoreUpdate();
            return true;
        }

        return false;
    }

    /**
     * Intercepta quando o jogador solta a tecla
     */
    handleNoteUp(noteInput) {
        if (!this.isPlaying) return;

        const heldNote = this.activeHoldingNotes.get(noteInput);
        if (heldNote && heldNote.hitState === 'holding') {
            const heldDuration = this.currentTime - heldNote.pressStart;
            // Se soltou antes de 60% da nota longa
            if (heldNote.durationSeconds > 0.6 && heldDuration < heldNote.durationSeconds * 0.6) {
                this.addFloatingText('SOLTOU CEDO', heldNote.note, '#f59e0b');
            }
            heldNote.hitState = 'released';
            this.activeHoldingNotes.delete(noteInput);
        }
    }

    spawnParticles(x, y, count, color) {
        for (let i = 0; i < count; i++) {
            const angle = Math.PI + (Math.random() - 0.5) * Math.PI * 0.8; // Para cima
            const speed = 2 + Math.random() * 5;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                gravity: 0.15,
                alpha: 1.0,
                decay: 0.02 + Math.random() * 0.03,
                size: 2.5 + Math.random() * 3,
                color: color
            });
        }
    }

    addFloatingText(text, note, color) {
        const keyPos = this.keyPositions.get(note);
        const x = keyPos ? (keyPos.x + keyPos.width / 2) : 100;
        const y = this.getHitLineY() - 35;

        this.floatingTexts.push({
            text: text,
            x: x,
            y: y,
            vy: -1.2,
            alpha: 1.0,
            color: color
        });
    }

    notifyScoreUpdate() {
        if (this.onScoreUpdate) {
            const totalNotes = this.notes.length || 1;
            const processed = this.stats.perfect + this.stats.good + this.stats.earlyLate + this.stats.miss;
            const progress = Math.min(100, Math.round((processed / totalNotes) * 100));

            const maxPossible = totalNotes * 100;
            const accuracy = Math.min(100, Math.round((this.score / Math.max(1, maxPossible)) * 100));

            this.onScoreUpdate({
                score: this.score,
                combo: this.combo,
                maxCombo: this.maxCombo,
                multiplier: this.getComboMultiplier(),
                accuracy: accuracy,
                progress: progress,
                stats: this.stats
            });
        }
    }

    finishGame() {
        this.stop();
        const totalNotes = this.notes.length || 1;
        const hits = this.stats.perfect + this.stats.good + this.stats.earlyLate;
        const hitRate = Math.round((hits / totalNotes) * 100);

        let stars = 1;
        if (hitRate >= 90) stars = 3;
        else if (hitRate >= 70) stars = 2;

        if (this.onSongComplete) {
            this.onSongComplete({
                score: this.score,
                maxCombo: this.maxCombo,
                hitRate: hitRate,
                stars: stars,
                stats: this.stats
            });
        }
    }

    clearCanvas() {
        if (!this.ctx || !this.canvas) return;
        const w = this.canvas.width / (window.devicePixelRatio || 1);
        const h = this.canvas.height / (window.devicePixelRatio || 1);
        this.ctx.clearRect(0, 0, w, h);
    }

    /**
     * Renderização completa de faixas, notas caindo, linha de acerto e partículas
     */
    render() {
        const dpr = window.devicePixelRatio || 1;
        const w = this.canvas.width / dpr;
        const h = this.canvas.height / dpr;

        this.ctx.clearRect(0, 0, w, h);

        // 1. Fundo da pista com gradiente suave
        const bgGrad = this.ctx.createLinearGradient(0, 0, 0, h);
        bgGrad.addColorStop(0, 'rgba(12, 13, 16, 0.95)');
        bgGrad.addColorStop(1, 'rgba(18, 20, 26, 0.7)');
        this.ctx.fillStyle = bgGrad;
        this.ctx.fillRect(0, 0, w, h);

        // 2. Linhas verticais guias sutis acompanhando as teclas
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        this.ctx.lineWidth = 1;
        this.keyPositions.forEach(pos => {
            this.ctx.beginPath();
            this.ctx.moveTo(pos.x, 0);
            this.ctx.lineTo(pos.x, h);
            this.ctx.stroke();
        });

        const hitLineY = this.getHitLineY();
        const pxPerSec = hitLineY / this.leadInSeconds;

        // 3. Renderizar as notas caindo
        for (let i = 0; i < this.notes.length; i++) {
            const n = this.notes[i];
            const timeUntilHit = n.startTime - this.currentTime;
            const headY = hitLineY - (timeUntilHit * pxPerSec);
            const noteHeight = Math.max(16, n.durationSeconds * pxPerSec);
            const tailY = headY - noteHeight;

            // Desenha apenas se estiver dentro da área visível do canvas
            if (headY >= 0 && tailY <= h) {
                const keyPos = this.keyPositions.get(n.note);
                if (!keyPos) continue;

                const pad = keyPos.isBlack ? 3 : 4;
                const x = keyPos.x + pad;
                const noteW = Math.max(10, keyPos.width - pad * 2);
                const isHeld = (n.hitState === 'holding');
                const isMissed = (n.hitState === 'missed');

                // Paleta de Cores: Branco = Azul Elétrico / Preto = Magenta Neon
                let colorTop = keyPos.isBlack ? '#9333ea' : '#0284c7';
                let colorBottom = keyPos.isBlack ? '#d946ef' : '#38bdf8';

                if (isHeld) {
                    colorTop = '#eab308';
                    colorBottom = '#fef08a';
                } else if (isMissed) {
                    colorTop = '#555';
                    colorBottom = '#777';
                }

                // Corpo da nota (Rounded Rectangle)
                const radius = 6;
                const drawY = Math.max(0, tailY);
                const drawH = Math.min(headY - drawY, h - drawY);

                this.ctx.save();
                this.ctx.beginPath();
                this.roundRect(this.ctx, x, drawY, noteW, drawH, radius);

                const grad = this.ctx.createLinearGradient(0, drawY, 0, drawY + drawH);
                grad.addColorStop(0, colorTop);
                grad.addColorStop(1, colorBottom);
                this.ctx.fillStyle = grad;
                this.ctx.fill();

                // Brilho neon se estiver sendo segurada
                if (isHeld) {
                    this.ctx.shadowColor = '#ffd700';
                    this.ctx.shadowBlur = 12;
                    this.ctx.strokeStyle = '#ffffff';
                    this.ctx.lineWidth = 2;
                    this.ctx.stroke();
                } else {
                    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
                    this.ctx.lineWidth = 1;
                    this.ctx.stroke();
                }

                // Rótulo da nota ou letra dentro da barra caindo
                if (drawH >= 24 && !isMissed) {
                    this.ctx.fillStyle = '#ffffff';
                    this.ctx.font = 'bold 11px sans-serif';
                    this.ctx.textAlign = 'center';
                    this.ctx.shadowBlur = 3;
                    this.ctx.shadowColor = 'rgba(0,0,0,0.8)';
                    const label = n.lyric ? `${n.note} "${n.lyric}"` : n.note;
                    this.ctx.fillText(label, x + noteW / 2, drawY + drawH / 2 + 4);
                }

                this.ctx.restore();
            }
        }

        // 4. Linha de Acerto (Hit-Line)
        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(212, 175, 55, 0.85)';
        this.ctx.lineWidth = 3;
        this.ctx.shadowColor = 'rgba(212, 175, 55, 0.9)';
        this.ctx.shadowBlur = 8;
        this.ctx.beginPath();
        this.ctx.moveTo(0, hitLineY);
        this.ctx.lineTo(w, hitLineY);
        this.ctx.stroke();
        this.ctx.restore();

        // 5. Partículas de impacto
        this.particles.forEach(p => {
            this.ctx.save();
            this.ctx.globalAlpha = Math.max(0, p.alpha);
            this.ctx.fillStyle = p.color;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.restore();
        });

        // 6. Textos flutuantes de feedback (PERFEITO, BOM, MISS)
        this.floatingTexts.forEach(ft => {
            this.ctx.save();
            this.ctx.globalAlpha = Math.max(0, ft.alpha);
            this.ctx.fillStyle = ft.color;
            this.ctx.font = '800 13px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.shadowColor = 'rgba(0,0,0,0.9)';
            this.ctx.shadowBlur = 6;
            this.ctx.fillText(ft.text, ft.x, ft.y);
            this.ctx.restore();
        });
    }

    roundRect(ctx, x, y, width, height, radius) {
        if (width < 2 * radius) radius = width / 2;
        if (height < 2 * radius) radius = height / 2;
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.arcTo(x + width, y, x + width, y + height, radius);
        ctx.arcTo(x + width, y + height, x, y + height, radius);
        ctx.arcTo(x, y + height, x, y, radius);
        ctx.arcTo(x, y, x + width, y, radius);
        ctx.closePath();
    }

    areNotesEqual(n1, n2) {
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
}

window.PianoRhythmGame = PianoRhythmGame;
