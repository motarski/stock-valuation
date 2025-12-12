/**
 * Production API Configuration Example
 *
 * This file shows how to configure API endpoints for production deployment.
 * Copy this file to config.js to use in production, or modify config.js directly.
 *
 * IMPORTANT: This is just an example. Update the endpoints to match your
 * actual production server configuration.
 */

const API_CONFIG = {
    // Force production environment
    environment: 'production',

    // API endpoints
    endpoints: {
        production: {
            baseUrl: '',  // Use relative paths
            stock: '/stonks/api/stock',
            search: '/stonks/api/search',
            health: '/stonks/health'
        }
    },

    // Get the current environment's configuration
    get current() {
        return this.endpoints.production;
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

    getHealthUrl() {
        const config = this.current;
        return `${config.baseUrl}${config.health}`;
    }
};

console.log(`API Environment: Production`);
console.log(`Stock API: ${API_CONFIG.current.stock}`);
