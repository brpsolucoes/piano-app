# Concert Grand Piano - Web & Tablet 🎹

Um piano acústico digital realista desenvolvido em **HTML, CSS e JavaScript puro (Vanilla)**, com motor de áudio de alta fidelidade (samples gravados de piano de cauda), dicionário didático de acordes/escalas, modo de aprendizado de músicas passo a passo e **otimização completa para Tablets (iPad e Android)**.

---

## 📱 Recursos Especiais para Tablet (PWA)

1. **Modo Tela Cheia (App Nativo)**:
   * Compatível com **PWA** (*Progressive Web App*). Você pode adicionar o site à tela de início do seu iPad ou Android para utilizá-lo em tela cheia real, sem barras de navegador.
2. **Ajuste de Tamanho das Teclas (2 Oitavas Confortáveis)**:
   * Em telas de tablet, 3 oitavas podem deixar as teclas finas para tocar com os dedos. Com o seletor **"2 Oitavas (Recomendado Tablet)"**, as teclas ganham a largura exata de um piano de verdade, com botões para transpor a oitava (`◀` e `▶`).
3. **Barra de Pedal de Sustentação Touch**:
   * Barra ergonômica inferior com suporte a **Segurar com o Dedo (Touch Hold)** (como um pedal de pé com o polegar esquerdo) ou **Modo Trava**.
4. **Multi-Touch & Proteção de Gestos**:
   * Permite tocar acordes complexos com 3 a 5 dedos simultâneos sem travamentos. Gestos nativos do tablet (zoom por pinça, rolagem acidental e menu de toque longo) são bloqueados na superfície do piano.
5. **Detector de Orientação**:
   * Alerta automático recomendando posicionar o tablet na horizontal (modo Paisagem).

---

## 🚀 Como Publicar no GitHub Pages (Passo a Passo)

Para acessar o piano no seu tablet de qualquer lugar:

### 1. Inicializar o repositório Git local e fazer commit:
```bash
git init
git add .
git commit -m "feat: piano realista com suporte completo a tablet e github pages"
```

### 2. Criar o repositório no GitHub:
1. Acesse [github.com/new](https://github.com/new).
2. Dê o nome de `piano-app` (pode ser público ou privado).
3. Conecte o repositório e envie os arquivos:
```bash
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/piano-app.git
git push -u origin main
```

### 3. Ativar o GitHub Pages:
1. No seu repositório no GitHub, clique na aba **Settings** (Configurações).
2. No menu lateral esquerdo, clique em **Pages**.
3. Em **Build and deployment** > **Source**, selecione **Deploy from a branch**.
4. Em **Branch**, selecione `main` e a pasta `/(root)`, depois clique em **Save**.
5. Aguarde cerca de 1 a 2 minutos. O GitHub gerará o link do seu piano:
   `https://SEU_USUARIO.github.io/piano-app/`

---

## 📲 Como Instalar na Tela de Início do seu Tablet

### No iPad (Safari):
1. Abra o link do seu GitHub Pages no **Safari**.
2. Toque no botão **Compartilhar** (ícone de um quadrado com uma seta para cima).
3. Role para baixo e selecione **"Adicionar à Tela de Início"**.
4. Toque em **Adicionar**. O piano agora abre como um app nativo, sem barras de navegação!

### No Android Tablet (Chrome):
1. Abra o link do seu GitHub Pages no **Google Chrome**.
2. Toque nos **3 pontinhos** no canto superior direito.
3. Selecione **"Instalar Aplicativo"** ou **"Adicionar à Tela Inicial"**.
4. O ícone dourado do piano aparecerá na sua tela inicial pronto para tocar em tela cheia!

---

## 💻 Teste Local no Computador

Para testar no seu computador antes de subir:
```bash
python3 -m http.server 8080
```
Depois acesse `http://localhost:8080` no navegador.
