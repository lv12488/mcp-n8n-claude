"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnvironmentManager = void 0;
const axios_1 = __importDefault(require("axios"));
const configLoader_1 = require("../config/configLoader");
class EnvironmentManager {
    constructor() {
        this.apiInstances = new Map();
        this.configLoader = configLoader_1.ConfigLoader.getInstance();
    }
    static getInstance() {
        if (!EnvironmentManager.instance) {
            EnvironmentManager.instance = new EnvironmentManager();
        }
        return EnvironmentManager.instance;
    }
    /**
     * Get or create an axios instance for the specified environment
     */
    getApiInstance(instanceSlug) {
        try {
            const envConfig = this.configLoader.getEnvironmentConfig(instanceSlug);
            const targetEnv = instanceSlug || this.configLoader.getDefaultEnvironment();
            // Clear cache to force new instances with updated baseURL
            this.apiInstances.clear();
            // Check if we already have an instance for this environment
            if (this.apiInstances.has(targetEnv)) {
                return this.apiInstances.get(targetEnv);
            }
            // Create new axios instance for this environment
            const baseURL = `${envConfig.n8n_host}/api/v1`;
            console.error(`[DEBUG] Creating API instance with baseURL: ${baseURL}`);
            console.error(`[DEBUG] API Key: ${envConfig.n8n_api_key?.substring(0, 20)}...`);
            const apiInstance = axios_1.default.create({
                baseURL,
                headers: {
                    'Content-Type': 'application/json',
                    'X-N8N-API-KEY': envConfig.n8n_api_key
                }
            });
            // Cache the instance
            this.apiInstances.set(targetEnv, apiInstance);
            return apiInstance;
        }
        catch (error) {
            throw new Error(`Failed to get API instance: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Get environment configuration
     */
    getEnvironmentConfig(instanceSlug) {
        return this.configLoader.getEnvironmentConfig(instanceSlug);
    }
    /**
     * Get list of available environments
     */
    getAvailableEnvironments() {
        return this.configLoader.getAvailableEnvironments();
    }
    /**
     * Get default environment name
     */
    getDefaultEnvironment() {
        return this.configLoader.getDefaultEnvironment();
    }
    /**
     * Clear cached API instances (useful for configuration reloads)
     */
    clearCache() {
        this.apiInstances.clear();
    }
}
exports.EnvironmentManager = EnvironmentManager;
