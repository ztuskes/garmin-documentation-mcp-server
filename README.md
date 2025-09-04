# Garmin Documentation MCP Server

An MCP (Model Context Protocol) server that provides **comprehensive offline access** to Garmin Connect IQ SDK 8.2.3 documentation for AI assistants like Claude.

## Features

🚀 **Fully Offline**: Works with local documentation - no internet required!
📚 **Comprehensive**: Complete access to all modules, classes, methods, properties, and constants
🔍 **Advanced Search**: Deep semantic search across the entire API surface
⚡ **Fast**: Local parsing and indexing for instant responses

The server provides the following tools:

- **search_garmin_docs**: Advanced search across modules, classes, methods, properties, and constants
- **get_module_details**: Complete module information including all classes, constants, and functions
- **get_class_details**: Detailed class information with full method signatures and parameters
- **list_modules**: Comprehensive listing of all SDK 8.2.3 modules with statistics
- **get_api_examples**: Code examples with SDK version-specific syntax

## Installation

1. Clone or download this repository
2. Copy the Garmin Connect IQ SDK 8.2.3 documentation to a `docs/` folder in the project root
3. Install dependencies:
```bash
npm install
```

4. Build the project:
```bash
npm run build
```

**Note**: On first run, the server will automatically parse and index all documentation files. This may take a few seconds initially but subsequent runs will be instant.

## Usage

### Running the Server

For development:
```bash
npm run dev
```

For production:
```bash
npm start
```

### Configuration for Claude Code (Recommended)

Add the MCP server using the Claude Code CLI:

```bash
# Add the server (run from any directory)
claude mcp add garmin-documentation /path/to/garmin-documentation-mcp-server/dist/index.js

# Or add at project scope for team collaboration
claude mcp add --scope project garmin-documentation /path/to/garmin-documentation-mcp-server/dist/index.js
```

**Verify installation**:
```bash
claude mcp list
```

### Configuration for Claude Desktop

Add this server to your Claude Desktop configuration file:

**On macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**On Windows**: `%APPDATA%\\Claude\\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "garmin-documentation": {
      "command": "node",
      "args": ["/path/to/garmin-documentation-mcp-server/dist/index.js"]
    }
  }
}
```

Replace `/path/to/garmin-documentation-mcp-server` with the actual path to your installation.

## Available Tools

### search_garmin_docs
Search the Garmin Connect IQ API documentation.

**Parameters:**
- `query` (required): Search term
- `category` (optional): Filter by type ("module", "class", "function", or "all")

### get_module_details
Get detailed information about a specific module.

**Parameters:**
- `module_name` (required): Name of the module (e.g., "System", "Activity", "WatchUi")

### get_class_details
Get detailed information about a specific class.

**Parameters:**
- `class_name` (required): Name of the class
- `module_name` (optional): Module containing the class

### list_modules
List all available Garmin Connect IQ modules with descriptions.

### get_api_examples
Get code examples for specific functionality.

**Parameters:**
- `topic` (required): Topic for examples (e.g., "activity monitoring", "bluetooth", "watchface")

## Example Usage with Claude

Once configured, you can ask Claude questions like:

- "Search for bluetooth functionality in Garmin Connect IQ"
- "Show me details about the System module"
- "Get examples for creating a watch face"
- "What classes are available in the Activity module?"
- "List all available modules"
- "Find methods related to heart rate monitoring"

## Management Commands (Claude Code)

```bash
# List all configured MCP servers
claude mcp list

# Get details about the server
claude mcp get garmin-documentation

# Remove the server
claude mcp remove garmin-documentation
```

## Supported Modules

The server provides access to all major Garmin Connect IQ modules including:

- **Activity**: Activity recording and monitoring
- **ActivityMonitor**: Daily activity metrics
- **ANT**: ANT wireless communication
- **Application**: App framework and lifecycle
- **BluetoothLowEnergy**: BLE communication  
- **Graphics**: Drawing and rendering
- **Position**: GPS and location services
- **Sensor**: Device sensor access
- **System**: Core system functions
- **WatchUi**: User interface components
- **And many more...**

## Development

To modify or extend the server:

1. Edit the TypeScript source files in `src/`
2. Build with `npm run build`
3. Test your changes with `npm run dev`

## License

MIT