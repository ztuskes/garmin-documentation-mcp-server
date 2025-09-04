export interface ParsedModule {
    name: string;
    fullName: string;
    description: string;
    since: string;
    classes: ParsedClass[];
    constants: ParsedConstant[];
    methods: ParsedMethod[];
    filePath: string;
}
export interface ParsedClass {
    name: string;
    fullName: string;
    module: string;
    description: string;
    since: string;
    methods: ParsedMethod[];
    properties: ParsedProperty[];
    constructors: ParsedMethod[];
    filePath: string;
}
export interface ParsedMethod {
    name: string;
    fullName: string;
    description: string;
    parameters: ParsedParameter[];
    returnType: string;
    returnDescription: string;
    since: string;
    isStatic: boolean;
    visibility: string;
    examples: string[];
}
export interface ParsedProperty {
    name: string;
    type: string;
    description: string;
    since: string;
    isStatic: boolean;
    visibility: string;
}
export interface ParsedParameter {
    name: string;
    type: string;
    description: string;
    optional: boolean;
}
export interface ParsedConstant {
    name: string;
    value: string;
    description: string;
    since: string;
}
export interface DocIndex {
    modules: Map<string, ParsedModule>;
    classes: Map<string, ParsedClass>;
    methods: Map<string, ParsedMethod[]>;
    searchIndex: Map<string, SearchEntry[]>;
}
export interface SearchEntry {
    type: 'module' | 'class' | 'method' | 'property' | 'constant';
    name: string;
    fullName: string;
    description: string;
    module?: string;
    className?: string;
    filePath: string;
}
export declare class LocalDocumentationParser {
    private docsPath;
    private docIndex;
    constructor(docsPath?: string);
    buildIndex(): Promise<DocIndex>;
    private parseClassList;
    private parseToyboxModules;
    private parseModule;
    private parseModuleDirectory;
    private parseClass;
    private parseMethodDetail;
    private parsePropertyDetail;
    private parseMethodsFromPage;
    private buildSearchIndex;
    getIndex(): DocIndex;
}
//# sourceMappingURL=doc-parser.d.ts.map