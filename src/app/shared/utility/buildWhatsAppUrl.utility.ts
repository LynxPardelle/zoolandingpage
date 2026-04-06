export function buildWhatsAppUrl(phone: string, message?: string): string {
    const digits = (phone || '').replace(/[^\d]/g, '');
    if (!digits) return '';
    const base = `https://wa.me/${ digits }`;
    if (!message) return base;
    return `${ base }?text=${ encodeURIComponent(message) }`;
}
