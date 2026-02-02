// Cookie-based Storage and GitHub Repo Manager
class RepoManager {
    constructor() {
        this.STORAGE_KEY = 'tachionline_data';
        this.data = this.loadData();
    }

    // Cookie management
    loadData() {
        try {
            const cookie = document.cookie
                .split('; ')
                .find(row => row.startsWith(this.STORAGE_KEY + '='));
            
            if (cookie) {
                const value = cookie.split('=')[1];
                return JSON.parse(decodeURIComponent(value));
            }
        } catch (e) {
            console.error('Error loading data:', e);
        }
        
        return {
            githubRepos: [],
            localRepos: [],
            settings: {
                flipMode: 'corner',
                controllerMapping: {},
                hotkeys: {
                    pageInfo: 'Tab',
                    prevPage: 'KeyQ',
                    nextPage: 'KeyE',
                    toggleInfo: 'Space'
                }
            }
        };
    }

    saveData() {
        try {
            const value = encodeURIComponent(JSON.stringify(this.data));
            // Set cookie with 1 year expiry
            const expires = new Date();
            expires.setFullYear(expires.getFullYear() + 1);
            document.cookie = `${this.STORAGE_KEY}=${value};expires=${expires.toUTCString()};path=/;SameSite=Strict`;
        } catch (e) {
            console.error('Error saving data:', e);
        }
    }

    // GitHub repo management
    addGitHubRepo(url) {
        const parsed = this.parseGitHubUrl(url);
        if (!parsed) {
            throw new Error('Invalid GitHub URL');
        }

        const existing = this.data.githubRepos.find(r => r.url === url);
        if (existing) {
            return existing;
        }

        const repo = {
            id: Date.now().toString(),
            url,
            owner: parsed.owner,
            name: parsed.repo,
            addedAt: new Date().toISOString()
        };

        this.data.githubRepos.push(repo);
        this.saveData();
        return repo;
    }

    removeGitHubRepo(id) {
        this.data.githubRepos = this.data.githubRepos.filter(r => r.id !== id);
        this.saveData();
    }

    parseGitHubUrl(url) {
        const patterns = [
            /github\.com\/([^\/]+)\/([^\/]+)/,
            /^([^\/]+)\/([^\/]+)$/
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) {
                return { owner: match[1], repo: match[2].replace('.git', '') };
            }
        }
        return null;
    }

    async fetchGitHubRepos() {
        const allRepos = [];

        for (const ghRepo of this.data.githubRepos) {
            try {
                const repos = await this.fetchRepoFiles(ghRepo.owner, ghRepo.name);
                allRepos.push(...repos.map(r => ({ ...r, source: ghRepo })));
            } catch (e) {
                console.error(`Error fetching ${ghRepo.url}:`, e);
            }
        }

        return allRepos;
    }

    async fetchRepoFiles(owner, repo, path = '') {
        const response = await fetch(`/github-proxy?owner=${owner}&repo=${repo}&path=${path}`);
        const data = await response.json();

        if (!Array.isArray(data)) {
            throw new Error(data.message || 'Failed to fetch repo contents');
        }

        const repoFiles = [];

        for (const item of data) {
            if (item.type === 'file' && item.name.endsWith('.repo')) {
                try {
                    const fileResponse = await fetch(item.download_url);
                    const content = await fileResponse.json();
                    repoFiles.push({
                        id: item.sha,
                        name: item.name.replace('.repo', ''),
                        path: item.path,
                        ...content
                    });
                } catch (e) {
                    console.error(`Error loading ${item.name}:`, e);
                }
            } else if (item.type === 'dir') {
                const subFiles = await this.fetchRepoFiles(owner, repo, item.path);
                repoFiles.push(...subFiles);
            }
        }

        return repoFiles;
    }

    // Local repo management
    addLocalRepo(repoData) {
        const repo = {
            id: Date.now().toString(),
            addedAt: new Date().toISOString(),
            ...repoData
        };

        this.data.localRepos.push(repo);
        this.saveData();
        return repo;
    }

    updateLocalRepo(id, repoData) {
        const index = this.data.localRepos.findIndex(r => r.id === id);
        if (index !== -1) {
            this.data.localRepos[index] = {
                ...this.data.localRepos[index],
                ...repoData,
                updatedAt: new Date().toISOString()
            };
            this.saveData();
            return this.data.localRepos[index];
        }
        return null;
    }

    removeLocalRepo(id) {
        this.data.localRepos = this.data.localRepos.filter(r => r.id !== id);
        this.saveData();
    }

    getLocalRepos() {
        return this.data.localRepos;
    }

    getRepoById(id) {
        return this.data.localRepos.find(r => r.id === id);
    }

    // Settings management
    getSettings() {
        return this.data.settings;
    }

    updateSettings(settings) {
        this.data.settings = { ...this.data.settings, ...settings };
        this.saveData();
    }

    // Import/Export
    exportRepo(repo) {
        const exportData = { ...repo };
        delete exportData.id;
        delete exportData.addedAt;
        delete exportData.updatedAt;
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `${repo.name || 'repo'}.repo`;
        a.click();
        
        URL.revokeObjectURL(url);
    }

    async importRepo(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    const repo = this.addLocalRepo(data);
                    resolve(repo);
                } catch (err) {
                    reject(new Error('Invalid repo file'));
                }
            };
            
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    // Create default repo template
    createDefaultRepo() {
        return {
            name: 'New Site',
            url: '',
            injections: {
                default: {
                    css: '',
                    html: '',
                    js: ''
                },
                subdomains: []
            },
            bookReader: {
                enabled: false,
                mode: 'two-page',
                imageSelector: 'img',
                nextPageSelector: '',
                prevPageSelector: '',
                urlPattern: ''
            }
        };
    }
}

// Initialize global instance
window.repoManager = new RepoManager();
