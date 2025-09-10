# Garmin Documentation MCP Server

An MCP (Model Context Protocol) server that provides **comprehensive offline access** to the complete Garmin Connect IQ SDK 8.2.3 documentation ecosystem for AI assistants like Claude.

## Features

🚀 **Fully Offline**: Works with local documentation - no internet required!  
📚 **Complete Documentation**: Access to API docs, programming guides, device reference, FAQ, and visual resources (1,407+ files)  
🔍 **Enhanced Search**: Deep semantic search with fuzzy matching and cross-reference support  
⚡ **Fast**: Local parsing and indexing for instant responses  
🎯 **Accurate Versioning**: Proper API Level to SDK version mapping (fixes common confusion)  
📱 **Device-Specific Info**: Hardware capabilities, memory limits, round device support  
📖 **Programming Guides**: Getting started tutorials, debugging, testing, and best practices  
❓ **FAQ & Troubleshooting**: Common issues with fonts, memory, graphics, and more

## v1.0.1 New Features

✨ **Fixed API Level Confusion**: Now correctly shows `API Level 4.2.0 (≈ SDK 6.x+)` instead of misleading version info  
✨ **Fixed Module Functions**: Critical bug fix - now properly finds all module-level functions (Math.stdev, Cryptography.createPublicKey, etc.)  
✨ **3 New Tools**: Device reference search, programming guides, and FAQ search  
✨ **Enhanced Coverage**: Now indexes programming guides, device docs, FAQ resources, and personality library  
✨ **Better Search Results**: Includes guide content in main search with comprehensive cross-references

The server provides the following tools:

### Core API Tools
- **search_garmin_docs**: Enhanced search across modules, classes, methods, properties, constants, and guides
- **get_module_details**: Complete module information with corrected version mapping
- **get_class_details**: Detailed class information with proper SDK version context
- **list_modules**: Comprehensive listing of all SDK 8.2.3 modules with statistics
- **get_api_examples**: Code examples with SDK version-specific syntax

### New Documentation Tools
- **search_device_reference**: Search device-specific capabilities, memory limits, and hardware features
- **get_programming_guide**: Access getting started guides, tutorials, and development best practices  
- **search_faq**: Find troubleshooting info for common issues (fonts, memory, graphics, etc.)

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

### Core API Tools

#### search_garmin_docs
Enhanced search across the entire Garmin Connect IQ documentation ecosystem.

**Parameters:**
- `query` (required): Search term
- `category` (optional): Filter by type ("module", "class", "function", or "all")

**New in v1.0.1**: Now includes programming guides, device docs, and FAQ in search results with proper API Level to SDK version mapping.

#### get_module_details
Get detailed information about a specific module with corrected version information.

**Parameters:**
- `module_name` (required): Name of the module (e.g., "System", "Activity", "WatchUi")

**Improvement**: Shows `API Level 4.2.0 (≈ SDK 6.x+)` instead of confusing raw API levels.

#### get_class_details
Get detailed information about a specific class with proper SDK version context.

**Parameters:**
- `class_name` (required): Name of the class
- `module_name` (optional): Module containing the class

#### list_modules
List all available Garmin Connect IQ modules with descriptions and statistics.

#### get_api_examples
Get code examples for specific functionality with SDK version-specific syntax.

**Parameters:**
- `topic` (required): Topic for examples (e.g., "activity monitoring", "bluetooth", "watchface")

### New Documentation Tools (v1.0.1)

#### search_device_reference
Search device-specific reference documentation and hardware capabilities.

**Parameters:**
- `query` (required): Search term for device capabilities, memory limits, or hardware features
- `device_type` (optional): Device type filter (e.g., "watch", "bike", "golf")

**Use Cases**: Find memory limits, round device support, hardware-specific features.

#### get_programming_guide
Access programming guides and tutorials for Connect IQ development.

**Parameters:**
- `topic` (required): Programming topic (e.g., "getting started", "app types", "debugging", "testing")

**Coverage**: Getting started guides, app development tutorials, compiler documentation, debugging tips.

#### search_faq
Search frequently asked questions and troubleshooting information.

**Parameters:**
- `query` (required): Search term for FAQ or troubleshooting topics

**Topics Include**: Font rendering, memory management, graphics optimization, music control, map integration, and more.

## Example Usage with Claude

Once configured, you can ask Claude questions like:

### Core API Questions
- "Search for bluetooth functionality in Garmin Connect IQ"
- "Show me details about the System module"
- "Get examples for creating a watch face"  
- "What classes are available in the Activity module?"
- "List all available modules"
- "Find methods related to heart rate monitoring"

### New v1.0.1 Capabilities
- "Are complications available in SDK 7?" ✅ *Now answers correctly with proper version mapping*
- "How do I use stdev function?" ✅ *Now finds Math.stdev with complete examples*  
- "Show me createPublicKey usage" ✅ *Now finds Cryptography.createPublicKey with examples*
- "How do I get started with Connect IQ development?"
- "What are the memory limits for different Garmin devices?"
- "How do I support round devices in my app?"
- "What's the difference between API Level and SDK version?"
- "How do I troubleshoot font rendering issues?"
- "Find device reference for watch memory capabilities"

## Management Commands (Claude Code)

```bash
# List all configured MCP servers
claude mcp list

# Get details about the server
claude mcp get garmin-documentation

# Remove the server
claude mcp remove garmin-documentation
```

## Documentation Coverage

### API Modules (33 modules, 282 classes, 27+ module functions)
The server provides access to all major Garmin Connect IQ modules including:

- **Activity**: Activity recording and monitoring
- **ActivityMonitor**: Daily activity metrics  
- **ANT**: ANT wireless communication
- **Application**: App framework and lifecycle
- **BluetoothLowEnergy**: BLE communication  
- **Complications**: Watch face complications (✅ Available in SDK 6.x+, not 4.2+ as previously confusing)
- **Cryptography**: Encryption, key generation, createPublicKey(), randomBytes()
- **Graphics**: Drawing and rendering, createBufferedBitmap(), createColor()
- **Math**: Statistical functions like stdev(), mean(), variance(), plus trigonometric functions
- **Position**: GPS and location services
- **Sensor**: Device sensor access
- **System**: Core system functions (including round device detection)
- **WatchUi**: User interface components
- **And 20 more modules...**

### Additional Resources (1,407+ files total)
- **Programming Guides**: Getting started tutorials, app types, debugging, compiler documentation
- **Device Reference**: Hardware specifications, memory limits, capabilities for all supported devices
- **FAQ Resources**: Troubleshooting guides for fonts, graphics, memory, music, maps, and common issues
- **Personality Library**: UI patterns, iconography, colors, confirmations for consistent app design  
- **UX Guidelines**: User experience best practices and design patterns

### Version Accuracy
✅ **Fixed Major Issue**: API Level confusion resolved  
✅ **Proper Mapping**: API Level 4.2.0 correctly mapped to ≈ SDK 6.x+  
✅ **SDK 7 Support Confirmed**: Complications, Activity info, round devices all properly supported

## License

MIT
