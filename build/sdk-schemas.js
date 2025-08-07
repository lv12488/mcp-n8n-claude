"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FillPromptRequestSchema = exports.ListPromptsRequestSchema = exports.ListResourceTemplatesRequestSchema = exports.ReadResourceRequestSchema = exports.ListResourcesRequestSchema = exports.CallToolRequestSchema = exports.ListToolsRequestSchema = void 0;
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
exports.ListToolsRequestSchema = types_js_1.ListToolsRequestSchema;
exports.CallToolRequestSchema = types_js_1.CallToolRequestSchema;
exports.ListResourcesRequestSchema = types_js_1.ListResourcesRequestSchema;
exports.ReadResourceRequestSchema = types_js_1.ReadResourceRequestSchema;
exports.ListResourceTemplatesRequestSchema = types_js_1.ListResourceTemplatesRequestSchema;
exports.ListPromptsRequestSchema = types_js_1.ListPromptsRequestSchema;
// Define our own schema for filling prompts, as it's not included in the SDK
exports.FillPromptRequestSchema = {
    method: 'prompts/fill',
    params: {
        promptId: String,
        variables: Object
    }
};
