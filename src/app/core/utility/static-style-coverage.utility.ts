const IGNORED_CLASS_PREFIXES = ['ng-', 'cdk-', 'mat-', 'zlp-'];
const IGNORED_CLASS_NAMES = new Set(['btnIcon']);

export function hasStaticStyleCoverage(root: Element, documentRef: Document = root.ownerDocument): boolean {
    const requiredClasses = collectRequiredClasses(root);
    if (requiredClasses.length === 0) {
        return true;
    }

    const stylesheetText = collectStylesheetText(documentRef);
    if (!stylesheetText.trim()) {
        return false;
    }

    return requiredClasses.every((className) => hasSelectorForClass(stylesheetText, className));
}

function collectRequiredClasses(root: Element): readonly string[] {
    const classes = new Set<string>();
    collectElementClasses(root, classes);
    root.querySelectorAll('[class]').forEach((element) => collectElementClasses(element, classes));
    return Array.from(classes).filter(shouldRequireStaticCoverage);
}

function collectElementClasses(element: Element, target: Set<string>): void {
    element.classList.forEach((className) => {
        const normalized = String(className ?? '').trim();
        if (normalized) {
            target.add(normalized);
        }
    });
}

function shouldRequireStaticCoverage(className: string): boolean {
    return !IGNORED_CLASS_NAMES.has(className)
        && !IGNORED_CLASS_PREFIXES.some((prefix) => className.startsWith(prefix));
}

function collectStylesheetText(documentRef: Document): string {
    const chunks: string[] = [];
    Array.from(documentRef.styleSheets).forEach((sheet) => collectRulesText(sheet, chunks));
    return chunks.join('\n');
}

function collectRulesText(sheet: CSSStyleSheet, target: string[]): void {
    let rules: CSSRuleList | undefined;
    try {
        rules = sheet.cssRules;
    } catch {
        return;
    }

    Array.from(rules ?? []).forEach((rule) => {
        const nestedRules = (rule as CSSGroupingRule).cssRules;
        if (nestedRules && nestedRules.length > 0) {
            Array.from(nestedRules).forEach((nestedRule) => target.push(String(nestedRule.cssText ?? '')));
            return;
        }

        target.push(String(rule.cssText ?? ''));
    });
}

function hasSelectorForClass(stylesheetText: string, className: string): boolean {
    const escaped = cssEscape(className);
    return stylesheetText.includes(`.${ escaped }`) || stylesheetText.includes(`.${ className }`);
}

function cssEscape(value: string): string {
    const escapeFn = globalThis.CSS?.escape;
    return typeof escapeFn === 'function'
        ? escapeFn(value)
        : value.replace(/[^a-zA-Z0-9_-]/g, (entry) => `\\${ entry }`);
}
