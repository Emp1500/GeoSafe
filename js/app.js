

class DisasterApp {
    constructor() {
        this.disasters = [];
        this.map = null;
        this.filters = {
            type: 'all',
            severity: 'all'
        };
        
        this.api = disasterAPI; 
        
        this.init();
    }
    
    async init() {
        console.log('🚀 Disaster Management App Initializing...');
        
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.startApp();
            });
        } else {
            this.startApp();
        }
    }
    
    async startApp() {
        try {
            await this.initializeMap();
            await this.loadDisasterData();
            this.setupEventListeners();
            this.updateUI();
            
            console.log('✅ App initialized successfully!');
        } catch (error) {
            console.error('❌ Error initializing app:', error);
        }
    }
    
    async initializeMap() {
        
        console.log('🗺️ Initializing map...');
       
    }
    
    async loadDisasterData() {
        console.log('📊 Loading disaster data...');
        this.disasters = await this.api.fetchDisasters();
        console.log(`✅ Loaded ${this.disasters.length} disaster events`);
    }
    
    setupEventListeners() {
       
        console.log('🎯 Setting up event listeners...');
        
        
        const refreshBtn = document.createElement('button');
        refreshBtn.textContent = 'Refresh Data';
        refreshBtn.className = 'btn btn-primary btn-sm';
        refreshBtn.onclick = () => this.refreshData();
        
       
        const navbar = document.querySelector('.navbar-nav');
        const listItem = document.createElement('li');
        listItem.className = 'nav-item';
        listItem.appendChild(refreshBtn);
        navbar.appendChild(listItem);
    }
    
    async refreshData() {
        console.log('🔄 Refreshing disaster data...');
        await this.loadDisasterData();
        this.updateUI();
    }
    
    updateUI() {
        
        console.log('🎨 Updating UI with', this.disasters.length, 'events');
        
        
        updateDisasterCards(this.disasters);
    }
}


window.addEventListener('load', () => {
    window.disasterApp = new DisasterApp();
});