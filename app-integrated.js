// Global state
let currentMode = 'encrypt';
let secretData = null;
let coverImage = null;
let stegoImage = null;
let extractedData = null;

// Tutorial Section Data
let tutorialData = {
    originalCanvas: null,
    stegoCanvas: null,
    currentPixelX: null,
    currentPixelY: null,
    embeddingDemo: false
};

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    setupModeToggle();
    setupFileUploads();
    setupPasswordToggles();
    setupTabs();
    setupButtons();
    setupPasswordStrength();
    setupMessageHandlers();
    initializeTutorialSection(); // Initialize tutorial functionality
}

// Mode Toggle
function setupModeToggle() {
    const modeButtons = document.querySelectorAll('.mode-btn');
    const modeContents = document.querySelectorAll('.mode-content');
    
    modeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.dataset.mode;
            
            // Update buttons
            modeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Update content
            modeContents.forEach(content => {
                content.style.display = content.id === `${mode}-mode` ? 'block' : 'none';
            });
            
            currentMode = mode;
            if (mode !== 'tutorial') {
                resetState();
            }
        });
    });
}

// File Upload Handlers
function setupFileUploads() {
    // Secret file upload
    setupFileUpload('secret-file-upload', 'secret-file', handleSecretFile);
    // Cover image upload
    setupFileUpload('cover-image-upload', 'cover-image', handleCoverImage);
    // Stego image upload
    setupFileUpload('stego-image-upload', 'stego-image', handleStegoImage);
}

function setupFileUpload(containerId, inputId, handler) {
    const container = document.getElementById(containerId);
    const input = document.getElementById(inputId);
    
    if (!container || !input) return;
    
    // Drag and drop
    container.addEventListener('dragover', (e) => {
        e.preventDefault();
        container.classList.add('dragover');
    });
    
    container.addEventListener('dragleave', () => {
        container.classList.remove('dragover');
    });
    
    container.addEventListener('drop', (e) => {
        e.preventDefault();
        container.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            input.files = files;
            handler(files[0]);
        }
    });
    
    // Click to upload
    container.addEventListener('click', () => {
        input.click();
    });
    
    // File input change
    input.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handler(e.target.files[0]);
        }
    });
}

// File Handlers
async function handleSecretFile(file) {
    if (file.size > 1024 * 1024) { // 1MB limit
        showError('File too large. Maximum size is 1MB.');
        return;
    }
    
    try {
        const content = await readFileAsArrayBuffer(file);
        secretData = {
            type: 'file',
            name: file.name,
            content: content,
            mimeType: file.type
        };
        updateUI();
        showSuccess(`File "${file.name}" loaded successfully.`);
    } catch (error) {
        showError('Error reading file: ' + error.message);
    }
}

async function handleCoverImage(file) {
    if (!file.type.match(/^image\/(png|bmp)$/)) {
        showError('Please select a PNG or BMP image.');
        return;
    }
    
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
        showError('Image too large. Maximum size is 10MB.');
        return;
    }
    
    try {
        const img = await loadImage(file);
        coverImage = {
            file: file,
            element: img,
            canvas: await imageToCanvas(img)
        };
        
        // Show preview
        const preview = document.getElementById('cover-preview');
        preview.innerHTML = '';
        const previewImg = img.cloneNode();
        previewImg.style.maxWidth = '100%';
        previewImg.style.maxHeight = '200px';
        preview.appendChild(previewImg);
        
        updateUI();
        showSuccess('Cover image loaded successfully.');
    } catch (error) {
        showError('Error loading image: ' + error.message);
    }
}

async function handleStegoImage(file) {
    if (!file.type.match(/^image\/(png|bmp)$/)) {
        showError('Please select a PNG or BMP image.');
        return;
    }
    
    try {
        const img = await loadImage(file);
        stegoImage = {
            file: file,
            element: img,
            canvas: await imageToCanvas(img)
        };
        
        // Show preview
        const preview = document.getElementById('stego-input-preview');
        preview.innerHTML = '';
        const previewImg = img.cloneNode();
        previewImg.style.maxWidth = '100%';
        previewImg.style.maxHeight = '200px';
        preview.appendChild(previewImg);
        
        updateUI();
        showSuccess('Stego image loaded successfully.');
    } catch (error) {
        showError('Error loading image: ' + error.message);
    }
}

// Password Toggle
function setupPasswordToggles() {
    const encryptToggle = document.getElementById('encrypt-toggle');
    const decryptToggle = document.getElementById('decrypt-toggle');
    
    if (encryptToggle) {
        encryptToggle.addEventListener('click', function() {
            togglePasswordVisibility('encrypt-passphrase', this);
        });
    }
    
    if (decryptToggle) {
        decryptToggle.addEventListener('click', function() {
            togglePasswordVisibility('decrypt-passphrase', this);
        });
    }
}

function togglePasswordVisibility(inputId, toggleBtn) {
    const input = document.getElementById(inputId);
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    toggleBtn.textContent = isPassword ? '👁️' : '🙈';
}

// Tabs
function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;
            
            // Update buttons
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Update content
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === `${tabId}-tab`) {
                    content.classList.add('active');
                }
            });
            
            updateUI();
        });
    });
}

// Buttons
function setupButtons() {
    const encryptBtn = document.getElementById('encrypt-btn');
    const decryptBtn = document.getElementById('decrypt-btn');
    const downloadStegoBtn = document.getElementById('download-stego');
    const downloadExtractedBtn = document.getElementById('download-extracted');
    
    if (encryptBtn) encryptBtn.addEventListener('click', performEncryptEmbed);
    if (decryptBtn) decryptBtn.addEventListener('click', performExtractDecrypt);
    if (downloadStegoBtn) downloadStegoBtn.addEventListener('click', downloadStegoImage);
    if (downloadExtractedBtn) downloadExtractedBtn.addEventListener('click', downloadExtractedData);
}

// Password Strength
function setupPasswordStrength() {
    const passwordInput = document.getElementById('encrypt-passphrase');
    if (passwordInput) {
        passwordInput.addEventListener('input', updatePasswordStrength);
    }
}

function updatePasswordStrength() {
    const password = document.getElementById('encrypt-passphrase').value;
    const strengthBar = document.querySelector('.strength-fill');
    const strengthText = document.querySelector('.strength-text');
    
    if (!strengthBar || !strengthText) return;
    
    const score = calculatePasswordStrength(password);
    const percentage = (score / 5) * 100;
    
    strengthBar.style.width = percentage + '%';
    
    if (score <= 1) {
        strengthBar.style.background = 'var(--color-error)';
        strengthText.textContent = 'Very Weak';
    } else if (score <= 2) {
        strengthBar.style.background = 'var(--color-warning)';
        strengthText.textContent = 'Weak';
    } else if (score <= 3) {
        strengthBar.style.background = 'var(--color-orange-400)';
        strengthText.textContent = 'Fair';
    } else if (score <= 4) {
        strengthBar.style.background = 'var(--color-success)';
        strengthText.textContent = 'Good';
    } else {
        strengthBar.style.background = 'var(--color-teal-400)';
        strengthText.textContent = 'Strong';
    }
}

function calculatePasswordStrength(password) {
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return Math.min(score, 5);
}

// Message Handlers
function setupMessageHandlers() {
    const errorClose = document.querySelector('.error-close');
    const successClose = document.querySelector('.success-close');
    const secretTextInput = document.getElementById('secret-text');
    const encryptPassphraseInput = document.getElementById('encrypt-passphrase');
    const decryptPassphraseInput = document.getElementById('decrypt-passphrase');
    
    if (errorClose) {
        errorClose.addEventListener('click', () => {
            document.getElementById('error-message').style.display = 'none';
        });
    }
    
    if (successClose) {
        successClose.addEventListener('click', () => {
            document.getElementById('success-message').style.display = 'none';
        });
    }
    
    // Text input for secret data
    if (secretTextInput) {
        secretTextInput.addEventListener('input', function() {
            if (this.value.trim()) {
                secretData = {
                    type: 'text',
                    content: new TextEncoder().encode(this.value)
                };
            } else {
                secretData = null;
            }
            updateUI();
        });
    }
    
    // Passphrase inputs
    if (encryptPassphraseInput) encryptPassphraseInput.addEventListener('input', updateUI);
    if (decryptPassphraseInput) decryptPassphraseInput.addEventListener('input', updateUI);
}

// UI State Management
function updateUI() {
    const encryptBtn = document.getElementById('encrypt-btn');
    const decryptBtn = document.getElementById('decrypt-btn');
    
    if (currentMode === 'encrypt' && encryptBtn) {
        const hasSecretData = secretData !== null;
        const hasCoverImage = coverImage !== null;
        const passphrase = document.getElementById('encrypt-passphrase')?.value || '';
        const hasPassphrase = passphrase.length >= 6;
        
        encryptBtn.disabled = !(hasSecretData && hasCoverImage && hasPassphrase);
    } else if (currentMode === 'decrypt' && decryptBtn) {
        const hasStegoImage = stegoImage !== null;
        const passphrase = document.getElementById('decrypt-passphrase')?.value || '';
        const hasPassphrase = passphrase.length > 0;
        
        decryptBtn.disabled = !(hasStegoImage && hasPassphrase);
    }
}

function resetState() {
    secretData = null;
    coverImage = null;
    stegoImage = null;
    extractedData = null;
    
    // Clear inputs
    const inputs = [
        'secret-text', 'secret-file', 'cover-image', 'stego-image',
        'encrypt-passphrase', 'decrypt-passphrase'
    ];
    
    inputs.forEach(id => {
        const element = document.getElementById(id);
        if (element) element.value = '';
    });
    
    // Clear previews
    const previews = ['cover-preview', 'stego-input-preview'];
    previews.forEach(id => {
        const element = document.getElementById(id);
        if (element) element.innerHTML = '';
    });
    
    // Hide results
    const results = [
        'encrypt-results', 'decrypt-results',
        'encrypt-progress', 'decrypt-progress'
    ];
    
    results.forEach(id => {
        const element = document.getElementById(id);
        if (element) element.style.display = 'none';
    });
    
    updateUI();
}

// Main Operations
async function performEncryptEmbed() {
    const btn = document.getElementById('encrypt-btn');
    const progressContainer = document.getElementById('encrypt-progress');
    const progressFill = progressContainer.querySelector('.progress-fill');
    const progressText = progressContainer.querySelector('.progress-text');
    
    try {
        btn.classList.add('loading');
        progressContainer.style.display = 'block';
        
        // Step 1: Prepare data
        progressFill.style.width = '20%';
        progressText.textContent = 'Preparing data...';
        await sleep(500);
        
        const passphrase = document.getElementById('encrypt-passphrase').value;
        
        // Step 2: Encrypt data
        progressFill.style.width = '40%';
        progressText.textContent = 'Encrypting data...';
        await sleep(500);
        
        const encryptedData = await encryptData(secretData.content, passphrase);
        
        // Step 3: Embed in image
        progressFill.style.width = '70%';
        progressText.textContent = 'Embedding in image...';
        await sleep(500);
        
        const stegoCanvas = await embedDataInImage(encryptedData, coverImage.canvas);
        
        // Step 4: Calculate metrics
        progressFill.style.width = '90%';
        progressText.textContent = 'Calculating quality metrics...';
        await sleep(500);
        
        const psnr = calculatePSNR(coverImage.canvas, stegoCanvas);
        const capacity = (encryptedData.length / (coverImage.canvas.width * coverImage.canvas.height * 3)) * 100;
        
        // Step 5: Complete
        progressFill.style.width = '100%';
        progressText.textContent = 'Complete!';
        await sleep(500);
        
        // Show results
        showEncryptResults(coverImage.canvas, stegoCanvas, psnr, capacity);
        
        progressContainer.style.display = 'none';
        showSuccess('Data encrypted and embedded successfully!');
        
    } catch (error) {
        progressContainer.style.display = 'none';
        showError('Encryption failed: ' + error.message);
    } finally {
        btn.classList.remove('loading');
    }
}

async function performExtractDecrypt() {
    const btn = document.getElementById('decrypt-btn');
    const progressContainer = document.getElementById('decrypt-progress');
    const progressFill = progressContainer.querySelector('.progress-fill');
    const progressText = progressContainer.querySelector('.progress-text');
    
    try {
        btn.classList.add('loading');
        progressContainer.style.display = 'block';
        
        // Step 1: Extract data
        progressFill.style.width = '30%';
        progressText.textContent = 'Extracting data from image...';
        await sleep(500);
        
        const extractedEncryptedData = await extractDataFromImage(stegoImage.canvas);
        
        // Step 2: Decrypt data
        progressFill.style.width = '70%';
        progressText.textContent = 'Decrypting data...';
        await sleep(500);
        
        const passphrase = document.getElementById('decrypt-passphrase').value;
        const decryptedData = await decryptData(extractedEncryptedData, passphrase);
        
        // Step 3: Complete
        progressFill.style.width = '100%';
        progressText.textContent = 'Complete!';
        await sleep(500);
        
        extractedData = decryptedData;
        showDecryptResults(decryptedData);
        
        progressContainer.style.display = 'none';
        showSuccess('Data extracted and decrypted successfully!');
        
    } catch (error) {
        progressContainer.style.display = 'none';
        showError('Decryption failed: ' + error.message);
    } finally {
        btn.classList.remove('loading');
    }
}

// Cryptography Functions
async function encryptData(data, passphrase) {
    const key = await deriveKey(passphrase);
    const iv = crypto.getRandomValues(new Uint8Array(16));
    
    const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-CBC', iv: iv },
        key,
        data
    );
    
    // Combine IV + encrypted data + length info
    const result = new Uint8Array(4 + iv.length + encrypted.byteLength);
    const dataView = new DataView(result.buffer);
    dataView.setUint32(0, encrypted.byteLength, false);
    result.set(iv, 4);
    result.set(new Uint8Array(encrypted), 4 + iv.length);
    
    return result;
}

async function decryptData(encryptedData, passphrase) {
    const key = await deriveKey(passphrase);
    const dataView = new DataView(encryptedData.buffer);
    const dataLength = dataView.getUint32(0, false);
    const iv = encryptedData.slice(4, 20);
    const encrypted = encryptedData.slice(20, 20 + dataLength);
    
    const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-CBC', iv: iv },
        key,
        encrypted
    );
    
    return new Uint8Array(decrypted);
}

async function deriveKey(passphrase) {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(passphrase),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
    );
    
    const salt = encoder.encode('steganography-salt'); // Fixed salt for simplicity
    
    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: 100000,
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-CBC', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

// Steganography Functions
async function embedDataInImage(data, canvas) {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    
    // Check capacity
    const maxCapacity = Math.floor((pixels.length / 4) * 3 / 8); // 3 color channels, 1 bit per channel
    if (data.length > maxCapacity - 4) {
        throw new Error('Data too large for cover image');
    }
    
    // Embed data length first (4 bytes)
    const lengthBytes = new Uint8Array(4);
    new DataView(lengthBytes.buffer).setUint32(0, data.length, false);
    const fullData = new Uint8Array(lengthBytes.length + data.length);
    fullData.set(lengthBytes);
    fullData.set(data, lengthBytes.length);
    
    let bitIndex = 0;
    for (let i = 0; i < fullData.length; i++) {
        const byte = fullData[i];
        for (let bit = 7; bit >= 0; bit--) {
            const bitValue = (byte >> bit) & 1;
            const pixelIndex = Math.floor(bitIndex / 3) * 4 + (bitIndex % 3);
            
            if (pixelIndex >= pixels.length) {
                throw new Error('Image too small for data');
            }
            
            pixels[pixelIndex] = (pixels[pixelIndex] & 0xFE) | bitValue;
            bitIndex++;
        }
    }
    
    const newCanvas = document.createElement('canvas');
    newCanvas.width = canvas.width;
    newCanvas.height = canvas.height;
    const newCtx = newCanvas.getContext('2d');
    newCtx.putImageData(imageData, 0, 0);
    
    return newCanvas;
}

async function extractDataFromImage(canvas) {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    
    // Extract data length first (4 bytes)
    let bitIndex = 0;
    const lengthBytes = new Uint8Array(4);
    
    for (let i = 0; i < 4; i++) {
        let byte = 0;
        for (let bit = 7; bit >= 0; bit--) {
            const pixelIndex = Math.floor(bitIndex / 3) * 4 + (bitIndex % 3);
            const bitValue = pixels[pixelIndex] & 1;
            byte = (byte << 1) | bitValue;
            bitIndex++;
        }
        lengthBytes[i] = byte;
    }
    
    const dataLength = new DataView(lengthBytes.buffer).getUint32(0, false);
    if (dataLength <= 0 || dataLength > 1024 * 1024) {
        throw new Error('Invalid data length or corrupted image');
    }
    
    // Extract actual data
    const data = new Uint8Array(dataLength);
    for (let i = 0; i < dataLength; i++) {
        let byte = 0;
        for (let bit = 7; bit >= 0; bit--) {
            const pixelIndex = Math.floor(bitIndex / 3) * 4 + (bitIndex % 3);
            const bitValue = pixels[pixelIndex] & 1;
            byte = (byte << 1) | bitValue;
            bitIndex++;
        }
        data[i] = byte;
    }
    
    return data;
}

// Utility Functions
function calculatePSNR(original, modified) {
    const ctx1 = original.getContext('2d');
    const ctx2 = modified.getContext('2d');
    const imageData1 = ctx1.getImageData(0, 0, original.width, original.height);
    const imageData2 = ctx2.getImageData(0, 0, modified.width, modified.height);
    const pixels1 = imageData1.data;
    const pixels2 = imageData2.data;
    
    let mse = 0;
    const pixelCount = pixels1.length / 4 * 3; // RGB channels only
    
    for (let i = 0; i < pixels1.length; i += 4) {
        for (let j = 0; j < 3; j++) { // RGB channels
            const diff = pixels1[i + j] - pixels2[i + j];
            mse += diff * diff;
        }
    }
    
    mse /= pixelCount;
    if (mse === 0) return Infinity;
    
    const maxPixelValue = 255;
    const psnr = 20 * Math.log10(maxPixelValue / Math.sqrt(mse));
    return Math.round(psnr * 100) / 100;
}

async function loadImage(file) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
    });
}

async function imageToCanvas(img) {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    return canvas;
}

function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(new Uint8Array(reader.result));
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Results Display
function showEncryptResults(originalCanvas, stegoCanvas, psnr, capacity) {
    const resultsContainer = document.getElementById('encrypt-results');
    
    // Show original image
    const originalPreview = document.getElementById('original-preview');
    originalPreview.innerHTML = '';
    const originalImg = document.createElement('img');
    originalImg.src = originalCanvas.toDataURL();
    originalImg.style.maxWidth = '100%';
    originalImg.style.maxHeight = '200px';
    originalPreview.appendChild(originalImg);
    
    // Show stego image
    const stegoPreview = document.getElementById('stego-preview');
    stegoPreview.innerHTML = '';
    const stegoImg = document.createElement('img');
    stegoImg.src = stegoCanvas.toDataURL();
    stegoImg.style.maxWidth = '100%';
    stegoImg.style.maxHeight = '200px';
    stegoPreview.appendChild(stegoImg);
    
    // Update metrics
    document.getElementById('psnr-value').textContent = psnr === Infinity ? '∞ dB' : psnr + ' dB';
    document.getElementById('capacity-used').textContent = capacity.toFixed(2) + '%';
    
    // Store stego canvas for download
    window.stegoCanvasForDownload = stegoCanvas;
    
    resultsContainer.style.display = 'block';
    
    // Update tutorial with results
    setTimeout(() => {
        updateTutorialWithResults();
    }, 100);
}

function showDecryptResults(data) {
    const resultsContainer = document.getElementById('decrypt-results');
    const display = document.getElementById('extracted-display');
    const downloadBtn = document.getElementById('download-extracted');
    
    // Try to display as text first
    try {
        const text = new TextDecoder('utf-8', { fatal: true }).decode(data);
        display.textContent = text;
        downloadBtn.style.display = 'none';
    } catch {
        // Binary data - show hex
        const hex = Array.from(data)
            .map(b => b.toString(16).padStart(2, '0'))
            .join(' ');
        display.textContent = 'Binary data (hex): ' + hex;
        downloadBtn.style.display = 'block';
    }
    
    resultsContainer.style.display = 'block';
}

// Download Functions
function downloadStegoImage() {
    if (!window.stegoCanvasForDownload) return;
    
    window.stegoCanvasForDownload.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'stego-image.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
}

function downloadExtractedData() {
    if (!extractedData) return;
    
    const blob = new Blob([extractedData], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'extracted-data.bin';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Message Functions
function showError(message) {
    const errorElement = document.getElementById('error-message');
    const errorText = errorElement.querySelector('.error-text');
    errorText.textContent = message;
    errorElement.style.display = 'block';
    setTimeout(() => {
        errorElement.style.display = 'none';
    }, 5000);
}

function showSuccess(message) {
    const successElement = document.getElementById('success-message');
    const successText = successElement.querySelector('.success-text');
    successText.textContent = message;
    successElement.style.display = 'block';
    setTimeout(() => {
        successElement.style.display = 'none';
    }, 3000);
}

// ===============================
// TUTORIAL SECTION FUNCTIONS
// ===============================

function initializeTutorialSection() {
    setupTutorialNavigation();
    setupPixelAnalysis();
    setupBinaryDemo();
    setupEmbeddingDemo();
}

function setupTutorialNavigation() {
    const tutorialBtns = document.querySelectorAll('.tutorial-nav-btn');
    const tutorialContents = document.querySelectorAll('.tutorial-content');
    
    tutorialBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tutorialType = btn.dataset.tutorial;
            
            // Update active button
            tutorialBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Update active content
            tutorialContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === `${tutorialType}-tutorial`) {
                    content.classList.add('active');
                }
            });
        });
    });
}

function setupPixelAnalysis() {
    const originalCanvas = document.getElementById('original-analysis-canvas');
    const stegoCanvas = document.getElementById('stego-analysis-canvas');
    
    if (originalCanvas) {
        originalCanvas.addEventListener('click', (e) => {
            handlePixelClick(e, originalCanvas, 'original');
        });
    }
    
    if (stegoCanvas) {
        stegoCanvas.addEventListener('click', (e) => {
            handlePixelClick(e, stegoCanvas, 'stego');
        });
    }
}

function handlePixelClick(event, canvas, type) {
    if (!tutorialData.originalCanvas || !tutorialData.stegoCanvas) {
        showError('Please perform an encryption first to enable pixel analysis.');
        return;
    }
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = Math.floor((event.clientX - rect.left) * scaleX);
    const y = Math.floor((event.clientY - rect.top) * scaleY);
    
    tutorialData.currentPixelX = x;
    tutorialData.currentPixelY = y;
    
    displayPixelAnalysis(x, y);
}

function displayPixelAnalysis(x, y) {
    if (!tutorialData.originalCanvas || !tutorialData.stegoCanvas) {
        return;
    }
    
    // Scale coordinates to original image dimensions
    const originalCanvas = document.getElementById('original-analysis-canvas');
    const scaleX = tutorialData.originalCanvas.width / originalCanvas.width;
    const scaleY = tutorialData.originalCanvas.height / originalCanvas.height;
    
    const actualX = Math.floor(x * scaleX);
    const actualY = Math.floor(y * scaleY);
    
    const originalCtx = tutorialData.originalCanvas.getContext('2d');
    const stegoCtx = tutorialData.stegoCanvas.getContext('2d');
    
    const originalImageData = originalCtx.getImageData(actualX, actualY, 1, 1);
    const stegoImageData = stegoCtx.getImageData(actualX, actualY, 1, 1);
    
    const originalPixels = originalImageData.data;
    const stegoPixels = stegoImageData.data;
    
    const pixelDetails = document.getElementById('pixel-details');
    const tableBody = document.getElementById('pixel-comparison-data');
    
    if (!pixelDetails || !tableBody) return;
    
    pixelDetails.style.display = 'block';
    
    const channels = ['Red', 'Green', 'Blue'];
    tableBody.innerHTML = '';
    
    for (let i = 0; i < 3; i++) {
        const originalValue = originalPixels[i];
        const stegoValue = stegoPixels[i];
        const originalBinary = originalValue.toString(2).padStart(8, '0');
        const stegoBinary = stegoValue.toString(2).padStart(8, '0');
        const lsbChanged = (originalValue & 1) !== (stegoValue & 1);
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${channels[i]}</td>
            <td>${originalValue}</td>
            <td><span class="binary-value">${originalBinary}</span></td>
            <td>${stegoValue}</td>
            <td><span class="binary-value">${stegoBinary}</span></td>
            <td class="${lsbChanged ? 'lsb-changed' : ''}">${lsbChanged ? 'YES' : 'NO'}</td>
        `;
        tableBody.appendChild(row);
    }
    
    // Update pixel info displays
    document.getElementById('original-pixel-info').textContent = 
        `Pixel (${actualX}, ${actualY}): R=${originalPixels[0]}, G=${originalPixels[1]}, B=${originalPixels[2]}`;
    document.getElementById('stego-pixel-info').textContent = 
        `Pixel (${actualX}, ${actualY}): R=${stegoPixels[0]}, G=${stegoPixels[1]}, B=${stegoPixels[2]}`;
}

function setupBinaryDemo() {
    const demoTextInput = document.getElementById('demo-secret-text');
    const binaryOutput = document.getElementById('demo-binary-output');
    
    if (demoTextInput && binaryOutput) {
        demoTextInput.addEventListener('input', function() {
            const text = this.value;
            if (text) {
                const binaryString = textToBinary(text);
                binaryOutput.innerHTML = formatBinaryDisplay(binaryString);
            } else {
                binaryOutput.textContent = 'Enter text above to see binary representation';
            }
        });
    }
}

function textToBinary(text) {
    return text.split('').map(char => {
        return char.charCodeAt(0).toString(2).padStart(8, '0');
    }).join(' ');
}

function formatBinaryDisplay(binaryString) {
    const bits = binaryString.split(' ');
    return bits.map((byte, index) => {
        const char = String.fromCharCode(parseInt(byte, 2));
        return `<span class="binary-byte" title="Character: '${char}'">${byte}</span>`;
    }).join(' ');
}

function setupEmbeddingDemo() {
    const demoBtn = document.getElementById('demo-embed-btn');
    const pixelGrid = document.getElementById('demo-pixel-grid');
    
    if (demoBtn && pixelGrid) {
        // Create demo pixel grid
        createDemoPixelGrid();
        
        demoBtn.addEventListener('click', function() {
            if (this.textContent === 'Start Embedding Demo') {
                startEmbeddingDemo();
            } else {
                resetEmbeddingDemo();
            }
        });
    }
}

function createDemoPixelGrid() {
    const grid = document.getElementById('demo-pixel-grid');
    if (!grid) return;
    
    grid.innerHTML = '';
    
    // Create 8x8 grid of demo pixels
    for (let i = 0; i < 64; i++) {
        const pixel = document.createElement('div');
        pixel.className = 'demo-pixel';
        pixel.dataset.index = i;
        
        // Random RGB values for demo
        const r = Math.floor(Math.random() * 256);
        const g = Math.floor(Math.random() * 256);
        const b = Math.floor(Math.random() * 256);
        
        pixel.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
        pixel.title = `RGB(${r}, ${g}, ${b})`;
        pixel.textContent = i;
        
        grid.appendChild(pixel);
    }
}

async function startEmbeddingDemo() {
    if (tutorialData.embeddingDemo) return;
    
    tutorialData.embeddingDemo = true;
    const btn = document.getElementById('demo-embed-btn');
    const progressBar = document.querySelector('#demo-embedding-progress .progress-fill');
    const operationText = document.querySelector('.current-operation');
    
    btn.disabled = true;
    btn.textContent = 'Demo Running...';
    
    // Demo data: "Hi"
    const demoText = "Hi";
    const demoBinary = textToBinary(demoText).replace(/\s/g, '');
    const pixels = document.querySelectorAll('.demo-pixel');
    
    operationText.textContent = `Embedding "${demoText}" (${demoBinary.length} bits)`;
    
    // Simulate embedding process
    for (let i = 0; i < demoBinary.length && i < pixels.length * 3; i++) {
        const pixelIndex = Math.floor(i / 3);
        const channelIndex = i % 3;
        const pixel = pixels[pixelIndex];
        
        if (pixel) {
            pixel.classList.add('embedding');
            
            await sleep(300);
            
            pixel.classList.remove('embedding');
            pixel.classList.add('embedded');
            
            // Update progress
            const progress = ((i + 1) / demoBinary.length) * 100;
            progressBar.style.width = `${progress}%`;
            
            operationText.textContent = `Embedded bit ${i + 1}/${demoBinary.length} in pixel ${pixelIndex + 1}, channel ${['R', 'G', 'B'][channelIndex]}`;
        }
    }
    
    operationText.textContent = 'Embedding complete!';
    btn.textContent = 'Reset Demo';
    btn.disabled = false;
    tutorialData.embeddingDemo = false;
}

function resetEmbeddingDemo() {
    const btn = document.getElementById('demo-embed-btn');
    const progressBar = document.querySelector('#demo-embedding-progress .progress-fill');
    const operationText = document.querySelector('.current-operation');
    const pixels = document.querySelectorAll('.demo-pixel');
    
    // Reset pixels
    pixels.forEach(pixel => {
        pixel.classList.remove('embedding', 'embedded');
    });
    
    // Reset progress
    progressBar.style.width = '0%';
    operationText.textContent = 'Ready to start...';
    
    // Reset button
    btn.textContent = 'Start Embedding Demo';
    
    // Regenerate grid
    createDemoPixelGrid();
}

function updateTutorialWithResults() {
    if (!window.stegoCanvasForDownload || !coverImage) {
        return;
    }
    
    // Copy canvases for tutorial analysis
    tutorialData.originalCanvas = coverImage.canvas;
    tutorialData.stegoCanvas = window.stegoCanvasForDownload;
    
    // Update tutorial canvases
    const originalAnalysisCanvas = document.getElementById('original-analysis-canvas');
    const stegoAnalysisCanvas = document.getElementById('stego-analysis-canvas');
    
    if (originalAnalysisCanvas && stegoAnalysisCanvas) {
        // Set canvas dimensions
        const maxWidth = 300;
        const maxHeight = 200;
        
        const scaleX = Math.min(maxWidth / tutorialData.originalCanvas.width, maxHeight / tutorialData.originalCanvas.height);
        const scaleY = scaleX; // Keep aspect ratio
        
        originalAnalysisCanvas.width = Math.floor(tutorialData.originalCanvas.width * scaleX);
        originalAnalysisCanvas.height = Math.floor(tutorialData.originalCanvas.height * scaleY);
        stegoAnalysisCanvas.width = originalAnalysisCanvas.width;
        stegoAnalysisCanvas.height = originalAnalysisCanvas.height;
        
        // Draw scaled images
        const originalCtx = originalAnalysisCanvas.getContext('2d');
        const stegoCtx = stegoAnalysisCanvas.getContext('2d');
        
        originalCtx.drawImage(tutorialData.originalCanvas, 0, 0, originalAnalysisCanvas.width, originalAnalysisCanvas.height);
        stegoCtx.drawImage(tutorialData.stegoCanvas, 0, 0, stegoAnalysisCanvas.width, stegoAnalysisCanvas.height);
        
        // Update pixel info displays
        document.getElementById('original-pixel-info').textContent = 'Click on a pixel to see its values';
        document.getElementById('stego-pixel-info').textContent = 'Click on a pixel to see its values';
    }
    
    // Update binary displays
    updateBinaryDisplays();
}

function updateBinaryDisplays() {
    if (!secretData) return;
    
    // Update secret binary display
    const secretBinaryDisplay = document.getElementById('secret-binary-display');
    if (secretBinaryDisplay && secretData.content) {
        const binaryString = Array.from(secretData.content.slice(0, 50)) // Show first 50 bytes
            .map(byte => byte.toString(2).padStart(8, '0'))
            .join(' ');
        secretBinaryDisplay.innerHTML = formatBinaryForDisplay(binaryString) + 
            (secretData.content.length > 50 ? '<br><span style="color: var(--color-text-secondary);">[...truncated, showing first 50 bytes]</span>' : '');
    }
    
    // Update bit sequence display
    const bitSequenceDisplay = document.getElementById('bit-sequence');
    if (bitSequenceDisplay) {
        updateBitSequenceDisplay();
    }
}

function formatBinaryForDisplay(binaryString, maxLength = 500) {
    if (binaryString.length > maxLength) {
        return binaryString.substring(0, maxLength) + '... <span style="color: var(--color-text-secondary);">[truncated]</span>';
    }
    return binaryString;
}

function updateBitSequenceDisplay() {
    const display = document.getElementById('bit-sequence');
    if (!display || !secretData) return;
    
    // Create dummy length header (32 bits)
    const lengthBits = '00000000000000000000000000001010'; // Example: 10 bytes
    
    const dataBits = Array.from(secretData.content.slice(0, 10)) // Show first 10 bytes
        .map(byte => byte.toString(2).padStart(8, '0'))
        .join('');
    
    display.innerHTML = `
        <span class="bit-group length" title="Data length header (32 bits)">${lengthBits}</span>
        <span class="bit-group payload" title="Encrypted payload data">${dataBits}</span>
        ${secretData.content.length > 10 ? '<span style="color: var(--color-text-secondary);">... [more data]</span>' : ''}
    `;
}

// Add these functions to your app-integrated.js file

// =============================== 
// MODIFIED PIXELS LIST FUNCTIONS
// ===============================

let modifiedPixelsData = [];
let currentFilter = 'all';
let currentView = 'compact';
let currentPage = 1;
const pixelsPerPage = 50;

// Initialize modified pixels list functionality
function initializeModifiedPixelsList() {
    setupViewToggle();
    setupChannelFilter();
    setupPagination();
    setupExportFunction();
}

// Setup view toggle between compact and detailed
function setupViewToggle() {
    const viewToggleBtn = document.getElementById('view-toggle-btn');
    const compactView = document.getElementById('compact-view');
    const detailedView = document.getElementById('detailed-view');
    
    if (viewToggleBtn && compactView && detailedView) {
        viewToggleBtn.addEventListener('click', () => {
            if (currentView === 'compact') {
                currentView = 'detailed';
                compactView.classList.remove('active');
                detailedView.classList.add('active');
                viewToggleBtn.textContent = '📋 Switch to Compact View';
                viewToggleBtn.dataset.view = 'detailed';
            } else {
                currentView = 'compact';
                detailedView.classList.remove('active');
                compactView.classList.add('active');
                viewToggleBtn.textContent = '📊 Switch to Detailed View';
                viewToggleBtn.dataset.view = 'compact';
            }
            displayModifiedPixels();
        });
    }
}

// Setup channel filter
function setupChannelFilter() {
    const channelFilter = document.getElementById('channel-filter');
    
    if (channelFilter) {
        channelFilter.addEventListener('change', (e) => {
            currentFilter = e.target.value;
            currentPage = 1;
            displayModifiedPixels();
        });
    }
}

// Setup pagination
function setupPagination() {
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                displayModifiedPixels();
            }
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            const filteredData = getFilteredPixelData();
            const totalPages = Math.ceil(filteredData.length / pixelsPerPage);
            if (currentPage < totalPages) {
                currentPage++;
                displayModifiedPixels();
            }
        });
    }
}

// Setup export function
function setupExportFunction() {
    const exportBtn = document.getElementById('export-pixel-list');
    
    if (exportBtn) {
        exportBtn.addEventListener('click', exportPixelListToCSV);
    }
}

// Generate modified pixels data from tutorial canvases
function generateModifiedPixelsData() {
    if (!tutorialData.originalCanvas || !tutorialData.stegoCanvas) {
        return [];
    }
    
    const originalCtx = tutorialData.originalCanvas.getContext('2d');
    const stegoCtx = tutorialData.stegoCanvas.getContext('2d');
    
    const originalImageData = originalCtx.getImageData(0, 0, tutorialData.originalCanvas.width, tutorialData.originalCanvas.height);
    const stegoImageData = stegoCtx.getImageData(0, 0, tutorialData.stegoCanvas.width, tutorialData.stegoCanvas.height);
    
    const originalPixels = originalImageData.data;
    const stegoPixels = stegoImageData.data;
    
    const modifiedPixels = [];
    let pixelIndex = 0;
    
    // Analyze each pixel
    for (let i = 0; i < originalPixels.length; i += 4) {
        const x = pixelIndex % tutorialData.originalCanvas.width;
        const y = Math.floor(pixelIndex / tutorialData.originalCanvas.width);
        
        const channels = ['red', 'green', 'blue'];
        const pixelChanges = [];
        
        // Check each color channel
        for (let j = 0; j < 3; j++) {
            const originalValue = originalPixels[i + j];
            const stegoValue = stegoPixels[i + j];
            
            if (originalValue !== stegoValue) {
                const originalBinary = originalValue.toString(2).padStart(8, '0');
                const stegoBinary = stegoValue.toString(2).padStart(8, '0');
                const lsbChanged = (originalValue & 1) !== (stegoValue & 1);
                const change = stegoValue - originalValue;
                
                pixelChanges.push({
                    channel: channels[j],
                    originalValue: originalValue,
                    stegoValue: stegoValue,
                    originalBinary: originalBinary,
                    stegoBinary: stegoBinary,
                    change: change,
                    lsbChanged: lsbChanged
                });
            }
        }
        
        if (pixelChanges.length > 0) {
            modifiedPixels.push({
                pixelIndex: pixelIndex,
                x: x,
                y: y,
                changes: pixelChanges
            });
        }
        
        pixelIndex++;
    }
    
    return modifiedPixels;
}

// Update modified pixels display
function updateModifiedPixelsDisplay() {
    modifiedPixelsData = generateModifiedPixelsData();
    updateSummaryStats();
    displayModifiedPixels();
}

// Update summary statistics
function updateSummaryStats() {
    const totalModifiedElement = document.getElementById('total-modified-pixels');
    const percentageElement = document.getElementById('modification-percentage');
    const channelsElement = document.getElementById('channels-modified');
    
    if (!totalModifiedElement || !percentageElement || !channelsElement) return;
    
    const totalPixels = tutorialData.originalCanvas ? 
        tutorialData.originalCanvas.width * tutorialData.originalCanvas.height : 0;
    const modifiedPixelsCount = modifiedPixelsData.length;
    const percentage = totalPixels > 0 ? (modifiedPixelsCount / totalPixels * 100).toFixed(4) : 0;
    
    // Count total channel changes
    let totalChannelChanges = 0;
    modifiedPixelsData.forEach(pixel => {
        totalChannelChanges += pixel.changes.length;
    });
    
    totalModifiedElement.textContent = modifiedPixelsCount.toLocaleString();
    percentageElement.textContent = `${percentage}%`;
    channelsElement.textContent = totalChannelChanges.toLocaleString();
}

// Filter pixel data based on selected channel
function getFilteredPixelData() {
    if (currentFilter === 'all') {
        return modifiedPixelsData;
    }
    
    return modifiedPixelsData.filter(pixel => 
        pixel.changes.some(change => change.channel === currentFilter)
    );
}

// Display modified pixels based on current view
function displayModifiedPixels() {
    if (currentView === 'compact') {
        displayCompactView();
    } else {
        displayDetailedView();
    }
    updatePaginationControls();
}

// Display compact grid view
function displayCompactView() {
    const gridContainer = document.getElementById('modified-pixels-grid');
    if (!gridContainer) return;
    
    const filteredData = getFilteredPixelData();
    
    if (filteredData.length === 0) {
        gridContainer.innerHTML = '<p class="no-data">No modified pixels found with current filter</p>';
        return;
    }
    
    const startIndex = (currentPage - 1) * pixelsPerPage;
    const endIndex = Math.min(startIndex + pixelsPerPage, filteredData.length);
    const pageData = filteredData.slice(startIndex, endIndex);
    
    const pixelCards = pageData.map(pixel => {
        const channelChangesHtml = pixel.changes
            .filter(change => currentFilter === 'all' || change.channel === currentFilter)
            .map(change => `
                <div class="channel-change ${change.channel}">
                    <span class="channel-name">${change.channel.toUpperCase()}</span>
                    <div class="value-change">
                        <span class="original-val">${change.originalValue}</span>
                        <span>→</span>
                        <span class="modified-val">${change.stegoValue}</span>
                        <span class="change-indicator ${change.change > 0 ? 'positive' : 'negative'}">
                            ${change.change > 0 ? '+' : ''}${change.change}
                        </span>
                    </div>
                </div>
            `).join('');
        
        const hasLSBChange = pixel.changes.some(change => change.lsbChanged);
        
        return `
            <div class="pixel-card modified" data-pixel="${pixel.pixelIndex}">
                ${hasLSBChange ? '<div class="lsb-badge">LSB</div>' : ''}
                <div class="pixel-header">
                    <span class="pixel-number">#${pixel.pixelIndex}</span>
                    <span class="pixel-coords">(${pixel.x}, ${pixel.y})</span>
                </div>
                <div class="pixel-changes">
                    ${channelChangesHtml}
                </div>
            </div>
        `;
    }).join('');
    
    gridContainer.innerHTML = pixelCards;
    
    // Add click listeners for pixel cards
    gridContainer.querySelectorAll('.pixel-card').forEach(card => {
        card.addEventListener('click', () => {
            const pixelIndex = parseInt(card.dataset.pixel);
            highlightPixelInCanvas(pixelIndex);
        });
    });
}

// Display detailed table view
function displayDetailedView() {
    const tableBody = document.getElementById('modified-pixels-tbody');
    if (!tableBody) return;
    
    const filteredData = getFilteredPixelData();
    
    if (filteredData.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="9" class="no-data">No modified pixels found with current filter</td></tr>';
        return;
    }
    
    const startIndex = (currentPage - 1) * pixelsPerPage;
    const endIndex = Math.min(startIndex + pixelsPerPage, filteredData.length);
    const pageData = filteredData.slice(startIndex, endIndex);
    
    const tableRows = [];
    
    pageData.forEach(pixel => {
        const filteredChanges = pixel.changes.filter(change => 
            currentFilter === 'all' || change.channel === currentFilter
        );
        
        filteredChanges.forEach((change, index) => {
            const isFirstRow = index === 0;
            const rowSpan = isFirstRow ? ` rowspan="${filteredChanges.length}"` : '';
            
            tableRows.push(`
                <tr class="modified-row">
                    ${isFirstRow ? `<td${rowSpan} class="pixel-index">#${pixel.pixelIndex}</td>` : ''}
                    ${isFirstRow ? `<td${rowSpan} class="pixel-position">(${pixel.x}, ${pixel.y})</td>` : ''}
                    <td>
                        <span class="channel-badge ${change.channel}">${change.channel.toUpperCase()}</span>
                    </td>
                    <td class="value-original">${change.originalValue}</td>
                    <td class="value-modified">${change.stegoValue}</td>
                    <td class="change-amount ${change.change > 0 ? 'positive' : 'negative'}">
                        ${change.change > 0 ? '+' : ''}${change.change}
                    </td>
                    <td class="binary-display">${change.originalBinary}</td>
                    <td class="binary-display">${change.stegoBinary}</td>
                    <td class="lsb-status ${change.lsbChanged ? 'changed' : 'unchanged'}">
                        ${change.lsbChanged ? '✓' : '—'}
                    </td>
                </tr>
            `);
        });
    });
    
    tableBody.innerHTML = tableRows.join('');
    
    // Add click listeners for table rows
    tableBody.querySelectorAll('tr').forEach(row => {
        row.addEventListener('click', () => {
            const pixelIndex = parseInt(row.querySelector('.pixel-index')?.textContent.replace('#', '') || '0');
            if (pixelIndex > 0) {
                highlightPixelInCanvas(pixelIndex);
            }
        });
    });
}

// Update pagination controls
function updatePaginationControls() {
    const filteredData = getFilteredPixelData();
    const totalPages = Math.ceil(filteredData.length / pixelsPerPage);
    const startIndex = (currentPage - 1) * pixelsPerPage;
    const endIndex = Math.min(startIndex + pixelsPerPage, filteredData.length);
    
    const paginationContainer = document.getElementById('pixel-pagination');
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    const currentPageElement = document.getElementById('current-page');
    const totalPagesElement = document.getElementById('total-pages');
    const showingRangeElement = document.getElementById('showing-range');
    const totalPixelsElement = document.getElementById('total-pixels');
    
    if (!paginationContainer) return;
    
    if (totalPages <= 1) {
        paginationContainer.style.display = 'none';
        return;
    }
    
    paginationContainer.style.display = 'flex';
    
    if (prevBtn) prevBtn.disabled = currentPage <= 1;
    if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
    
    if (currentPageElement) currentPageElement.textContent = currentPage;
    if (totalPagesElement) totalPagesElement.textContent = totalPages;
    if (showingRangeElement) showingRangeElement.textContent = `${startIndex + 1}-${endIndex}`;
    if (totalPixelsElement) totalPixelsElement.textContent = filteredData.length;
}

// Highlight pixel in canvas
function highlightPixelInCanvas(pixelIndex) {
    const originalCanvas = document.getElementById('original-analysis-canvas');
    const stegoCanvas = document.getElementById('stego-analysis-canvas');
    
    if (!originalCanvas || !stegoCanvas || !tutorialData.originalCanvas) return;
    
    const x = pixelIndex % tutorialData.originalCanvas.width;
    const y = Math.floor(pixelIndex / tutorialData.originalCanvas.width);
    
    // Trigger the existing pixel analysis
    tutorialData.currentPixelX = x;
    tutorialData.currentPixelY = y;
    displayPixelAnalysis(x, y);
    
    // Scroll canvas into view
    originalCanvas.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// Export pixel list to CSV
function exportPixelListToCSV() {
    if (modifiedPixelsData.length === 0) {
        showError('No modified pixels data to export');
        return;
    }
    
    let csvContent = 'Modified Pixels Report\n\n';
    csvContent += 'Pixel Index,X Coordinate,Y Coordinate,Channel,Original Value,Modified Value,Change Amount,Original Binary,Modified Binary,LSB Changed\n';
    
    const filteredData = getFilteredPixelData();
    
    filteredData.forEach(pixel => {
        pixel.changes.forEach(change => {
            if (currentFilter === 'all' || change.channel === currentFilter) {
                csvContent += `${pixel.pixelIndex},${pixel.x},${pixel.y},${change.channel},${change.originalValue},${change.stegoValue},${change.change},${change.originalBinary},${change.stegoBinary},${change.lsbChanged ? 'Yes' : 'No'}\n`;
            }
        });
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `modified-pixels-${currentFilter}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showSuccess('Pixel list exported successfully!');
}

// Update the existing updateTutorialWithResults function
function updateTutorialWithResults() {
    if (!window.stegoCanvasForDownload || !coverImage) return;
    
    // Copy canvases for tutorial analysis
    tutorialData.originalCanvas = coverImage.canvas;
    tutorialData.stegoCanvas = window.stegoCanvasForDownload;
    
    // Update tutorial canvases (existing code)
    const originalAnalysisCanvas = document.getElementById('original-analysis-canvas');
    const stegoAnalysisCanvas = document.getElementById('stego-analysis-canvas');
    
    if (originalAnalysisCanvas && stegoAnalysisCanvas) {
        // Set canvas dimensions
        const maxWidth = 300;
        const maxHeight = 200;
        const scaleX = Math.min(maxWidth / tutorialData.originalCanvas.width, maxHeight / tutorialData.originalCanvas.height);
        const scaleY = scaleX; // Keep aspect ratio
        
        originalAnalysisCanvas.width = Math.floor(tutorialData.originalCanvas.width * scaleX);
        originalAnalysisCanvas.height = Math.floor(tutorialData.originalCanvas.height * scaleY);
        stegoAnalysisCanvas.width = originalAnalysisCanvas.width;
        stegoAnalysisCanvas.height = originalAnalysisCanvas.height;
        
        // Draw scaled images
        const originalCtx = originalAnalysisCanvas.getContext('2d');
        const stegoCtx = stegoAnalysisCanvas.getContext('2d');
        
        originalCtx.drawImage(tutorialData.originalCanvas, 0, 0, originalAnalysisCanvas.width, originalAnalysisCanvas.height);
        stegoCtx.drawImage(tutorialData.stegoCanvas, 0, 0, stegoAnalysisCanvas.width, stegoAnalysisCanvas.height);
        
        // Update pixel info displays
        document.getElementById('original-pixel-info').textContent = 'Click on a pixel to see its values';
        document.getElementById('stego-pixel-info').textContent = 'Click on a pixel to see its values';
    }
    
    // Update binary displays (existing code)
    updateBinaryDisplays();
    
    // Update modified pixels display (new)
    updateModifiedPixelsDisplay();
}

// Initialize when DOM is loaded (add to existing DOMContentLoaded listener)
document.addEventListener('DOMContentLoaded', function() {
    // ... existing initialization code ...
    initializeTutorialSection();
    initializeModifiedPixelsList(); // Add this line
});
