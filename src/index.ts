#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError
} from '@modelcontextprotocol/sdk/types.js';
import { GarminDocumentationService } from './garmin-docs.js';

class GarminDocumentationMCPServer {
  private server: Server;
  private garminDocs: GarminDocumentationService;

  constructor() {
    this.server = new Server(
      {
        name: 'garmin-documentation-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.garminDocs = new GarminDocumentationService();
    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'search_garmin_docs',
            description: 'Search Garmin Connect IQ API documentation for modules, classes, or functions',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search term (module name, class name, or function name)',
                },
                category: {
                  type: 'string',
                  enum: ['module', 'class', 'function', 'all'],
                  description: 'Type of documentation to search for',
                  default: 'all'
                }
              },
              required: ['query'],
            },
          },
          {
            name: 'get_module_details',
            description: 'Get detailed information about a specific Garmin Connect IQ module',
            inputSchema: {
              type: 'object',
              properties: {
                module_name: {
                  type: 'string',
                  description: 'Name of the module (e.g., "System", "Activity", "WatchUi")',
                },
              },
              required: ['module_name'],
            },
          },
          {
            name: 'get_class_details',
            description: 'Get detailed information about a specific class in the Garmin Connect IQ API',
            inputSchema: {
              type: 'object',
              properties: {
                class_name: {
                  type: 'string',
                  description: 'Name of the class',
                },
                module_name: {
                  type: 'string',
                  description: 'Module containing the class (optional)',
                },
              },
              required: ['class_name'],
            },
          },
          {
            name: 'list_modules',
            description: 'List all available Garmin Connect IQ modules with descriptions',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'get_api_examples',
            description: 'Get code examples for specific Garmin Connect IQ functionality',
            inputSchema: {
              type: 'object',
              properties: {
                topic: {
                  type: 'string',
                  description: 'Topic to get examples for (e.g., "activity monitoring", "bluetooth", "watchface")',
                },
              },
              required: ['topic'],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      if (!args || typeof args !== 'object') {
        throw new McpError(ErrorCode.InvalidParams, 'Missing or invalid arguments');
      }

      try {
        switch (name) {
          case 'search_garmin_docs':
            return await this.garminDocs.searchDocs(
              args.query as string, 
              (args.category as string) || 'all'
            );

          case 'get_module_details':
            return await this.garminDocs.getModuleDetails(args.module_name as string);

          case 'get_class_details':
            return await this.garminDocs.getClassDetails(
              args.class_name as string, 
              args.module_name as string
            );

          case 'list_modules':
            return await this.garminDocs.listModules();

          case 'get_api_examples':
            return await this.garminDocs.getApiExamples(args.topic as string);

          default:
            throw new McpError(ErrorCode.MethodNotFound, `Tool not found: ${name}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        throw new McpError(ErrorCode.InternalError, `Error executing tool ${name}: ${errorMessage}`);
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Garmin Documentation MCP server running on stdio');
  }
}

const server = new GarminDocumentationMCPServer();
server.run().catch(console.error);