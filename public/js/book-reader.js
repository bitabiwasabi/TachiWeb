// Book Reader with Page Flip Animation
class BookReader {
    constructor() {
        this.isOpen = false;
        this.currentPage = 0;
        this.totalPages = 0;
        this.pages = [];
        this.mode = 'two-page'; // 'two-page' or 'single'
        this.flipMode = 'corner'; // 'corner', 'side', or 'click'
        this.showUI = true;
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragCurrentX = 0;
        this.flipProgress = 0;
        this.flipDirection = 'next'; // 'next' or 'prev'
        
        this.repo = null;
        this.iframe = null;
        
        this.init();
    }

    init() {
        this.createOverlay();
        this.bindEvents();
    }

    createOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'book-reader-overlay';
        overlay.id = 'book-reader';
        overlay.innerHTML = `
            <div class="reader-header">
                <a href="/" class="back-link">← Back</a>
                <h2 class="reader-title"></h2>
                <div class="reader-controls">
                    <button class="reader-btn" id="reader-mode-toggle" title="Toggle mode">📖</button>
                    <button class="reader-btn" id="reader-fullscreen" title="Fullscreen">⛶</button>
                    <button class="reader-btn" id="reader-close" title="Close">✕</button>
                </div>
            </div>
            
            <button class="nav-arrow prev" id="nav-prev">‹</button>
            <button class="nav-arrow next" id="nav-next">›</button>
            
            <div class="book-container">
                <div class="book" id="book">
                    <div class="book-page left" id="page-left">
                        <div class="book-page-content"></div>
                    </div>
                    <div class="book-page right" id="page-right">
                        <div class="book-page-content"></div>
                    </div>
                    
                    <!-- Flip container for animation -->
                    <div class="page-flip-container" id="flip-container">
                        <div class="flip-page flip-page-front">
                            <div class="book-page-content"></div>
                        </div>
                        <div class="flip-page flip-page-back">
                            <div class="book-page-content"></div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="reader-footer">
                <div class="progress-container">
                    <div class="progress-bar">
                        <div class="progress-fill" id="progress-fill"></div>
                    </div>
                    <div class="progress-info">
                        <span id="current-page-info">Page 1</span>
                        <span id="chapter-info"></span>
                        <span id="total-pages-info">of 1</span>
                    </div>
                </div>
            </div>
            
            <div class="page-info-panel" id="page-info-panel">
                <h3>Page Information</h3>
                <p id="info-title"></p>
                <p id="info-chapter"></p>
                <p id="info-progress"></p>
            </div>
            
            <div class="loading-spinner" id="reader-loading"></div>
        `;
        
        document.body.appendChild(overlay);
        this.overlay = overlay;
        this.book = overlay.querySelector('#book');
        this.flipContainer = overlay.querySelector('#flip-container');
        this.pageLeft = overlay.querySelector('#page-left');
        this.pageRight = overlay.querySelector('#page-right');
        
        this.setupFlipZones();
    }

    setupFlipZones() {
        // Create flip zones based on current flip mode
        this.updateFlipZones();
    }

    updateFlipZones() {
        // Remove existing zones
        this.book.querySelectorAll('.flip-zone').forEach(z => z.remove());
        
        const settings = window.repoManager?.getSettings() || {};
        this.flipMode = settings.flipMode || 'corner';
        
        if (this.flipMode === 'corner') {
            // Corner zones
            this.createFlipZone('corner-top-right', 'next');
            this.createFlipZone('corner-bottom-right', 'next');
            this.createFlipZone('corner-top-left', 'prev');
            this.createFlipZone('corner-bottom-left', 'prev');
        } else if (this.flipMode === 'side') {
            // Side zones
            this.createFlipZone('side-right', 'next');
            this.createFlipZone('side-left', 'prev');
        }
        // Click mode uses the nav arrows
    }

    createFlipZone(position, direction) {
        const zone = document.createElement('div');
        zone.className = `flip-zone flip-zone-${position}`;
        zone.dataset.direction = direction;
        
        zone.addEventListener('mousedown', (e) => this.startDrag(e, direction));
        zone.addEventListener('touchstart', (e) => this.startDrag(e, direction), { passive: false });
        
        this.book.appendChild(zone);
    }

    bindEvents() {
        // Close button
        this.overlay.querySelector('#reader-close').addEventListener('click', () => this.close());
        
        // Navigation
        this.overlay.querySelector('#nav-prev').addEventListener('click', () => this.prevPage());
        this.overlay.querySelector('#nav-next').addEventListener('click', () => this.nextPage());
        
        // Mode toggle
        this.overlay.querySelector('#reader-mode-toggle').addEventListener('click', () => this.toggleMode());
        
        // Fullscreen
        this.overlay.querySelector('#reader-fullscreen').addEventListener('click', () => this.toggleFullscreen());
        
        // Mouse/touch drag events
        document.addEventListener('mousemove', (e) => this.onDrag(e));
        document.addEventListener('mouseup', (e) => this.endDrag(e));
        document.addEventListener('touchmove', (e) => this.onDrag(e), { passive: false });
        document.addEventListener('touchend', (e) => this.endDrag(e));
        
        // UI toggle on click
        this.book.addEventListener('click', (e) => {
            if (!e.target.closest('.flip-zone') && this.flipMode === 'click') {
                const rect = this.book.getBoundingClientRect();
                const x = e.clientX - rect.left;
                if (x > rect.width / 2) {
                    this.nextPage();
                } else {
                    this.prevPage();
                }
            }
        });
        
        // Toggle UI on tap/click center
        this.overlay.querySelector('.book-container').addEventListener('click', (e) => {
            if (e.target === e.currentTarget || e.target === this.book) {
                this.toggleUI();
            }
        });
    }

    // Drag-based page flip
    startDrag(e, direction) {
        if (this.isDragging) return;
        
        e.preventDefault();
        this.isDragging = true;
        this.flipDirection = direction;
        
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        this.dragStartX = clientX;
        this.dragCurrentX = clientX;
        
        this.flipContainer.classList.add('flipping');
        this.flipContainer.style.transition = 'none';
        
        // Setup flip pages content
        this.setupFlipContent();
    }

    onDrag(e) {
        if (!this.isDragging) return;
        
        e.preventDefault();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        this.dragCurrentX = clientX;
        
        const bookRect = this.book.getBoundingClientRect();
        const bookWidth = bookRect.width;
        const delta = this.dragCurrentX - this.dragStartX;
        
        // Calculate flip progress (0 to 1)
        if (this.flipDirection === 'next') {
            this.flipProgress = Math.max(0, Math.min(1, -delta / (bookWidth / 2)));
        } else {
            this.flipProgress = Math.max(0, Math.min(1, delta / (bookWidth / 2)));
        }
        
        this.updateFlipAnimation();
    }

    endDrag(e) {
        if (!this.isDragging) return;
        
        this.isDragging = false;
        this.flipContainer.classList.remove('flipping');
        this.flipContainer.style.transition = 'transform 0.4s ease';
        
        // Complete or cancel flip based on progress
        if (this.flipProgress > 0.3) {
            this.completeFlip();
        } else {
            this.cancelFlip();
        }
    }

    setupFlipContent() {
        const frontContent = this.flipContainer.querySelector('.flip-page-front .book-page-content');
        const backContent = this.flipContainer.querySelector('.flip-page-back .book-page-content');
        
        if (this.flipDirection === 'next') {
            // Flipping forward: front shows current right, back shows next left
            if (this.mode === 'two-page') {
                frontContent.innerHTML = this.getPageContent(this.currentPage + 1);
                backContent.innerHTML = this.getPageContent(this.currentPage + 2);
            } else {
                frontContent.innerHTML = this.getPageContent(this.currentPage);
                backContent.innerHTML = this.getPageContent(this.currentPage + 1);
            }
        } else {
            // Flipping backward
            if (this.mode === 'two-page') {
                frontContent.innerHTML = this.getPageContent(this.currentPage - 1);
                backContent.innerHTML = this.getPageContent(this.currentPage);
            } else {
                frontContent.innerHTML = this.getPageContent(this.currentPage - 1);
                backContent.innerHTML = this.getPageContent(this.currentPage);
            }
        }
        
        this.flipContainer.style.display = 'block';
    }

    updateFlipAnimation() {
        const rotation = this.flipDirection === 'next' 
            ? -180 * this.flipProgress 
            : -180 + (180 * this.flipProgress);
        
        this.flipContainer.style.transform = `rotateY(${rotation}deg)`;
        
        // Add shadow effect
        const shadowIntensity = Math.sin(this.flipProgress * Math.PI) * 0.3;
        this.flipContainer.style.boxShadow = `${shadowIntensity * 50}px 0 ${shadowIntensity * 100}px rgba(0,0,0,${shadowIntensity})`;
    }

    completeFlip() {
        if (this.flipDirection === 'next') {
            this.flipContainer.style.transform = 'rotateY(-180deg)';
            setTimeout(() => {
                this.flipContainer.style.display = 'none';
                this.flipContainer.style.transform = 'rotateY(0deg)';
                if (this.mode === 'two-page') {
                    this.currentPage += 2;
                } else {
                    this.currentPage += 1;
                }
                this.renderPages();
            }, 400);
        } else {
            this.flipContainer.style.transform = 'rotateY(0deg)';
            setTimeout(() => {
                this.flipContainer.style.display = 'none';
                if (this.mode === 'two-page') {
                    this.currentPage -= 2;
                } else {
                    this.currentPage -= 1;
                }
                this.renderPages();
            }, 400);
        }
    }

    cancelFlip() {
        if (this.flipDirection === 'next') {
            this.flipContainer.style.transform = 'rotateY(0deg)';
        } else {
            this.flipContainer.style.transform = 'rotateY(-180deg)';
        }
        
        setTimeout(() => {
            this.flipContainer.style.display = 'none';
        }, 400);
    }

    // Page navigation
    nextPage() {
        const increment = this.mode === 'two-page' ? 2 : 1;
        if (this.currentPage + increment < this.totalPages) {
            this.flipDirection = 'next';
            this.flipProgress = 1;
            this.setupFlipContent();
            this.flipContainer.style.transition = 'transform 0.5s ease';
            this.flipContainer.style.display = 'block';
            
            requestAnimationFrame(() => {
                this.flipContainer.style.transform = 'rotateY(-180deg)';
                setTimeout(() => {
                    this.flipContainer.style.display = 'none';
                    this.flipContainer.style.transform = 'rotateY(0deg)';
                    this.currentPage += increment;
                    this.renderPages();
                }, 500);
            });
        }
    }

    prevPage() {
        if (this.currentPage > 0) {
            const decrement = this.mode === 'two-page' ? 2 : 1;
            this.flipDirection = 'prev';
            this.flipProgress = 0;
            this.setupFlipContent();
            this.flipContainer.style.transition = 'transform 0.5s ease';
            this.flipContainer.style.display = 'block';
            this.flipContainer.style.transform = 'rotateY(-180deg)';
            
            requestAnimationFrame(() => {
                this.flipContainer.style.transform = 'rotateY(0deg)';
                setTimeout(() => {
                    this.flipContainer.style.display = 'none';
                    this.currentPage -= decrement;
                    if (this.currentPage < 0) this.currentPage = 0;
                    this.renderPages();
                }, 500);
            });
        }
    }

    getPageContent(index) {
        if (index < 0 || index >= this.pages.length) {
            return '<div class="empty-page"></div>';
        }
        
        const page = this.pages[index];
        if (page.type === 'image') {
            return `<img src="${page.src}" alt="Page ${index + 1}">`;
        } else if (page.type === 'iframe') {
            return `<iframe src="${page.src}" sandbox="allow-same-origin allow-scripts"></iframe>`;
        } else {
            return page.content || '';
        }
    }

    renderPages() {
        const leftContent = this.pageLeft.querySelector('.book-page-content');
        const rightContent = this.pageRight.querySelector('.book-page-content');
        
        if (this.mode === 'two-page') {
            this.book.classList.remove('single-page');
            this.pageLeft.classList.remove('single');
            this.pageRight.classList.remove('hidden');
            
            leftContent.innerHTML = this.getPageContent(this.currentPage);
            rightContent.innerHTML = this.getPageContent(this.currentPage + 1);
        } else {
            this.book.classList.add('single-page');
            this.pageLeft.classList.add('single');
            this.pageRight.classList.add('hidden');
            
            leftContent.innerHTML = this.getPageContent(this.currentPage);
        }
        
        this.updateProgress();
    }

    updateProgress() {
        const progress = ((this.currentPage + 1) / this.totalPages) * 100;
        this.overlay.querySelector('#progress-fill').style.width = `${progress}%`;
        this.overlay.querySelector('#current-page-info').textContent = `Page ${this.currentPage + 1}`;
        this.overlay.querySelector('#total-pages-info').textContent = `of ${this.totalPages}`;
    }

    toggleMode() {
        this.mode = this.mode === 'two-page' ? 'single' : 'two-page';
        this.renderPages();
    }

    toggleUI() {
        this.showUI = !this.showUI;
        this.overlay.classList.toggle('show-ui', this.showUI);
    }

    toggleFullscreen() {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            this.overlay.requestFullscreen();
        }
    }

    showPageInfo() {
        const panel = this.overlay.querySelector('#page-info-panel');
        panel.querySelector('#info-title').textContent = `Title: ${this.repo?.name || 'Unknown'}`;
        panel.querySelector('#info-chapter').textContent = `Chapter: ${this.getChapterInfo()}`;
        panel.querySelector('#info-progress').textContent = `Progress: ${Math.round((this.currentPage + 1) / this.totalPages * 100)}%`;
        panel.classList.add('active');
    }

    hidePageInfo() {
        this.overlay.querySelector('#page-info-panel').classList.remove('active');
    }

    getChapterInfo() {
        // Can be customized via JS injection
        return window.currentChapter || 'N/A';
    }

    // Open reader with content
    async open(repo, url) {
        this.repo = repo;
        this.overlay.classList.add('active');
        this.overlay.classList.add('show-ui');
        this.isOpen = true;
        
        this.overlay.querySelector('.reader-title').textContent = repo.name || 'Reader';
        this.overlay.querySelector('#reader-loading').style.display = 'block';
        
        try {
            await this.loadContent(repo, url);
        } catch (e) {
            console.error('Error loading content:', e);
        }
        
        this.overlay.querySelector('#reader-loading').style.display = 'none';
        this.updateFlipZones();
    }

    async loadContent(repo, url) {
        this.pages = [];
        
        // Get matching subdomain config (if any)
        const matchingSubdomain = this.getMatchingSubdomain(repo, url);
        
        // Determine book reader settings - subdomain-specific takes priority
        let readerConfig = null;
        if (matchingSubdomain?.bookReader?.enabled) {
            readerConfig = matchingSubdomain.bookReader;
        } else if (repo.bookReader?.enabled) {
            readerConfig = repo.bookReader;
        }
        
        // Get injection settings
        const injection = matchingSubdomain || repo.injections?.default;
        
        if (readerConfig) {
            // Load page through proxy and extract images
            const response = await fetch(`/proxy?url=${encodeURIComponent(url)}`);
            const html = await response.text();
            
            // Create temp DOM to parse
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            // Apply injections
            if (injection?.js) {
                // Execute JS to potentially modify page
                try {
                    const fn = new Function('document', injection.js);
                    fn(doc);
                } catch (e) {
                    console.error('Injection JS error:', e);
                }
            }
            
            // Extract images based on selector from the active reader config
            const selector = readerConfig.imageSelector || 'img';
            const images = doc.querySelectorAll(selector);
            
            images.forEach(img => {
                let src = img.src || img.dataset.src || img.getAttribute('data-lazy-src');
                if (src) {
                    // Make relative URLs absolute
                    if (src.startsWith('/')) {
                        const urlObj = new URL(url);
                        src = urlObj.origin + src;
                    } else if (!src.startsWith('http')) {
                        src = new URL(src, url).href;
                    }
                    this.pages.push({ type: 'image', src });
                }
            });
            
            this.mode = readerConfig.mode || 'two-page';
            this.activeReaderConfig = readerConfig;
        } else {
            // Single iframe mode
            this.pages.push({ type: 'iframe', src: `/proxy?url=${encodeURIComponent(url)}` });
            this.mode = 'single';
            this.activeReaderConfig = null;
        }
        
        this.totalPages = this.pages.length;
        this.currentPage = 0;
        this.renderPages();
    }

    getMatchingSubdomain(repo, url) {
        if (!repo.injections?.subdomains) return null;
        
        for (const sub of repo.injections.subdomains) {
            if (sub.pattern) {
                try {
                    const regex = new RegExp(sub.pattern, 'i');
                    if (regex.test(url)) {
                        return sub;
                    }
                } catch (e) {
                    console.error('Invalid regex pattern:', sub.pattern);
                }
            }
        }
        return null;
    }

    getMatchingInjection(repo, url) {
        if (!repo.injections) return null;
        
        // Check subdomain patterns
        for (const sub of repo.injections.subdomains || []) {
            if (sub.pattern) {
                const regex = new RegExp(sub.pattern, 'i');
                if (regex.test(url)) {
                    return sub;
                }
            }
        }
        
        // Return default injection
        return repo.injections.default;
    }

    close() {
        this.overlay.classList.remove('active');
        this.isOpen = false;
        this.pages = [];
        
        if (document.fullscreenElement) {
            document.exitFullscreen();
        }
    }
}

// Initialize global instance
window.bookReader = new BookReader();
