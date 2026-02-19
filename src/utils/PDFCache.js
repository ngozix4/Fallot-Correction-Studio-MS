// utils/PDFCache.js
class PDFCache {
  constructor() {
    this.cache = new Map();
    this.maxCacheSize = 10; // Cache last 10 PDFs
  }

  set(invoiceId, pdfUri) {
    // Remove oldest if cache is full
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(invoiceId.toString(), {
      uri: pdfUri,
      timestamp: Date.now()
    });
  }

  get(invoiceId) {
    const cached = this.cache.get(invoiceId.toString());
    if (cached) {
      // Check if cached less than 1 hour ago
      const oneHour = 60 * 60 * 1000;
      if (Date.now() - cached.timestamp < oneHour) {
        return cached.uri;
      } else {
        // Remove stale cache
        this.cache.delete(invoiceId.toString());
      }
    }
    return null;
  }

  clear() {
    this.cache.clear();
  }
}

export default new PDFCache();