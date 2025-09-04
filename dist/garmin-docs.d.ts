export interface SearchResult {
    type: 'module' | 'class' | 'function' | 'property' | 'constant';
    name: string;
    fullName: string;
    description: string;
    module?: string;
    className?: string;
    filePath: string;
}
export declare class GarminDocumentationService {
    private parser;
    private docIndex;
    private readonly SDK_VERSION;
    constructor();
    private ensureIndexLoaded;
    searchDocs(query: string, category?: string): Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
    getModuleDetails(moduleName: string): Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
    getClassDetails(className: string, moduleName?: string): Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
    listModules(): Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
    getApiExamples(topic: string): Promise<{
        content: {
            type: string;
            text: string;
        }[];
    }>;
    private formatSearchResults;
    private formatModuleDetails;
    private formatClassDetails;
}
//# sourceMappingURL=garmin-docs.d.ts.map