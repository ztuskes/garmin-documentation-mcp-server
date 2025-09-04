import * as fs from 'fs';
import * as path from 'path';
import * as cheerio from 'cheerio';
export class LocalDocumentationParser {
    docsPath;
    docIndex;
    constructor(docsPath = './docs') {
        this.docsPath = path.resolve(docsPath);
        this.docIndex = {
            modules: new Map(),
            classes: new Map(),
            methods: new Map(),
            searchIndex: new Map()
        };
    }
    async buildIndex() {
        console.error('Building documentation index...');
        // Parse class list to get overview
        await this.parseClassList();
        // Parse all Toybox modules
        await this.parseToyboxModules();
        // Build search index
        this.buildSearchIndex();
        console.error(`Index built: ${this.docIndex.modules.size} modules, ${this.docIndex.classes.size} classes`);
        return this.docIndex;
    }
    async parseClassList() {
        const classListPath = path.join(this.docsPath, 'class_list.html');
        if (!fs.existsSync(classListPath))
            return;
        const html = fs.readFileSync(classListPath, 'utf8');
        const $ = cheerio.load(html);
        // Extract module and class hierarchy
        $('#full_list li').each((_, element) => {
            const $item = $(element);
            const link = $item.find('> .item .object_link a');
            if (link.length === 0)
                return;
            const href = link.attr('href');
            const title = link.attr('title');
            const name = link.text().trim();
            if (!href || !title)
                return;
            // Determine type from title
            if (title.includes('(Module)')) {
                // This is a module entry
                const fullName = href.replace('./', '').replace('.html', '').replace('/', '.');
                // We'll parse the actual module files later
            }
        });
    }
    async parseToyboxModules() {
        const toyboxPath = path.join(this.docsPath, 'Toybox');
        if (!fs.existsSync(toyboxPath))
            return;
        const items = fs.readdirSync(toyboxPath);
        for (const item of items) {
            const itemPath = path.join(toyboxPath, item);
            const stat = fs.statSync(itemPath);
            if (stat.isFile() && item.endsWith('.html')) {
                // This is a module file
                const moduleName = item.replace('.html', '');
                await this.parseModule(itemPath, moduleName);
            }
            else if (stat.isDirectory()) {
                // This might contain class files
                await this.parseModuleDirectory(itemPath, item);
            }
        }
    }
    async parseModule(filePath, moduleName) {
        const html = fs.readFileSync(filePath, 'utf8');
        const $ = cheerio.load(html);
        const fullName = `Toybox.${moduleName}`;
        // Extract module description
        let description = '';
        const descDiv = $('.docstring .discussion p').first();
        if (descDiv.length) {
            description = descDiv.text().trim();
        }
        // Extract since version
        let since = '';
        const sinceDiv = $('.since p').first();
        if (sinceDiv.length) {
            since = sinceDiv.text().trim();
        }
        // Extract classes
        const classes = [];
        $('.classes .type a').each((_, element) => {
            const link = $(element);
            const className = link.text().trim();
            const href = link.attr('href');
            if (href) {
                const classPath = path.resolve(path.dirname(filePath), href.replace('../', ''));
                // We'll parse class files separately
            }
        });
        // Extract constants
        const constants = [];
        $('.constants .enumTable tr').each((_, element) => {
            const $row = $(element);
            if ($row.hasClass('enumTableOdd') || $row.hasClass('enumTableEven')) {
                const name = $row.find('td:nth-child(1)').text().trim();
                const value = $row.find('td:nth-child(2)').text().trim();
                const since = $row.find('td:nth-child(3)').text().trim();
                const description = $row.find('td:nth-child(4)').text().trim();
                if (name && value) {
                    constants.push({ name, value, description, since });
                }
            }
        });
        // Extract module-level methods
        const methods = [];
        await this.parseMethodsFromPage($, methods);
        const parsedModule = {
            name: moduleName,
            fullName,
            description,
            since,
            classes,
            constants,
            methods,
            filePath
        };
        this.docIndex.modules.set(fullName, parsedModule);
    }
    async parseModuleDirectory(dirPath, moduleName) {
        const files = fs.readdirSync(dirPath);
        for (const file of files) {
            if (file.endsWith('.html')) {
                const className = file.replace('.html', '');
                const classPath = path.join(dirPath, file);
                await this.parseClass(classPath, className, moduleName);
            }
        }
    }
    async parseClass(filePath, className, moduleName) {
        if (!fs.existsSync(filePath))
            return;
        const html = fs.readFileSync(filePath, 'utf8');
        const $ = cheerio.load(html);
        const fullName = `Toybox.${moduleName}.${className}`;
        // Extract class description
        let description = '';
        const descDiv = $('.docstring .discussion p').first();
        if (descDiv.length) {
            description = descDiv.text().trim();
        }
        // Extract since version
        let since = '';
        const sinceDiv = $('.since p').first();
        if (sinceDiv.length) {
            since = sinceDiv.text().trim();
        }
        // Extract methods
        const methods = [];
        const constructors = [];
        const properties = [];
        // Parse method sections
        $('.method_details .method_detail').each((_, element) => {
            const method = this.parseMethodDetail($, $(element));
            if (method) {
                if (method.name === 'initialize' || method.name === className) {
                    constructors.push(method);
                }
                else {
                    methods.push(method);
                }
            }
        });
        // Parse property sections
        $('.attribute_details .attribute_detail').each((_, element) => {
            const property = this.parsePropertyDetail($, $(element));
            if (property) {
                properties.push(property);
            }
        });
        const parsedClass = {
            name: className,
            fullName,
            module: `Toybox.${moduleName}`,
            description,
            since,
            methods,
            properties,
            constructors,
            filePath
        };
        this.docIndex.classes.set(fullName, parsedClass);
        // Add methods to method index
        const allMethods = [...methods, ...constructors];
        if (allMethods.length > 0) {
            this.docIndex.methods.set(fullName, allMethods);
        }
    }
    parseMethodDetail($, $detail) {
        const signature = $detail.find('.signature').first();
        if (!signature.length)
            return null;
        const methodName = signature.find('strong').text().trim();
        if (!methodName)
            return null;
        // Extract description
        const description = $detail.find('.docstring .discussion p').first().text().trim();
        // Extract parameters
        const parameters = [];
        $detail.find('.tags .param').each((_, paramElement) => {
            const $param = $(paramElement);
            const name = $param.find('.name').text().trim();
            const type = $param.find('.type').text().trim();
            const desc = $param.find('.discussion').text().trim();
            if (name) {
                parameters.push({
                    name,
                    type: type || 'Object',
                    description: desc,
                    optional: desc.toLowerCase().includes('optional')
                });
            }
        });
        // Extract return type and description
        let returnType = '';
        let returnDescription = '';
        const returnTag = $detail.find('.tags .return').first();
        if (returnTag.length) {
            returnType = returnTag.find('.type').text().trim() || 'Object';
            returnDescription = returnTag.find('.discussion').text().trim();
        }
        // Extract since version
        let since = '';
        const sinceDiv = $detail.find('.since p').first();
        if (sinceDiv.length) {
            since = sinceDiv.text().trim();
        }
        // Extract examples
        const examples = [];
        $detail.find('.example').each((_, exampleElement) => {
            const code = $(exampleElement).find('code, pre').text().trim();
            if (code) {
                examples.push(code);
            }
        });
        return {
            name: methodName,
            fullName: `${methodName}`, // Will be prefixed with class name when stored
            description,
            parameters,
            returnType,
            returnDescription,
            since,
            isStatic: signature.text().includes('static'),
            visibility: 'public', // Default, could be parsed from docs
            examples
        };
    }
    parsePropertyDetail($, $detail) {
        const signature = $detail.find('.signature').first();
        if (!signature.length)
            return null;
        const propertyName = signature.find('strong').text().trim();
        if (!propertyName)
            return null;
        const description = $detail.find('.docstring .discussion p').first().text().trim();
        const type = signature.find('.type').text().trim() || 'Object';
        let since = '';
        const sinceDiv = $detail.find('.since p').first();
        if (sinceDiv.length) {
            since = sinceDiv.text().trim();
        }
        return {
            name: propertyName,
            type,
            description,
            since,
            isStatic: signature.text().includes('static'),
            visibility: 'public'
        };
    }
    async parseMethodsFromPage($, methods) {
        // Parse module-level methods if any
        $('.method_details .method_detail').each((_, element) => {
            const method = this.parseMethodDetail($, $(element));
            if (method) {
                methods.push(method);
            }
        });
    }
    buildSearchIndex() {
        // Build search index for fast lookups
        const searchEntries = [];
        // Add modules to search index
        for (const [fullName, module] of this.docIndex.modules) {
            searchEntries.push({
                type: 'module',
                name: module.name,
                fullName: module.fullName,
                description: module.description,
                filePath: module.filePath
            });
            // Add constants
            for (const constant of module.constants) {
                searchEntries.push({
                    type: 'constant',
                    name: constant.name,
                    fullName: `${module.fullName}.${constant.name}`,
                    description: constant.description,
                    module: module.fullName,
                    filePath: module.filePath
                });
            }
        }
        // Add classes to search index
        for (const [fullName, cls] of this.docIndex.classes) {
            searchEntries.push({
                type: 'class',
                name: cls.name,
                fullName: cls.fullName,
                description: cls.description,
                module: cls.module,
                filePath: cls.filePath
            });
            // Add methods
            for (const method of cls.methods) {
                searchEntries.push({
                    type: 'method',
                    name: method.name,
                    fullName: `${cls.fullName}.${method.name}`,
                    description: method.description,
                    module: cls.module,
                    className: cls.name,
                    filePath: cls.filePath
                });
            }
            // Add properties
            for (const property of cls.properties) {
                searchEntries.push({
                    type: 'property',
                    name: property.name,
                    fullName: `${cls.fullName}.${property.name}`,
                    description: property.description,
                    module: cls.module,
                    className: cls.name,
                    filePath: cls.filePath
                });
            }
        }
        // Group entries by search terms for fast lookup
        for (const entry of searchEntries) {
            // Add by name (case insensitive)
            const lowerName = entry.name.toLowerCase();
            if (!this.docIndex.searchIndex.has(lowerName)) {
                this.docIndex.searchIndex.set(lowerName, []);
            }
            this.docIndex.searchIndex.get(lowerName).push(entry);
            // Add by keywords in description
            const words = entry.description.toLowerCase().split(/\s+/);
            for (const word of words) {
                if (word.length > 3) { // Only index meaningful words
                    if (!this.docIndex.searchIndex.has(word)) {
                        this.docIndex.searchIndex.set(word, []);
                    }
                    const entries = this.docIndex.searchIndex.get(word);
                    if (!entries.find(e => e.fullName === entry.fullName)) {
                        entries.push(entry);
                    }
                }
            }
        }
    }
    getIndex() {
        return this.docIndex;
    }
}
//# sourceMappingURL=doc-parser.js.map