"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiPollingWorkflowPrompt = exports.integrationWorkflowPrompt = exports.dataTransformationWorkflowPrompt = exports.httpWebhookWorkflowPrompt = exports.scheduleWorkflowPrompt = exports.PROMPT_IDS = void 0;
exports.getAllPrompts = getAllPrompts;
exports.getPromptById = getPromptById;
exports.fillPromptTemplate = fillPromptTemplate;
// Define constants for prompt IDs
exports.PROMPT_IDS = {
    SCHEDULE_WORKFLOW: 'schedule-workflow',
    HTTP_WEBHOOK_WORKFLOW: 'http-webhook-workflow',
    DATA_TRANSFORMATION_WORKFLOW: 'data-transformation-workflow',
    INTEGRATION_WORKFLOW: 'integration-workflow',
    API_POLLING_WORKFLOW: 'api-polling-workflow'
};
// Prompt for creating a workflow with schedule trigger
exports.scheduleWorkflowPrompt = {
    id: exports.PROMPT_IDS.SCHEDULE_WORKFLOW,
    name: 'Schedule Triggered Workflow',
    description: 'Create a workflow that runs on a schedule',
    template: {
        name: '{workflow_name}',
        nodes: [
            {
                name: 'Schedule Trigger',
                type: 'n8n-nodes-base.cron',
                parameters: {
                    rule: '{schedule_expression}',
                    additionalParameters: {
                        timezone: 'UTC'
                    }
                }
            },
            {
                name: 'Code Script',
                type: 'n8n-nodes-base.code',
                parameters: {
                    jsCode: 'return {\n  timestamp: new Date().toISOString(),\n  message: "{workflow_message}",\n  executionId: $execution.id\n};'
                }
            }
        ],
        connections: [
            {
                source: 'Schedule Trigger',
                target: 'Code Script'
            }
        ]
    },
    variables: [
        {
            name: 'workflow_name',
            description: 'Name of the workflow',
            defaultValue: 'Scheduled Workflow',
            required: true
        },
        {
            name: 'schedule_expression',
            description: 'Cron expression for schedule (e.g. */5 * * * * for every 5 minutes)',
            defaultValue: '*/5 * * * *',
            required: true
        },
        {
            name: 'workflow_message',
            description: 'Message to include in the workflow execution',
            defaultValue: 'Scheduled execution triggered',
            required: false
        }
    ]
};
// Prompt for creating a workflow with HTTP webhook
exports.httpWebhookWorkflowPrompt = {
    id: exports.PROMPT_IDS.HTTP_WEBHOOK_WORKFLOW,
    name: 'HTTP Webhook Workflow',
    description: 'Create a workflow that responds to HTTP webhook requests',
    template: {
        name: '{workflow_name}',
        nodes: [
            {
                name: 'Webhook',
                type: 'n8n-nodes-base.webhook',
                parameters: {
                    httpMethod: 'POST',
                    path: '{webhook_path}',
                    options: {
                        responseMode: 'lastNode'
                    }
                }
            },
            {
                name: 'Process Data',
                type: 'n8n-nodes-base.code',
                parameters: {
                    jsCode: 'const data = $input.first().json;\n\nreturn {\n  processed: true,\n  timestamp: new Date().toISOString(),\n  data,\n  message: "{response_message}"\n};'
                }
            }
        ],
        connections: [
            {
                source: 'Webhook',
                target: 'Process Data'
            }
        ]
    },
    variables: [
        {
            name: 'workflow_name',
            description: 'Name of the workflow',
            defaultValue: 'Webhook Workflow',
            required: true
        },
        {
            name: 'webhook_path',
            description: 'Path for the webhook (e.g. "my-webhook")',
            defaultValue: 'my-webhook',
            required: true
        },
        {
            name: 'response_message',
            description: 'Message to include in the response',
            defaultValue: 'Webhook processed successfully',
            required: false
        }
    ]
};
// Prompt for creating a data transformation workflow
exports.dataTransformationWorkflowPrompt = {
    id: exports.PROMPT_IDS.DATA_TRANSFORMATION_WORKFLOW,
    name: 'Data Transformation Workflow',
    description: 'Create a workflow for processing and transforming data',
    template: {
        name: '{workflow_name}',
        nodes: [
            {
                name: 'Manual Trigger',
                type: 'n8n-nodes-base.manualTrigger',
                parameters: {}
            },
            {
                name: 'Input Data',
                type: 'n8n-nodes-base.set',
                parameters: {
                    values: [
                        {
                            name: 'data',
                            value: '{sample_data}',
                            type: 'json'
                        }
                    ],
                    options: {
                        dotNotation: true
                    }
                }
            },
            {
                name: 'Transform Data',
                type: 'n8n-nodes-base.code',
                parameters: {
                    jsCode: 'const data = $input.first().json.data;\n\n// Apply transformation\n{transformation_code}\n\nreturn { result: data };'
                }
            }
        ],
        connections: [
            {
                source: 'Manual Trigger',
                target: 'Input Data'
            },
            {
                source: 'Input Data',
                target: 'Transform Data'
            }
        ]
    },
    variables: [
        {
            name: 'workflow_name',
            description: 'Name of the workflow',
            defaultValue: 'Data Transformation Workflow',
            required: true
        },
        {
            name: 'sample_data',
            description: 'Sample JSON data to transform',
            defaultValue: '{"items": [{"id": 1, "name": "Item 1"}, {"id": 2, "name": "Item 2"}]}',
            required: true
        },
        {
            name: 'transformation_code',
            description: 'JavaScript code for data transformation',
            defaultValue: '// Example: Add a processed flag to each item\ndata.items = data.items.map(item => ({\n  ...item,\n  processed: true,\n  processedAt: new Date().toISOString()\n}));',
            required: true
        }
    ]
};
// Prompt for creating an integration workflow
exports.integrationWorkflowPrompt = {
    id: exports.PROMPT_IDS.INTEGRATION_WORKFLOW,
    name: 'External Service Integration Workflow',
    description: 'Create a workflow that integrates with external services',
    template: {
        name: '{workflow_name}',
        nodes: [
            {
                name: 'Schedule Trigger',
                type: 'n8n-nodes-base.cron',
                parameters: {
                    rule: '{schedule_expression}',
                    additionalParameters: {
                        timezone: 'UTC'
                    }
                }
            },
            {
                name: 'HTTP Request',
                type: 'n8n-nodes-base.httpRequest',
                parameters: {
                    url: '{api_url}',
                    method: 'GET',
                    authentication: 'none',
                    options: {}
                }
            },
            {
                name: 'Process Response',
                type: 'n8n-nodes-base.code',
                parameters: {
                    jsCode: 'const data = $input.first().json;\n\n// Process the API response\n{processing_code}\n\nreturn { result: data };'
                }
            }
        ],
        connections: [
            {
                source: 'Schedule Trigger',
                target: 'HTTP Request'
            },
            {
                source: 'HTTP Request',
                target: 'Process Response'
            }
        ]
    },
    variables: [
        {
            name: 'workflow_name',
            description: 'Name of the workflow',
            defaultValue: 'External API Integration',
            required: true
        },
        {
            name: 'schedule_expression',
            description: 'Cron expression for schedule',
            defaultValue: '0 */6 * * *', // Every 6 hours
            required: true
        },
        {
            name: 'api_url',
            description: 'URL of the external API to call',
            defaultValue: 'https://api.example.com/data',
            required: true
        },
        {
            name: 'processing_code',
            description: 'JavaScript code to process the API response',
            defaultValue: '// Example: Extract and transform specific fields\nconst processedData = data.items ? data.items.map(item => ({\n  id: item.id,\n  name: item.name,\n  status: item.status || "pending"\n})) : [];\n\ndata.processedItems = processedData;\ndata.processedAt = new Date().toISOString();',
            required: true
        }
    ]
};
// New prompt for creating an API polling workflow
exports.apiPollingWorkflowPrompt = {
    id: exports.PROMPT_IDS.API_POLLING_WORKFLOW,
    name: 'API Data Polling Workflow',
    description: 'Create a workflow that polls an API and processes data',
    template: {
        name: '{workflow_name}',
        nodes: [
            {
                name: 'Interval Trigger',
                type: 'n8n-nodes-base.interval',
                parameters: {
                    interval: '{interval_value}'
                }
            },
            {
                name: 'HTTP Request',
                type: 'n8n-nodes-base.httpRequest',
                parameters: {
                    url: '{api_url}',
                    method: 'GET',
                    authentication: 'none',
                    options: {}
                }
            },
            {
                name: 'Filter Data',
                type: 'n8n-nodes-base.code',
                parameters: {
                    jsCode: 'const data = $input.first().json;\n\n// Define filtering logic\nconst filtered = data.{filter_path} || [];\n\n// Apply additional filtering if needed\nconst result = filtered.filter(item => {filter_condition});\n\nreturn { json: { filtered: result, count: result.length } };'
                }
            },
            {
                name: 'Set Status',
                type: 'n8n-nodes-base.set',
                parameters: {
                    values: [
                        {
                            name: 'status',
                            value: 'success',
                            type: 'string'
                        },
                        {
                            name: 'timestamp',
                            value: '={{$now.toISOString()}}',
                            type: 'string'
                        },
                        {
                            name: 'message',
                            value: '={{"Data fetch and filter complete. Found " + $json.count + " items."}}',
                            type: 'string'
                        }
                    ],
                    options: {
                        dotNotation: true
                    }
                }
            }
        ],
        connections: [
            {
                source: 'Interval Trigger',
                target: 'HTTP Request'
            },
            {
                source: 'HTTP Request',
                target: 'Filter Data'
            },
            {
                source: 'Filter Data',
                target: 'Set Status'
            }
        ]
    },
    variables: [
        {
            name: 'workflow_name',
            description: 'Name of the workflow',
            defaultValue: 'API Polling Workflow',
            required: true
        },
        {
            name: 'interval_value',
            description: 'Polling interval in minutes (1-60)',
            defaultValue: '15',
            required: true
        },
        {
            name: 'api_url',
            description: 'URL of the API to poll',
            defaultValue: 'https://api.example.com/data',
            required: true
        },
        {
            name: 'filter_path',
            description: 'JSON path to the array in the API response',
            defaultValue: 'items',
            required: true
        },
        {
            name: 'filter_condition',
            description: 'JavaScript condition to filter items (e.g. item.status === "active")',
            defaultValue: 'true',
            required: false
        }
    ]
};
// Get all available prompts
function getAllPrompts() {
    return [
        exports.scheduleWorkflowPrompt,
        exports.httpWebhookWorkflowPrompt,
        exports.dataTransformationWorkflowPrompt,
        exports.integrationWorkflowPrompt,
        exports.apiPollingWorkflowPrompt
    ];
}
// Get prompt by ID
function getPromptById(id) {
    return getAllPrompts().find(prompt => prompt.id === id);
}
// Fill template with variable values
function fillPromptTemplate(promptId, variables) {
    const prompt = getPromptById(promptId);
    if (!prompt) {
        throw new Error(`Prompt with id ${promptId} not found`);
    }
    // Create a copy of the template for filling
    const template = JSON.parse(JSON.stringify(prompt.template));
    // Check that all required variables are provided
    prompt.variables
        .filter((v) => v.required)
        .forEach((v) => {
        if (!variables[v.name] && !v.defaultValue) {
            throw new Error(`Required variable ${v.name} is missing`);
        }
    });
    // Function for recursive variable replacement in an object
    function replaceVariables(obj, currentPrompt) {
        if (typeof obj === 'string') {
            // Replace all variables in the format {var_name} with their values
            return obj.replace(/\{([^}]+)\}/g, (match, varName) => {
                // Pass prompt as a function parameter to avoid undefined issues
                const variableDefault = currentPrompt.variables.find((v) => v.name === varName)?.defaultValue;
                return variables[varName] || variableDefault || match;
            });
        }
        else if (Array.isArray(obj)) {
            return obj.map(item => replaceVariables(item, currentPrompt));
        }
        else if (obj !== null && typeof obj === 'object') {
            const result = {};
            for (const key in obj) {
                result[key] = replaceVariables(obj[key], currentPrompt);
            }
            return result;
        }
        return obj;
    }
    // Fill variables in the template, passing prompt as an argument
    return replaceVariables(template, prompt);
}
