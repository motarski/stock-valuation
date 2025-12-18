/**
 * API Configuration
 *
 * This file handles API endpoint configuration for different environments.
 * - Local development: Uses localhost:5001
 * - Production: Uses relative path /stonks/api
 *
 * To override for production, create a config.prod.js file and use that instead.
 */

const API_CONFIG = {
    // Auto-detect environment based on hostname
    environment: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'development'
        : 'production',

    // API endpoints for each environment
    endpoints: {
        development: {
            baseUrl: 'http://localhost:5001',
            stock: '/api/stock',
            search: '/api/search',
            fearGreed: '/api/fear-greed',
            health: '/health'
        },
        production: {
            baseUrl: '',  // Empty string means use relative paths
            stock: '/stonks/api/stock',
            search: '/stonks/api/search',
            fearGreed: '/stonks/api/fear-greed',
            health: '/stonks/health'
        }
    },

    // Get the current environment's configuration
    get current() {
        return this.endpoints[this.environment];
    },

    // Helper method to build full API URL
    getStockUrl(ticker) {
        const config = this.current;
        return `${config.baseUrl}${config.stock}/${encodeURIComponent(ticker)}`;
    },

    getSearchUrl(query) {
        const config = this.current;
        return `${config.baseUrl}${config.search}/${encodeURIComponent(query)}`;
    },

    getAutocompleteUrl(query) {
        const config = this.current;
        return `${config.baseUrl}${config.search}/${encodeURIComponent(query)}`;
    },

    getHealthUrl() {
        const config = this.current;
        return `${config.baseUrl}${config.health}`;
    },

    getFearGreedUrl() {
        const config = this.current;
        return `${config.baseUrl}${config.fearGreed}`;
    }
};

// Log current environment on load (can be removed in production)
console.log(`API Environment: ${API_CONFIG.environment}`);
console.log(`Base URL: ${API_CONFIG.current.baseUrl || '(relative)'}`);
