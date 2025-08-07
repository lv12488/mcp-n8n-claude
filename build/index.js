#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables from .env file
dotenv_1.default.config();
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const http = __importStar(require("http"));
const sdk_schemas_1 = require("./sdk-schemas");
const n8nApiWrapper_1 = require("./services/n8nApiWrapper");
const logger_1 = __importDefault(require("./utils/logger"));
const promptsService = __importStar(require("./services/promptsService"));
// Удалены логи схем
class N8NWorkflowServer {
    constructor() {
        this.isDebugMode = process.env.DEBUG === 'true';
        this.n8nWrapper = new n8nApiWrapper_1.N8NApiWrapper();
        this.server = new index_js_1.Server({ name: 'n8n-workflow-builder', version: '0.3.0' }, { capabilities: { tools: {}, resources: {}, prompts: {} } });
        this.setupToolHandlers();
        this.setupResourceHandlers();
        this.setupPromptHandlers();
        this.server.onerror = (error) => this.log('error', `Server error: ${error.message || error}`);
    }
    log(level, message, ...args) {
        const timestamp = new Date().toISOString();
        // В режиме отладки выводим больше информации
        if (this.isDebugMode || level !== 'debug') {
            console.error(`${timestamp} [n8n-workflow-builder] [${level}] ${message}`);
            if (args.length > 0) {
                console.error(...args);
            }
        }
    }
    setupResourceHandlers() {
        // List available resources
        this.server.setRequestHandler(sdk_schemas_1.ListResourcesRequestSchema, async () => {
            this.log('info', 'Initializing resources list');
            return {
                resources: [
                    {
                        uri: '/workflows',
                        name: 'Workflows List',
                        description: 'List of all available workflows',
                        mimeType: 'application/json'
                    },
                    {
                        uri: '/execution-stats',
                        name: 'Execution Statistics',
                        description: 'Summary statistics of workflow executions',
                        mimeType: 'application/json'
                    }
                ]
            };
        });
        // List resource templates
        this.server.setRequestHandler(sdk_schemas_1.ListResourceTemplatesRequestSchema, async () => {
            this.log('info', 'Listing resource templates');
            return {
                templates: [
                    {
                        uriTemplate: '/workflows/{id}',
                        name: 'Workflow Details',
                        description: 'Details of a specific workflow',
                        mimeType: 'application/json',
                        parameters: [
                            {
                                name: 'id',
                                description: 'The ID of the workflow',
                                required: true
                            }
                        ]
                    },
                    {
                        uriTemplate: '/executions/{id}',
                        name: 'Execution Details',
                        description: 'Details of a specific execution',
                        mimeType: 'application/json',
                        parameters: [
                            {
                                name: 'id',
                                description: 'The ID of the execution',
                                required: true
                            }
                        ]
                    }
                ]
            };
        });
        // Read a specific resource
        this.server.setRequestHandler(sdk_schemas_1.ReadResourceRequestSchema, async (request) => {
            const { uri } = request.params;
            logger_1.default.info();
            // Static resources
            if (uri === '/workflows') {
                const workflows = await this.n8nWrapper.listWorkflows();
                return {
                    contents: [{
                            type: 'text',
                            text: JSON.stringify(workflows, null, 2),
                            mimeType: 'application/json',
                            uri: '/workflows'
                        }]
                };
            }
            if (uri === '/execution-stats') {
                try {
                    const executions = await this.n8nWrapper.listExecutions({ limit: 100 });
                    // Calculate statistics
                    const total = executions.data.length;
                    const succeeded = executions.data.filter(exec => exec.finished && exec.mode !== 'error').length;
                    const failed = executions.data.filter(exec => exec.mode === 'error').length;
                    const waiting = executions.data.filter(exec => !exec.finished).length;
                    // Calculate average execution time for finished executions
                    let totalTimeMs = 0;
                    let finishedCount = 0;
                    for (const exec of executions.data) {
                        if (exec.finished && exec.startedAt && exec.stoppedAt) {
                            const startTime = new Date(exec.startedAt).getTime();
                            const endTime = new Date(exec.stoppedAt).getTime();
                            totalTimeMs += (endTime - startTime);
                            finishedCount++;
                        }
                    }
                    const avgExecutionTimeMs = finishedCount > 0 ? totalTimeMs / finishedCount : 0;
                    const avgExecutionTime = `${(avgExecutionTimeMs / 1000).toFixed(2)}s`;
                    return {
                        contents: [{
                                type: 'text',
                                text: JSON.stringify({
                                    total,
                                    succeeded,
                                    failed,
                                    waiting,
                                    avgExecutionTime
                                }, null, 2),
                                mimeType: 'application/json',
                                uri: '/execution-stats'
                            }]
                    };
                }
                catch (error) {
                    logger_1.default.error();
                    return {
                        contents: [{
                                type: 'text',
                                text: JSON.stringify({
                                    total: 0,
                                    succeeded: 0,
                                    failed: 0,
                                    waiting: 0,
                                    avgExecutionTime: '0s',
                                    error: 'Failed to retrieve execution statistics'
                                }, null, 2),
                                mimeType: 'application/json',
                                uri: '/execution-stats'
                            }]
                    };
                }
            }
            // Dynamic resource template matching
            const workflowMatch = uri.match(/^\/workflows\/(.+)$/);
            if (workflowMatch) {
                const id = workflowMatch[1];
                try {
                    const workflow = await this.n8nWrapper.getWorkflow(id);
                    return {
                        contents: [{
                                type: 'text',
                                text: JSON.stringify(workflow, null, 2),
                                mimeType: 'application/json',
                                uri: uri
                            }]
                    };
                }
                catch (error) {
                    throw new types_js_1.McpError(types_js_1.ErrorCode.InvalidParams, `Workflow with ID ${id} not found`);
                }
            }
            const executionMatch = uri.match(/^\/executions\/(.+)$/);
            if (executionMatch) {
                const id = parseInt(executionMatch[1], 10);
                if (isNaN(id)) {
                    throw new types_js_1.McpError(types_js_1.ErrorCode.InvalidParams, 'Execution ID must be a number');
                }
                try {
                    const execution = await this.n8nWrapper.getExecution(id, true);
                    return {
                        contents: [{
                                type: 'text',
                                text: JSON.stringify(execution, null, 2),
                                mimeType: 'application/json',
                                uri: uri
                            }]
                    };
                }
                catch (error) {
                    throw new types_js_1.McpError(types_js_1.ErrorCode.InvalidParams, `Execution with ID ${id} not found`);
                }
            }
            throw new types_js_1.McpError(types_js_1.ErrorCode.InvalidParams, `Resource not found: ${uri}`);
        });
    }
    setupToolHandlers() {
        // Register available tools using the local schemas and return an array of tool definitions.
        this.server.setRequestHandler(sdk_schemas_1.ListToolsRequestSchema, async (req) => {
            logger_1.default.info();
            return {
                tools: [
                    // Workflow Tools
                    {
                        name: 'list_workflows',
                        enabled: true,
                        description: 'List all workflows from n8n with essential metadata only (ID, name, status, dates, node count, tags). Optimized for performance to prevent large data transfers.',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                random_string: {
                                    type: 'string',
                                    description: 'Dummy parameter for no-parameter tools'
                                },
                                instance: {
                                    type: 'string',
                                    description: 'Optional instance name to override automatic instance selection (e.g., \'highway\', \'onvex\')'
                                }
                            }
                        }
                    },
                    {
                        name: 'execute_workflow',
                        enabled: true,
                        description: 'Manually execute a workflow by ID',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                id: {
                                    type: 'string',
                                    description: 'The ID of the workflow to execute'
                                },
                                runData: {
                                    type: 'object',
                                    description: 'Optional data to pass to the workflow'
                                },
                                instance: {
                                    type: 'string',
                                    description: 'Optional instance name to override automatic instance selection'
                                }
                            },
                            required: ['id']
                        }
                    },
                    {
                        name: 'create_workflow',
                        enabled: true,
                        description: 'Create a new workflow in n8n',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                name: {
                                    type: 'string',
                                    description: 'The name of the workflow to create'
                                },
                                nodes: {
                                    type: 'array',
                                    description: 'Array of workflow nodes to create. Each node must have type and name.',
                                    items: {
                                        type: 'object',
                                        properties: {
                                            type: {
                                                type: 'string',
                                                description: 'The node type (e.g. "n8n-nodes-base.code", "n8n-nodes-base.httpRequest")'
                                            },
                                            name: {
                                                type: 'string',
                                                description: 'The display name of the node'
                                            },
                                            parameters: {
                                                type: 'object',
                                                description: 'Node-specific configuration parameters'
                                            }
                                        },
                                        required: ['type', 'name']
                                    }
                                },
                                connections: {
                                    type: 'array',
                                    description: 'Array of connections between nodes. Each connection defines how data flows from source to target node. This field is critical for workflow functionality. Without connections, the workflow nodes will not interact with each other. Example: [{"source":"Node1","target":"Node2"}]',
                                    items: {
                                        type: 'object',
                                        properties: {
                                            source: {
                                                type: 'string',
                                                description: 'The source node name or ID'
                                            },
                                            target: {
                                                type: 'string',
                                                description: 'The target node name or ID'
                                            },
                                            sourceOutput: {
                                                type: 'number',
                                                default: 0,
                                                description: 'Output index from the source node (default: 0)'
                                            },
                                            targetInput: {
                                                type: 'number',
                                                default: 0,
                                                description: 'Input index of the target node (default: 0)'
                                            }
                                        },
                                        required: ['source', 'target']
                                    }
                                },
                                instance: {
                                    type: 'string',
                                    description: 'Optional instance name to override automatic instance selection'
                                }
                            },
                            required: ['nodes', 'name', 'connections']
                        }
                    },
                    {
                        name: 'get_workflow',
                        enabled: true,
                        description: 'Get a workflow by ID',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                id: {
                                    type: 'string',
                                    description: 'The ID of the workflow to retrieve'
                                },
                                instance: {
                                    type: 'string',
                                    description: 'Optional instance name to override automatic instance selection'
                                }
                            },
                            required: ['id']
                        }
                    },
                    {
                        name: 'update_workflow',
                        enabled: true,
                        description: 'Update an existing workflow',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                id: {
                                    type: 'string',
                                    description: 'The ID of the workflow to update'
                                },
                                name: {
                                    type: 'string',
                                    description: 'The new name for the workflow'
                                },
                                nodes: {
                                    type: 'array',
                                    description: 'Array of workflow nodes. See create_workflow for detailed structure.'
                                },
                                connections: {
                                    type: 'array',
                                    description: 'Array of node connections. See create_workflow for detailed structure.'
                                },
                                instance: {
                                    type: 'string',
                                    description: 'Optional instance name to override automatic instance selection'
                                }
                            },
                            required: ['id', 'name', 'nodes']
                        }
                    },
                    {
                        name: 'delete_workflow',
                        enabled: true,
                        description: 'Delete a workflow by ID',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                id: {
                                    type: 'string',
                                    description: 'The ID of the workflow to delete'
                                },
                                instance: {
                                    type: 'string',
                                    description: 'Optional instance name to override automatic instance selection'
                                }
                            },
                            required: ['id']
                        }
                    },
                    {
                        name: 'activate_workflow',
                        enabled: true,
                        description: 'Activate a workflow by ID',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                id: {
                                    type: 'string',
                                    description: 'The ID of the workflow to activate'
                                },
                                instance: {
                                    type: 'string',
                                    description: 'Optional instance name to override automatic instance selection'
                                }
                            },
                            required: ['id']
                        }
                    },
                    {
                        name: 'deactivate_workflow',
                        enabled: true,
                        description: 'Deactivate a workflow by ID',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                id: {
                                    type: 'string',
                                    description: 'The ID of the workflow to deactivate'
                                },
                                instance: {
                                    type: 'string',
                                    description: 'Optional instance name to override automatic instance selection'
                                }
                            },
                            required: ['id']
                        }
                    },
                    // Execution Tools
                    {
                        name: 'list_executions',
                        enabled: true,
                        description: 'List all executions from n8n with optional filters',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                includeData: {
                                    type: 'boolean',
                                    description: 'Whether to include execution data in the response'
                                },
                                status: {
                                    type: 'string',
                                    enum: ['error', 'success', 'waiting'],
                                    description: 'Filter executions by status (error, success, or waiting)'
                                },
                                workflowId: {
                                    type: 'string',
                                    description: 'Filter executions by workflow ID'
                                },
                                projectId: {
                                    type: 'string',
                                    description: 'Filter executions by project ID'
                                },
                                limit: {
                                    type: 'number',
                                    description: 'Maximum number of executions to return'
                                },
                                cursor: {
                                    type: 'string',
                                    description: 'Cursor for pagination'
                                },
                                instance: {
                                    type: 'string',
                                    description: 'Optional instance name to override automatic instance selection'
                                }
                            }
                        }
                    },
                    {
                        name: 'get_execution',
                        enabled: true,
                        description: 'Get details of a specific execution by ID',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                id: {
                                    type: 'number',
                                    description: 'The ID of the execution to retrieve'
                                },
                                includeData: {
                                    type: 'boolean',
                                    description: 'Whether to include execution data in the response'
                                },
                                instance: {
                                    type: 'string',
                                    description: 'Optional instance name to override automatic instance selection'
                                }
                            },
                            required: ['id']
                        }
                    },
                    {
                        name: 'delete_execution',
                        enabled: true,
                        description: 'Delete an execution by ID',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                id: {
                                    type: 'number',
                                    description: 'The ID of the execution to delete'
                                },
                                instance: {
                                    type: 'string',
                                    description: 'Optional instance name to override automatic instance selection'
                                }
                            },
                            required: ['id']
                        }
                    },
                    // Tag Tools
                    {
                        name: 'create_tag',
                        enabled: true,
                        description: 'Create a new tag',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                name: {
                                    type: 'string',
                                    description: 'The name of the tag to create'
                                },
                                instance: {
                                    type: 'string',
                                    description: 'Optional instance name to override automatic instance selection'
                                }
                            },
                            required: ['name']
                        }
                    },
                    {
                        name: 'get_tags',
                        enabled: true,
                        description: 'Get all tags',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                cursor: {
                                    type: 'string',
                                    description: 'Cursor for pagination'
                                },
                                limit: {
                                    type: 'number',
                                    description: 'Maximum number of tags to return'
                                },
                                instance: {
                                    type: 'string',
                                    description: 'Optional instance name to override automatic instance selection'
                                }
                            }
                        }
                    },
                    {
                        name: 'get_tag',
                        enabled: true,
                        description: 'Get a tag by ID',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                id: {
                                    type: 'string',
                                    description: 'The ID of the tag to retrieve'
                                },
                                instance: {
                                    type: 'string',
                                    description: 'Optional instance name to override automatic instance selection'
                                }
                            },
                            required: ['id']
                        }
                    },
                    {
                        name: 'update_tag',
                        enabled: true,
                        description: 'Update a tag',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                id: {
                                    type: 'string',
                                    description: 'The ID of the tag to update'
                                },
                                name: {
                                    type: 'string',
                                    description: 'The new name for the tag'
                                },
                                instance: {
                                    type: 'string',
                                    description: 'Optional instance name to override automatic instance selection'
                                }
                            },
                            required: ['id', 'name']
                        }
                    },
                    {
                        name: 'delete_tag',
                        enabled: true,
                        description: 'Delete a tag',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                id: {
                                    type: 'string',
                                    description: 'The ID of the tag to delete'
                                },
                                instance: {
                                    type: 'string',
                                    description: 'Optional instance name to override automatic instance selection'
                                }
                            },
                            required: ['id']
                        }
                    }
                ]
            };
        });
        this.server.setRequestHandler(sdk_schemas_1.CallToolRequestSchema, async (request) => {
            this.log('info', `Message from client: ${JSON.stringify(request)}`);
            try {
                const { name, arguments: args } = request.params;
                this.log('info', `Tool call: ${name} with arguments: ${JSON.stringify(args)}`);
                const handleToolCall = async (toolName, args) => {
                    switch (toolName) {
                        case 'list_workflows':
                            try {
                                const workflows = await this.n8nWrapper.listWorkflows(args.instance);
                                return {
                                    content: [{
                                            type: 'text',
                                            text: JSON.stringify(workflows, null, 2)
                                        }]
                                };
                            }
                            catch (error) {
                                this.log('error', `Failed to list workflows: ${error.message}`, error);
                                throw new types_js_1.McpError(types_js_1.ErrorCode.InternalError, `Failed to list workflows: ${error.message}`);
                            }
                        case 'execute_workflow':
                            if (!args.id) {
                                throw new types_js_1.McpError(types_js_1.ErrorCode.InvalidParams, 'Workflow ID is required');
                            }
                            const executionResult = await this.n8nWrapper.executeWorkflow(args.id, args.runData, args.instance);
                            return {
                                content: [{
                                        type: 'text',
                                        text: JSON.stringify(executionResult, null, 2)
                                    }]
                            };
                        case 'create_workflow':
                            try {
                                // Ensure args is an object
                                const parameters = args || {};
                                this.log('info', 'Create workflow parameters:', JSON.stringify(parameters, null, 2));
                                if (!parameters.name || !parameters.nodes) {
                                    throw new types_js_1.McpError(types_js_1.ErrorCode.InvalidParams, 'Workflow name and nodes are required');
                                }
                                if (!parameters.connections || !Array.isArray(parameters.connections) || parameters.connections.length === 0) {
                                    this.log('info', 'No connections provided. Workflow nodes will not be connected.');
                                    throw new types_js_1.McpError(types_js_1.ErrorCode.InvalidParams, 'Connections array is required and must not be empty. Each workflow node should be properly connected.');
                                }
                                // Create input data in the required format
                                const workflowInput = {
                                    name: parameters.name,
                                    nodes: parameters.nodes,
                                    connections: []
                                };
                                // Check and transform nodes
                                workflowInput.nodes.forEach((node, index) => {
                                    if (!node.name || !node.type) {
                                        throw new types_js_1.McpError(types_js_1.ErrorCode.InvalidParams, `Node at index ${index} is missing name or type`);
                                    }
                                });
                                // Transform connections to LegacyWorkflowConnection[] format
                                if (parameters.connections && Array.isArray(parameters.connections)) {
                                    workflowInput.connections = parameters.connections.map((conn) => {
                                        if (!conn.source || !conn.target) {
                                            throw new types_js_1.McpError(types_js_1.ErrorCode.InvalidParams, 'Connection is missing source or target fields. Each connection must define both source and target nodes.');
                                        }
                                        // Check that source and target nodes exist in the workflow
                                        const sourceNode = workflowInput.nodes.find(node => node.name === conn.source || node.id === conn.source);
                                        const targetNode = workflowInput.nodes.find(node => node.name === conn.target || node.id === conn.target);
                                        if (!sourceNode) {
                                            throw new types_js_1.McpError(types_js_1.ErrorCode.InvalidParams, `Connection references non-existent source node: "${conn.source}"`);
                                        }
                                        if (!targetNode) {
                                            throw new types_js_1.McpError(types_js_1.ErrorCode.InvalidParams, `Connection references non-existent target node: "${conn.target}"`);
                                        }
                                        // Всегда используем имя узла для connections - это обеспечит совместимость с n8n UI
                                        return {
                                            source: sourceNode.name,
                                            target: targetNode.name,
                                            sourceOutput: conn.sourceOutput || 0,
                                            targetInput: conn.targetInput || 0
                                        };
                                    });
                                }
                                this.log('info', 'Transformed workflow input:', JSON.stringify(workflowInput, null, 2));
                                const createdWorkflow = await this.n8nWrapper.createWorkflow(workflowInput, args.instance);
                                this.log('info', 'Workflow created successfully:', JSON.stringify(createdWorkflow, null, 2));
                                return {
                                    content: [{
                                            type: 'text',
                                            text: JSON.stringify(createdWorkflow, null, 2)
                                        }]
                                };
                            }
                            catch (error) {
                                this.log('error', 'Error creating workflow:', error);
                                if (error instanceof types_js_1.McpError) {
                                    throw error;
                                }
                                throw new types_js_1.McpError(types_js_1.ErrorCode.InternalError, `Failed to create workflow: ${error.message}`);
                            }
                        case 'get_workflow':
                            if (!args.id) {
                                throw new types_js_1.McpError(types_js_1.ErrorCode.InvalidParams, 'Workflow ID is required');
                            }
                            const workflow = await this.n8nWrapper.getWorkflow(args.id, args.instance);
                            return {
                                content: [{
                                        type: 'text',
                                        text: JSON.stringify(workflow, null, 2)
                                    }]
                            };
                        case 'update_workflow':
                            if (!args.id) {
                                throw new types_js_1.McpError(types_js_1.ErrorCode.InvalidParams, 'Workflow ID is required');
                            }
                            if (!args.nodes) {
                                throw new types_js_1.McpError(types_js_1.ErrorCode.InvalidParams, 'Workflow nodes are required');
                            }
                            // Create input data for updating in the required format
                            const updateInput = {
                                name: args.name,
                                nodes: args.nodes,
                                connections: []
                            };
                            // Transform connections to LegacyWorkflowConnection[] format
                            if (args.connections) {
                                // Проверяем, имеет ли объект connections структуру объекта или массива
                                if (Array.isArray(args.connections)) {
                                    updateInput.connections = args.connections.map((conn) => ({
                                        source: conn.source,
                                        target: conn.target,
                                        sourceOutput: conn.sourceOutput,
                                        targetInput: conn.targetInput
                                    }));
                                }
                                else if (typeof args.connections === 'object') {
                                    // Формат объекта n8n API, преобразуем его в массив LegacyWorkflowConnection
                                    const legacyConnections = [];
                                    Object.entries(args.connections).forEach(([sourceName, data]) => {
                                        if (data.main && Array.isArray(data.main)) {
                                            data.main.forEach((connectionGroup, sourceIndex) => {
                                                if (Array.isArray(connectionGroup)) {
                                                    connectionGroup.forEach(conn => {
                                                        legacyConnections.push({
                                                            source: sourceName,
                                                            target: conn.node,
                                                            sourceOutput: sourceIndex,
                                                            targetInput: conn.index || 0
                                                        });
                                                    });
                                                }
                                            });
                                        }
                                    });
                                    updateInput.connections = legacyConnections;
                                }
                                else {
                                    throw new types_js_1.McpError(types_js_1.ErrorCode.InvalidParams, 'Connections must be either an array or an object');
                                }
                            }
                            this.log('info', `Updating workflow with connections: ${JSON.stringify(updateInput.connections)}`);
                            try {
                                const updatedWorkflow = await this.n8nWrapper.updateWorkflow(args.id, updateInput, args.instance);
                                return {
                                    content: [{
                                            type: 'text',
                                            text: JSON.stringify(updatedWorkflow, null, 2)
                                        }]
                                };
                            }
                            catch (error) {
                                this.log('error', `Failed to update workflow: ${error.message}`, error);
                                throw new types_js_1.McpError(types_js_1.ErrorCode.InternalError, `Failed to update workflow: ${error.message}`);
                            }
                        case 'delete_workflow':
                            if (!args.id) {
                                throw new types_js_1.McpError(types_js_1.ErrorCode.InvalidParams, 'Workflow ID is required');
                            }
                            const deleteResult = await this.n8nWrapper.deleteWorkflow(args.id, args.instance);
                            return {
                                content: [{
                                        type: 'text',
                                        text: JSON.stringify(deleteResult, null, 2)
                                    }]
                            };
                        case 'activate_workflow':
                            if (!args.id) {
                                throw new types_js_1.McpError(types_js_1.ErrorCode.InvalidParams, 'Workflow ID is required');
                            }
                            const activatedWorkflow = await this.n8nWrapper.activateWorkflow(args.id, args.instance);
                            return {
                                content: [{
                                        type: 'text',
                                        text: JSON.stringify(activatedWorkflow, null, 2)
                                    }]
                            };
                        case 'deactivate_workflow':
                            if (!args.id) {
                                throw new types_js_1.McpError(types_js_1.ErrorCode.InvalidParams, 'Workflow ID is required');
                            }
                            const deactivatedWorkflow = await this.n8nWrapper.deactivateWorkflow(args.id, args.instance);
                            return {
                                content: [{
                                        type: 'text',
                                        text: JSON.stringify(deactivatedWorkflow, null, 2)
                                    }]
                            };
                        // Execution Tools
                        case 'list_executions':
                            const executions = await this.n8nWrapper.listExecutions({
                                includeData: args.includeData,
                                status: args.status,
                                workflowId: args.workflowId,
                                projectId: args.projectId,
                                limit: args.limit,
                                cursor: args.cursor
                            }, args.instance);
                            return {
                                content: [{
                                        type: 'text',
                                        text: JSON.stringify(executions, null, 2)
                                    }]
                            };
                        case 'get_execution':
                            if (!args.id) {
                                throw new types_js_1.McpError(types_js_1.ErrorCode.InvalidParams, 'Execution ID is required');
                            }
                            const execution = await this.n8nWrapper.getExecution(args.id, args.includeData, args.instance);
                            return {
                                content: [{
                                        type: 'text',
                                        text: JSON.stringify(execution, null, 2)
                                    }]
                            };
                        case 'delete_execution':
                            if (!args.id) {
                                throw new types_js_1.McpError(types_js_1.ErrorCode.InvalidParams, 'Execution ID is required');
                            }
                            const deletedExecution = await this.n8nWrapper.deleteExecution(args.id, args.instance);
                            return {
                                content: [{
                                        type: 'text',
                                        text: JSON.stringify(deletedExecution, null, 2)
                                    }]
                            };
                        // Tag Tools
                        case 'create_tag':
                            if (!args.name) {
                                throw new types_js_1.McpError(types_js_1.ErrorCode.InvalidParams, 'Tag name is required');
                            }
                            const createdTag = await this.n8nWrapper.createTag({ name: args.name }, args.instance);
                            return {
                                content: [{
                                        type: 'text',
                                        text: JSON.stringify(createdTag, null, 2)
                                    }]
                            };
                        case 'get_tags':
                            const tagsOptions = {};
                            if (args.cursor) {
                                tagsOptions.cursor = args.cursor;
                            }
                            if (args.limit) {
                                tagsOptions.limit = args.limit;
                            }
                            const tags = await this.n8nWrapper.getTags(tagsOptions, args.instance);
                            return {
                                content: [{
                                        type: 'text',
                                        text: JSON.stringify(tags, null, 2)
                                    }]
                            };
                        case 'get_tag':
                            if (!args.id) {
                                throw new types_js_1.McpError(types_js_1.ErrorCode.InvalidParams, 'Tag ID is required');
                            }
                            const tag = await this.n8nWrapper.getTag(args.id, args.instance);
                            return {
                                content: [{
                                        type: 'text',
                                        text: JSON.stringify(tag, null, 2)
                                    }]
                            };
                        case 'update_tag':
                            if (!args.id || !args.name) {
                                throw new types_js_1.McpError(types_js_1.ErrorCode.InvalidParams, 'Tag ID and name are required');
                            }
                            const updatedTag = await this.n8nWrapper.updateTag(args.id, { name: args.name }, args.instance);
                            return {
                                content: [{
                                        type: 'text',
                                        text: JSON.stringify(updatedTag, null, 2)
                                    }]
                            };
                        case 'delete_tag':
                            if (!args.id) {
                                throw new types_js_1.McpError(types_js_1.ErrorCode.InvalidParams, 'Tag ID is required');
                            }
                            const deletedTag = await this.n8nWrapper.deleteTag(args.id, args.instance);
                            return {
                                content: [{
                                        type: 'text',
                                        text: JSON.stringify(deletedTag, null, 2)
                                    }]
                            };
                        default:
                            throw new types_js_1.McpError(types_js_1.ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
                    }
                };
                return await handleToolCall(name, args);
            }
            catch (error) {
                logger_1.default.error();
                if (error instanceof types_js_1.McpError) {
                    throw error;
                }
                return {
                    content: [{
                            type: 'text',
                            text: `Error: ${error instanceof Error ? error.message : String(error)}`
                        }],
                    isError: true
                };
            }
        });
    }
    setupPromptHandlers() {
        // Handler for prompts/list method
        this.server.setRequestHandler(sdk_schemas_1.ListPromptsRequestSchema, async () => {
            this.log('info', 'Listing available prompts');
            // Get all available prompts
            const prompts = promptsService.getAllPrompts();
            // Transform them to the format expected by MCP
            const mcpPrompts = prompts.map((prompt) => ({
                id: prompt.id,
                name: prompt.name,
                description: prompt.description,
                inputSchema: {
                    type: 'object',
                    properties: prompt.variables.reduce((schema, variable) => {
                        schema[variable.name] = {
                            type: 'string',
                            description: variable.description,
                            default: variable.defaultValue
                        };
                        return schema;
                    }, {}),
                    required: prompt.variables
                        .filter(variable => variable.required)
                        .map(variable => variable.name)
                }
            }));
            return {
                prompts: mcpPrompts
            };
        });
        // For prompts/fill we'll add a handler manually
        // Working around type issues by registering the handler directly in the internal object
        this.server["_requestHandlers"].set('prompts/fill', async (request) => {
            const { promptId, variables } = request.params;
            this.log('info', `Filling prompt "${promptId}" with variables`);
            try {
                // Get the prompt by ID and fill it with the provided variables
                const workflowData = promptsService.fillPromptTemplate(promptId, variables);
                // Return the result in the format expected by MCP
                return {
                    content: [{
                            type: 'text',
                            text: JSON.stringify(workflowData, null, 2)
                        }],
                    metadata: {
                        promptId,
                        timestamp: new Date().toISOString()
                    }
                };
            }
            catch (error) {
                this.log('error', `Error filling prompt: ${error instanceof Error ? error.message : String(error)}`);
                throw new types_js_1.McpError(types_js_1.ErrorCode.InvalidParams, `Error filling prompt: ${error instanceof Error ? error.message : String(error)}`);
            }
        });
    }
    // Запуск MCP сервера
    async run() {
        // ВАЖНО: Не добавлять вывод в консоль здесь, так как это препятствует работе JSON-RPC через stdin/stdout
        try {
            // Check if we're running as an MCP subprocess (stdin is a TTY) or standalone
            const isStandaloneMode = process.env.MCP_STANDALONE === 'true' || process.stdin.isTTY;
            if (isStandaloneMode) {
                // Standalone mode - only run HTTP server
                const port = process.env.MCP_PORT ? parseInt(process.env.MCP_PORT, 10) : 3456;
                await this.startHttpServer(port);
                this.log('info', `MCP server running in standalone mode on port ${port}`);
                // Keep the process alive
                process.on('SIGINT', () => {
                    this.log('info', 'Received SIGINT, shutting down gracefully');
                    process.exit(0);
                });
            }
            else {
                // MCP subprocess mode - use stdin/stdout transport
                const transport = new stdio_js_1.StdioServerTransport();
                // Also start HTTP server for debugging
                const port = process.env.MCP_PORT ? parseInt(process.env.MCP_PORT, 10) : 3456;
                this.startHttpServer(port).catch(error => {
                    // Don't fail if HTTP server can't start in MCP mode
                    this.log('warn', `HTTP server failed to start: ${error.message}`);
                });
                // Connect to MCP transport
                await this.server.connect(transport);
            }
        }
        catch (error) {
            // Логируем ошибку в файл
            this.log('error', `Failed to start MCP server: ${error instanceof Error ? error.message : String(error)}`);
            process.exit(1);
        }
    }
    async startHttpServer(port) {
        return new Promise((resolve, reject) => {
            try {
                const app = (0, express_1.default)();
                // Настройка CORS
                app.use((0, cors_1.default)());
                // Парсинг JSON
                app.use(express_1.default.json({ limit: '50mb' }));
                // Эндпоинт для проверки работы сервера
                app.get('/health', (req, res) => {
                    res.json({
                        status: 'ok',
                        message: 'MCP server is running',
                        version: '0.3.0'
                    });
                });
                // Обработчик для MCP запросов
                app.post('/mcp', (req, res) => {
                    try {
                        this.log('debug', 'Received MCP request', req.body);
                        // Обработка MCP запроса
                        this.handleJsonRpcMessage(req.body).then(result => {
                            this.log('debug', 'Sending MCP response', result);
                            res.json(result);
                        }).catch((error) => {
                            this.log('error', 'Error handling MCP request', error);
                            res.status(500).json({
                                jsonrpc: '2.0',
                                error: {
                                    code: -32603,
                                    message: 'Internal server error',
                                    data: error.message
                                },
                                id: req.body?.id || null
                            });
                        });
                    }
                    catch (error) {
                        this.log('error', 'Error processing MCP request', error);
                        res.status(500).json({
                            jsonrpc: '2.0',
                            error: {
                                code: -32603,
                                message: 'Internal server error',
                                data: error instanceof Error ? error.message : 'Unknown error'
                            },
                            id: req.body?.id || null
                        });
                    }
                });
                // Запуск HTTP-сервера
                const httpServer = http.createServer(app);
                httpServer.on('error', (error) => {
                    if (error.code === 'EADDRINUSE') {
                        this.log('info', `Port ${port} is already in use. Assuming another instance is already running.`);
                        // Резолвим промис для graceful handling
                        resolve();
                    }
                    else {
                        this.log('error', `HTTP server error: ${error.message}`);
                        reject(error);
                    }
                });
                httpServer.listen(port, () => {
                    this.log('info', `MCP HTTP server listening on port ${port}`);
                    resolve();
                });
            }
            catch (error) {
                this.log('error', `Failed to start HTTP server: ${error instanceof Error ? error.message : String(error)}`);
                reject(error);
            }
        });
    }
    async handleJsonRpcMessage(request) {
        const { method, params, id } = request;
        // Находим соответствующий обработчик для метода
        const handler = this.server['_requestHandlers'].get(method);
        if (!handler) {
            throw new types_js_1.McpError(types_js_1.ErrorCode.MethodNotFound, `Method '${method}' not found`);
        }
        try {
            // Вызываем соответствующий обработчик с параметрами
            const result = await handler(request);
            // Возвращаем результат в формате JSON-RPC
            return {
                jsonrpc: '2.0',
                result,
                id
            };
        }
        catch (error) {
            this.log('error', `Handler error: ${error instanceof Error ? error.message : String(error)}`);
            throw error;
        }
    }
}
// Запуск сервера с обработкой ошибок
const server = new N8NWorkflowServer();
server.run().catch((error) => {
    console.error(`Fatal error starting server: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
});
