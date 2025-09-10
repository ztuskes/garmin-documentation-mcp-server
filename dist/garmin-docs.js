import { LocalDocumentationParser } from './doc-parser.js';
import * as fs from 'fs';
import * as path from 'path';
export class GarminDocumentationService {
    parser;
    docIndex = null;
    SDK_VERSION = '8.2.3';
    guideIndex = null;
    constructor() {
        this.parser = new LocalDocumentationParser('./docs');
    }
    async ensureIndexLoaded() {
        if (this.docIndex === null) {
            this.docIndex = await this.parser.buildIndex();
        }
        if (this.guideIndex === null) {
            await this.buildGuideIndex();
        }
    }
    async buildGuideIndex() {
        this.guideIndex = new Map();
        // Index device reference docs
        const deviceRefPath = path.join('./docs/resources/device-reference');
        if (fs.existsSync(deviceRefPath)) {
            const files = fs.readdirSync(deviceRefPath);
            for (const file of files) {
                if (file.endsWith('.png') || file.endsWith('.jpg')) {
                    this.guideIndex.set(`device-reference:${file}`, {
                        type: 'device-reference',
                        title: file.replace(/\.(png|jpg)$/, '').replace(/_/g, ' '),
                        path: path.join(deviceRefPath, file),
                        category: 'device-reference'
                    });
                }
            }
        }
        // Index programming guides
        const guidesPath = path.join('./docs/docs');
        if (fs.existsSync(guidesPath)) {
            await this.indexGuidesRecursively(guidesPath, '');
        }
        // Index FAQ resources
        const faqPath = path.join('./docs/resources/faq');
        if (fs.existsSync(faqPath)) {
            const files = fs.readdirSync(faqPath);
            for (const file of files) {
                this.guideIndex.set(`faq:${file}`, {
                    type: 'faq',
                    title: file.replace(/\.(png|jpg)$/, '').replace(/_/g, ' '),
                    path: path.join(faqPath, file),
                    category: 'faq'
                });
            }
        }
    }
    async indexGuidesRecursively(dirPath, category) {
        if (!fs.existsSync(dirPath))
            return;
        const items = fs.readdirSync(dirPath);
        for (const item of items) {
            const itemPath = path.join(dirPath, item);
            const stat = fs.statSync(itemPath);
            if (stat.isFile() && item.endsWith('.html')) {
                const key = `guide:${category}:${item}`;
                this.guideIndex.set(key, {
                    type: 'guide',
                    title: item.replace('.html', '').replace(/_/g, ' '),
                    path: itemPath,
                    category: category || path.basename(dirPath),
                    htmlFile: item
                });
            }
            else if (stat.isDirectory()) {
                const subCategory = category ? `${category}/${item}` : item;
                await this.indexGuidesRecursively(itemPath, subCategory);
            }
        }
    }
    async searchDocs(query, category = 'all') {
        await this.ensureIndexLoaded();
        if (!this.docIndex) {
            return {
                content: [{ type: 'text', text: 'Documentation index not available' }]
            };
        }
        const results = [];
        const lowerQuery = query.toLowerCase();
        // Search in the comprehensive search index
        const searchEntries = this.docIndex.searchIndex.get(lowerQuery) || [];
        // Also search for partial matches
        for (const [term, entries] of this.docIndex.searchIndex) {
            if (term.includes(lowerQuery) || lowerQuery.includes(term)) {
                searchEntries.push(...entries);
            }
        }
        // Enhanced fuzzy search - split query into words and search each
        const queryWords = lowerQuery.split(/\s+/).filter(word => word.length > 2);
        for (const word of queryWords) {
            for (const [term, entries] of this.docIndex.searchIndex) {
                if (term.includes(word) && !searchEntries.some(entry => entries.some(newEntry => newEntry.fullName === entry.fullName))) {
                    searchEntries.push(...entries);
                }
            }
        }
        // Search in guide index as well for comprehensive results
        if (this.guideIndex) {
            for (const [key, item] of this.guideIndex) {
                if (item.title.toLowerCase().includes(lowerQuery) ||
                    item.category.toLowerCase().includes(lowerQuery)) {
                    searchEntries.push({
                        type: item.type === 'guide' ? 'module' : 'property',
                        name: item.title,
                        fullName: `Guide: ${item.title}`,
                        description: `${item.type} resource in ${item.category}`,
                        filePath: item.path,
                        module: item.category
                    });
                }
            }
        }
        // Filter by category and convert to SearchResult
        const uniqueEntries = new Map();
        for (const entry of searchEntries) {
            if (category === 'all' ||
                (category === 'module' && entry.type === 'module') ||
                (category === 'class' && entry.type === 'class') ||
                (category === 'function' && entry.type === 'method') ||
                (category === 'property' && (entry.type === 'property' || entry.type === 'constant'))) {
                uniqueEntries.set(entry.fullName, entry);
            }
        }
        // Convert to SearchResult format
        for (const entry of uniqueEntries.values()) {
            results.push({
                type: entry.type === 'method' ? 'function' : entry.type,
                name: entry.name,
                fullName: entry.fullName,
                description: entry.description,
                module: entry.module,
                className: entry.className,
                filePath: entry.filePath
            });
        }
        // Sort results by relevance (exact matches first, then by type)
        results.sort((a, b) => {
            const aExact = a.name.toLowerCase() === lowerQuery ? 1 : 0;
            const bExact = b.name.toLowerCase() === lowerQuery ? 1 : 0;
            if (aExact !== bExact)
                return bExact - aExact;
            const typeOrder = { module: 0, class: 1, function: 2, property: 3, constant: 4 };
            return typeOrder[a.type] - typeOrder[b.type];
        });
        return {
            content: [
                {
                    type: 'text',
                    text: results.length > 0
                        ? `Found ${results.length} result(s) for "${query}" in SDK ${this.SDK_VERSION}:\n\n${this.formatSearchResults(results)}\n\n💡 **Note**: "API Level" refers to internal Garmin versioning, not SDK version. API Level 4.2.0 ≈ SDK 6.x+, so features are available much earlier than the API Level number suggests.`
                        : `No results found for "${query}". Try searching for module names like "System", "Activity", "WatchUi", or general terms like "bluetooth", "sensor", "graphics".`
                }
            ]
        };
    }
    async getModuleDetails(moduleName) {
        await this.ensureIndexLoaded();
        if (!this.docIndex) {
            return {
                content: [{ type: 'text', text: 'Documentation index not available' }]
            };
        }
        // Find the module (try both with and without Toybox prefix)
        const fullModuleName = moduleName.startsWith('Toybox.') ? moduleName : `Toybox.${moduleName}`;
        const module = this.docIndex.modules.get(fullModuleName);
        if (!module) {
            const availableModules = Array.from(this.docIndex.modules.keys())
                .map(name => name.replace('Toybox.', ''))
                .join(', ');
            return {
                content: [
                    {
                        type: 'text',
                        text: `Module "${moduleName}" not found. Available modules: ${availableModules}`
                    }
                ]
            };
        }
        // Get classes in this module
        const moduleClasses = [];
        for (const [fullName, cls] of this.docIndex.classes) {
            if (cls.module === fullModuleName) {
                moduleClasses.push(cls.name);
            }
        }
        return {
            content: [
                {
                    type: 'text',
                    text: this.formatModuleDetails(module, moduleClasses)
                }
            ]
        };
    }
    async getClassDetails(className, moduleName) {
        await this.ensureIndexLoaded();
        if (!this.docIndex) {
            return {
                content: [{ type: 'text', text: 'Documentation index not available' }]
            };
        }
        // Find the class
        let targetClass = null;
        if (moduleName) {
            const fullModuleName = moduleName.startsWith('Toybox.') ? moduleName : `Toybox.${moduleName}`;
            const fullClassName = `${fullModuleName}.${className}`;
            targetClass = this.docIndex.classes.get(fullClassName) || null;
        }
        else {
            // Search through all classes for the name
            for (const [fullName, cls] of this.docIndex.classes) {
                if (cls.name === className) {
                    targetClass = cls;
                    break;
                }
            }
        }
        if (!targetClass) {
            const availableClasses = Array.from(this.docIndex.classes.keys())
                .map(name => name.split('.').pop())
                .filter(name => name)
                .slice(0, 20)
                .join(', ');
            return {
                content: [
                    {
                        type: 'text',
                        text: `Class "${className}" not found${moduleName ? ` in module "${moduleName}"` : ''}. Some available classes: ${availableClasses}...`
                    }
                ]
            };
        }
        return {
            content: [
                {
                    type: 'text',
                    text: this.formatClassDetails(targetClass)
                }
            ]
        };
    }
    async listModules() {
        await this.ensureIndexLoaded();
        if (!this.docIndex) {
            return {
                content: [{ type: 'text', text: 'Documentation index not available' }]
            };
        }
        const modules = Array.from(this.docIndex.modules.values())
            .sort((a, b) => a.name.localeCompare(b.name));
        const moduleList = modules.map(module => {
            const classCount = Array.from(this.docIndex.classes.values())
                .filter(cls => cls.module === module.fullName).length;
            const constantCount = module.constants.length;
            return `**${module.name}**: ${module.description}\n` +
                `   📦 Classes: ${classCount} | 🔢 Constants: ${constantCount}` +
                (module.since ? ` | 📅 Since: ${module.since}` : '');
        }).join('\n\n');
        return {
            content: [
                {
                    type: 'text',
                    text: `Garmin Connect IQ SDK ${this.SDK_VERSION} - Available Modules (${modules.length}):\n\n${moduleList}\n\nUse \`get_module_details\` with any module name for detailed information.`
                }
            ]
        };
    }
    async getApiExamples(topic) {
        await this.ensureIndexLoaded();
        if (!this.docIndex) {
            return {
                content: [{ type: 'text', text: 'Documentation index not available' }]
            };
        }
        const examples = {
            'activity monitoring': `
// Activity Monitoring Example (SDK ${this.SDK_VERSION})
using Toybox.ActivityMonitor;
using Toybox.System;

class MyApp extends Application.AppBase {
    function onStart() {
        var info = ActivityMonitor.getInfo();
        System.println("Steps: " + info.steps);
        System.println("Calories: " + info.calories);
        System.println("Distance: " + info.distance);
    }
}`,
            'bluetooth': `
// Bluetooth Low Energy Example (SDK ${this.SDK_VERSION})
using Toybox.BluetoothLowEnergy as Ble;
using Toybox.System;

class BleManager {
    function startScan() {
        if (Ble has :setScanState) {
            Ble.setScanState(Ble.SCAN_STATE_SCANNING);
        }
    }
    
    function onScanResults(scanResults) {
        for (var i = 0; i < scanResults.size(); i++) {
            var device = scanResults[i];
            System.println("Found device: " + device.getName());
        }
    }
}`,
            'watchface': `
// Watch Face Example (SDK ${this.SDK_VERSION})
using Toybox.WatchUi;
using Toybox.Graphics;
using Toybox.System;
using Toybox.Lang;

class MyWatchFace extends WatchUi.WatchFace {
    function onUpdate(dc) {
        dc.setColor(Graphics.COLOR_WHITE, Graphics.COLOR_BLACK);
        dc.clear();
        
        var clockTime = System.getClockTime();
        var timeString = Lang.format("$1$:$2$", [
            clockTime.hour.format("%02d"),
            clockTime.min.format("%02d")
        ]);
        
        dc.drawText(dc.getWidth()/2, dc.getHeight()/2, 
                   Graphics.FONT_LARGE, timeString, 
                   Graphics.TEXT_JUSTIFY_CENTER);
    }
}`,
            'sensor': `
// Sensor Access Example (SDK ${this.SDK_VERSION})
using Toybox.Sensor;
using Toybox.System;

class SensorApp {
    function initialize() {
        if (Sensor has :getHeartRateHistory) {
            Sensor.setEnabledSensors([Sensor.SENSOR_HEARTRATE]);
            Sensor.enableSensorEvents(method(:onSensorEvent));
        }
    }
    
    function onSensorEvent(sensorData) {
        if (sensorData.heartRate != null) {
            System.println("Heart Rate: " + sensorData.heartRate);
        }
    }
}`,
            'gps': `
// GPS/Position Example (SDK ${this.SDK_VERSION})
using Toybox.Position;
using Toybox.System;

class GpsApp {
    function initialize() {
        Position.enableLocationEvents(Position.LOCATION_CONTINUOUS, 
                                    method(:onPosition));
    }
    
    function onPosition(info) {
        if (info.accuracy == Position.QUALITY_GOOD) {
            var location = info.position.toDegrees();
            System.println("Lat: " + location[0] + ", Lon: " + location[1]);
        }
    }
}`
        };
        const lowerTopic = topic.toLowerCase();
        let example = '';
        let exampleTitle = '';
        // Search for examples from actual API methods if available
        for (const [_, cls] of this.docIndex.classes) {
            for (const method of cls.methods) {
                if (method.examples.length > 0) {
                    const methodDesc = method.description.toLowerCase();
                    if (methodDesc.includes(lowerTopic) || method.name.toLowerCase().includes(lowerTopic)) {
                        example = method.examples[0];
                        exampleTitle = `${cls.name}.${method.name}()`;
                        break;
                    }
                }
            }
            if (example)
                break;
        }
        // Fall back to predefined examples
        if (!example) {
            for (const [key, value] of Object.entries(examples)) {
                if (lowerTopic.includes(key) || key.includes(lowerTopic)) {
                    example = value;
                    exampleTitle = key;
                    break;
                }
            }
        }
        return {
            content: [
                {
                    type: 'text',
                    text: example
                        ? `Example code for "${exampleTitle || topic}":\n\`\`\`monkey-c${example}\n\`\`\``
                        : `No specific example found for "${topic}". Available example topics: ${Object.keys(examples).join(', ')}, position`
                }
            ]
        };
    }
    formatSearchResults(results) {
        return results.map(result => {
            const moduleText = result.module ? ` (in ${result.module.replace('Toybox.', '')})` : '';
            const classText = result.className ? ` → ${result.className}` : '';
            const typeIcon = {
                module: '📦',
                class: '📝',
                function: '⚙️',
                property: '🔢',
                constant: '🔢'
            }[result.type] || '📄';
            return `${typeIcon} **${result.name}**${moduleText}${classText}\n   ${result.description}\n   📄 ${result.fullName}`;
        }).join('\n\n');
    }
    formatModuleDetails(module, classes) {
        let details = `# ${module.name} Module (SDK ${this.SDK_VERSION})\n\n${module.description}\n\n`;
        if (module.since) {
            const versionInfo = this.formatVersionInfo(module.since);
            details += `📅 **Since**: ${versionInfo}\n\n`;
        }
        if (classes.length > 0) {
            details += `## Classes (${classes.length})\n${classes.map(c => `- **${c}**`).join('\n')}\n\n`;
        }
        if (module.constants.length > 0) {
            details += `## Constants (${module.constants.length})\n`;
            module.constants.slice(0, 10).forEach(constant => {
                details += `- **${constant.name}**: ${constant.value}${constant.description ? ` - ${constant.description}` : ''}\n`;
            });
            if (module.constants.length > 10) {
                details += `... and ${module.constants.length - 10} more constants\n`;
            }
            details += '\n';
        }
        if (module.methods.length > 0) {
            details += `## Module Functions (${module.methods.length})\n${module.methods.map(f => `- **${f.name}()**`).join('\n')}\n\n`;
        }
        details += `📄 **Full Name**: ${module.fullName}\n`;
        details += `Use \`get_class_details\` with specific class names for detailed information.`;
        return details;
    }
    formatClassDetails(cls) {
        let details = `# ${cls.name} Class (SDK ${this.SDK_VERSION})\n\n${cls.description}\n\n`;
        details += `📦 **Module**: ${cls.module.replace('Toybox.', '')}\n`;
        if (cls.since) {
            const versionInfo = this.formatVersionInfo(cls.since);
            details += `📅 **Since**: ${versionInfo}\n`;
        }
        details += `\n`;
        if (cls.constructors.length > 0) {
            details += `## Constructors (${cls.constructors.length})\n`;
            cls.constructors.forEach(constructor => {
                const params = constructor.parameters.map(p => `${p.name}: ${p.type}`).join(', ');
                details += `- **${constructor.name}**(${params})${constructor.description ? ` - ${constructor.description}` : ''}\n`;
            });
            details += '\n';
        }
        if (cls.properties.length > 0) {
            details += `## Properties (${cls.properties.length})\n`;
            cls.properties.slice(0, 15).forEach(property => {
                details += `- **${property.name}**: ${property.type}${property.description ? ` - ${property.description}` : ''}\n`;
            });
            if (cls.properties.length > 15) {
                details += `... and ${cls.properties.length - 15} more properties\n`;
            }
            details += '\n';
        }
        if (cls.methods.length > 0) {
            details += `## Methods (${cls.methods.length})\n`;
            cls.methods.slice(0, 15).forEach(method => {
                const params = method.parameters.map(p => `${p.name}: ${p.type}`).join(', ');
                const returnType = method.returnType ? ` → ${method.returnType}` : '';
                details += `- **${method.name}**(${params})${returnType}${method.description ? ` - ${method.description}` : ''}\n`;
            });
            if (cls.methods.length > 15) {
                details += `... and ${cls.methods.length - 15} more methods\n`;
            }
            details += '\n';
        }
        details += `📄 **Full Name**: ${cls.fullName}`;
        return details;
    }
    async searchDeviceReference(query, deviceType) {
        await this.ensureIndexLoaded();
        if (!this.guideIndex) {
            return {
                content: [{ type: 'text', text: 'Device reference index not available' }]
            };
        }
        const results = [];
        const lowerQuery = query.toLowerCase();
        // Search device reference materials
        for (const [key, item] of this.guideIndex) {
            if (item.type === 'device-reference') {
                const title = item.title.toLowerCase();
                const path = item.path.toLowerCase();
                if (title.includes(lowerQuery) || path.includes(lowerQuery)) {
                    if (!deviceType || title.includes(deviceType.toLowerCase()) || path.includes(deviceType.toLowerCase())) {
                        results.push(item);
                    }
                }
            }
        }
        if (results.length === 0) {
            const availableCategories = Array.from(this.guideIndex.values())
                .filter(item => item.type === 'device-reference')
                .map(item => item.title)
                .slice(0, 10)
                .join(', ');
            return {
                content: [
                    {
                        type: 'text',
                        text: `No device reference found for "${query}". Available resources include: ${availableCategories}...`
                    }
                ]
            };
        }
        return {
            content: [
                {
                    type: 'text',
                    text: `Found ${results.length} device reference result(s) for "${query}":\n\n${this.formatGuideResults(results)}`
                }
            ]
        };
    }
    async getProgrammingGuide(topic) {
        await this.ensureIndexLoaded();
        if (!this.guideIndex) {
            return {
                content: [{ type: 'text', text: 'Programming guide index not available' }]
            };
        }
        const lowerTopic = topic.toLowerCase();
        const results = [];
        // Search programming guides
        for (const [key, item] of this.guideIndex) {
            if (item.type === 'guide') {
                const title = item.title.toLowerCase();
                const category = item.category.toLowerCase();
                if (title.includes(lowerTopic) || category.includes(lowerTopic)) {
                    results.push(item);
                }
            }
        }
        // Add predefined guide mappings for common topics
        const guideTopics = {
            'getting started': 'Connect_IQ_Basics/Getting_Started.html',
            'app types': 'Connect_IQ_Basics/App_Types.html',
            'first app': 'Connect_IQ_Basics/Your_First_App.html',
            'debugging': 'Debugging',
            'testing': 'Testing',
            'compiler': 'Monkey_C/Compiler_Options.html',
            'annotations': 'Monkey_C/Annotations.html'
        };
        if (results.length === 0 && guideTopics[lowerTopic]) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `Programming guide for "${topic}" can be found at: docs/docs/${guideTopics[lowerTopic]}\n\nThis covers fundamental concepts for Connect IQ development.`
                    }
                ]
            };
        }
        if (results.length === 0) {
            const availableTopics = Object.keys(guideTopics).join(', ');
            return {
                content: [
                    {
                        type: 'text',
                        text: `No programming guide found for "${topic}". Available topics: ${availableTopics}`
                    }
                ]
            };
        }
        return {
            content: [
                {
                    type: 'text',
                    text: `Found ${results.length} programming guide(s) for "${topic}":\n\n${this.formatGuideResults(results)}`
                }
            ]
        };
    }
    async searchFaq(query) {
        await this.ensureIndexLoaded();
        if (!this.guideIndex) {
            return {
                content: [{ type: 'text', text: 'FAQ index not available' }]
            };
        }
        const results = [];
        const lowerQuery = query.toLowerCase();
        // Search FAQ resources
        for (const [key, item] of this.guideIndex) {
            if (item.type === 'faq') {
                const title = item.title.toLowerCase();
                if (title.includes(lowerQuery)) {
                    results.push(item);
                }
            }
        }
        // Add common FAQ topics
        const faqTopics = {
            'font': 'Font rendering and text display issues',
            'memory': 'Memory management and optimization',
            'storage': 'Data storage and persistence',
            'color': 'Color palette and display limitations',
            'music': 'Music control and audio playback',
            'map': 'Map integration and navigation',
            'cake': 'Image rendering and graphics optimization',
            'glyphs': 'Custom fonts and character rendering',
            'dithering': 'Image dithering and color reduction',
            'playback': 'Audio and media playback configuration'
        };
        if (results.length === 0) {
            const matchingTopic = Object.keys(faqTopics).find(topic => lowerQuery.includes(topic) || topic.includes(lowerQuery));
            if (matchingTopic) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `FAQ topic "${matchingTopic}": ${faqTopics[matchingTopic]}\n\nCheck docs/resources/faq/ for visual examples and detailed explanations.`
                        }
                    ]
                };
            }
            const availableTopics = Object.keys(faqTopics).join(', ');
            return {
                content: [
                    {
                        type: 'text',
                        text: `No FAQ found for "${query}". Common FAQ topics: ${availableTopics}`
                    }
                ]
            };
        }
        return {
            content: [
                {
                    type: 'text',
                    text: `Found ${results.length} FAQ result(s) for "${query}":\n\n${this.formatGuideResults(results)}`
                }
            ]
        };
    }
    formatVersionInfo(since) {
        // Handle API Level vs SDK version confusion
        if (since.includes('API Level')) {
            const apiLevel = since.match(/API Level ([\d.]+)/)?.[1];
            if (apiLevel) {
                // Map known API Levels to approximate SDK versions
                const apiToSdkMapping = {
                    '1.0.0': 'SDK 1.x+ (very early)',
                    '1.2.0': 'SDK 2.x+',
                    '2.0.0': 'SDK 3.x+',
                    '3.0.0': 'SDK 4.x+',
                    '4.0.0': 'SDK 5.x+',
                    '4.2.0': 'SDK 6.x+',
                    '5.0.0': 'SDK 7.x+',
                    '6.0.0': 'SDK 8.x+'
                };
                const sdkVersion = apiToSdkMapping[apiLevel];
                if (sdkVersion) {
                    return `${since} (≈ ${sdkVersion})`;
                }
                // For unknown API levels, provide general guidance
                const majorVersion = parseFloat(apiLevel);
                if (majorVersion <= 1.0) {
                    return `${since} (≈ SDK 1-2, very early)`;
                }
                else if (majorVersion <= 2.0) {
                    return `${since} (≈ SDK 3-4)`;
                }
                else if (majorVersion <= 4.0) {
                    return `${since} (≈ SDK 5-6)`;
                }
                else if (majorVersion <= 5.0) {
                    return `${since} (≈ SDK 7+)`;
                }
                else {
                    return `${since} (≈ SDK 8+)`;
                }
            }
        }
        return since;
    }
    formatGuideResults(results) {
        return results.map(item => {
            const typeIcons = {
                'device-reference': '📱',
                'guide': '📖',
                'faq': '❓'
            };
            const typeIcon = typeIcons[item.type] || '📄';
            return `${typeIcon} **${item.title}**\n   📁 Category: ${item.category}\n   📄 Path: ${item.path.replace('./docs/', '')}`;
        }).join('\n\n');
    }
}
//# sourceMappingURL=garmin-docs.js.map