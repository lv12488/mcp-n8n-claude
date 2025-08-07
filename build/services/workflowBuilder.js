"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowBuilder = void 0;
const positioning_1 = require("../utils/positioning");
const validation_1 = require("../utils/validation");
class WorkflowBuilder {
    constructor() {
        this.nodes = [];
        this.connections = [];
        this.nextPosition = { x: 100, y: 100 };
    }
    addNode(node) {
        const newNode = {
            id: node.id || `node_${this.nodes.length + 1}`,
            name: node.name || `Node ${this.nodes.length + 1}`,
            type: node.type || 'unknown',
            parameters: node.parameters || {},
            position: node.position || [this.nextPosition.x, this.nextPosition.y],
            typeVersion: node.typeVersion || 1
        };
        this.nextPosition = (0, positioning_1.calculateNextPosition)(this.nextPosition);
        this.nodes.push(newNode);
        return newNode;
    }
    connectNodes(source, target, sourceOutput = 0, targetInput = 0) {
        const connection = {
            source,
            target,
            sourceOutput,
            targetInput
        };
        this.connections.push(connection);
    }
    exportWorkflow(name = 'New Workflow') {
        return (0, validation_1.validateWorkflowSpec)({
            name,
            nodes: this.nodes,
            connections: this.connections
        });
    }
}
exports.WorkflowBuilder = WorkflowBuilder;
