import * as Print from 'expo-print';
import { File, Directory, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import PDFCache from '../utils/PDFCache';
import { Platform, Image } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { Asset } from 'expo-asset';

class PDFService {
  constructor() {
    this.invoicesDir = null;
    this.initPromise = this.init();
    this.logoUri = null;
    this.logoInitPromise = this.initLogo();
  }

  async init() {
    try {
      const documentDir = Paths.document;
      this.invoicesDir = new Directory(documentDir, 'invoices');
      
      if (!this.invoicesDir.exists) {
        this.invoicesDir.create({ intermediates: true });
      }
      console.log('✅ PDF Service initialized');
    } catch (error) {
      console.error('❌ PDF Service init error:', error);
      throw error;
    }
  }

 async initLogo() {
  try {
    console.log('🟡 [DEBUG] Initializing logo...');
    
    // In production builds, we need to use expo-asset to properly load the image
    try {
      // Try to load using expo-asset first (works in both dev and prod)
      const logoModule = require('../../assets/images/fallot-logo.png');
      
      // Use expo-asset if available
      try {
        const { Asset } = require('expo-asset');
        const asset = Asset.fromModule(logoModule);
        await asset.downloadAsync();
        
        // For production, asset.localUri will have the file:// URI
        // For Expo Go, asset.uri will have the remote URL
        if (asset.localUri) {
          // Production - we have a local file
          console.log('🟡 [DEBUG] Loading logo from local asset:', asset.localUri);
          const base64 = await FileSystem.readAsStringAsync(asset.localUri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          this.logoBase64 = `data:image/png;base64,${base64}`;
          console.log('✅ Logo loaded from bundled asset');
          return;
        } else if (asset.uri) {
          // Expo Go - we have a remote URL
          console.log('🟡 [DEBUG] Loading logo from remote URI:', asset.uri);
          const response = await fetch(asset.uri);
          const blob = await response.blob();
          
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              this.logoBase64 = reader.result;
              console.log('✅ Logo loaded from remote URI');
              resolve();
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        }
      } catch (assetError) {
        console.warn('Expo-asset not available, trying fallback methods:', assetError);
      }
      
      // Fallback: Try to resolve as a static resource
      const logoSource = Image.resolveAssetSource(logoModule);
      console.log('🟡 [DEBUG] Logo source:', logoSource);
      
      if (logoSource && logoSource.uri) {
        // In production, this might be a bundled asset reference
        if (logoSource.uri.startsWith('asset:/') || logoSource.uri.includes('/assets/')) {
          console.log('🟡 [DEBUG] Bundled asset detected, attempting to load...');
          
          // For Android, try to read from the bundled assets
          if (Platform.OS === 'android') {
            try {
              // Try to construct a file path for bundled asset
              const assetPath = logoSource.uri.replace('asset:/', '');
              const bundledAssetUri = FileSystem.bundleDirectory + assetPath;
              
              const base64 = await FileSystem.readAsStringAsync(bundledAssetUri, {
                encoding: FileSystem.EncodingType.Base64,
              });
              this.logoBase64 = `data:image/png;base64,${base64}`;
              console.log('✅ Logo loaded from bundled asset path');
              return;
            } catch (fileError) {
              console.warn('Could not read bundled asset:', fileError);
            }
          }
        }
        
        // For development server URLs
        if (logoSource.uri.includes('://192.168.') || 
            logoSource.uri.includes('://localhost') || 
            logoSource.uri.includes('://127.0.0.1')) {
          
          console.log('🟡 [DEBUG] Development server URL detected');
          
          if (__DEV__) {
            try {
              const response = await fetch(logoSource.uri);
              const blob = await response.blob();
              
              return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                  this.logoBase64 = reader.result;
                  console.log('✅ Logo fetched from Metro server');
                  resolve();
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
              });
            } catch (fetchError) {
              console.warn('Could not fetch logo from Metro:', fetchError);
            }
          }
        }
      }
    } catch (error) {
      console.warn('Error in primary logo loading methods:', error);
    }
    
    // Ultimate fallback to text logo
    console.log('🟡 [DEBUG] Creating fallback text logo');
    this.logoBase64 = this.createTextLogo();
    console.log('✅ Created text-based logo as fallback');
    
  } catch (error) {
    console.error('❌ Error loading logo:', error);
    this.logoBase64 = this.createTextLogo();
  }
}

  // Create text-based logo as fallback
  createTextLogo() {
    const canvas = `
      <svg xmlns="http://www.w3.org/2000/svg" width="200" height="80">
        <style>
          .logo-text {
            font-family: Arial, sans-serif;
            font-weight: bold;
            fill: #6C63FF;
          }
          .logo-main {
            font-size: 28px;
            letter-spacing: 2px;
          }
          .logo-subtitle {
            font-size: 16px;
            letter-spacing: 1px;
          }
        </style>
        <rect width="200" height="80" rx="10" ry="10" fill="#f8f8f8" stroke="#6C63FF" stroke-width="2"/>
        <text x="100" y="35" text-anchor="middle" class="logo-text logo-main">FALLOT</text>
        <text x="100" y="60" text-anchor="middle" class="logo-text logo-subtitle">CORRECTION STUDIO</text>
      </svg>
    `;
    return `data:image/svg+xml;base64,${btoa(canvas)}`;
  }

  // Add this method to PDFService class
async forceRegenerateInvoicePDF(invoice, profilePictureUri = null) {
  await this.initPromise;
  await this.logoInitPromise;
  
  // Clear cache for this invoice
  const cacheKey = profilePictureUri ? `${invoice.id}_${profilePictureUri}` : invoice.id;
  PDFCache.clear(cacheKey);
  
  // Delete existing PDFs
  await this.deleteInvoicePDFs(invoice);
  
  // Generate fresh PDF
  return await this.createInvoicePDF(invoice, profilePictureUri);
}

 // Get logo as base64
async getLogoAsBase64() {
  await this.logoInitPromise;
  
  // If we already have base64, return it
  if (this.logoBase64) {
    return this.logoBase64;
  }
  
  // If we have a URL (development or production), try to fetch it
  if (this.logoUri && (this.logoUri.startsWith('http://') || this.logoUri.startsWith('https://'))) {
    try {
      console.log('🟡 [DEBUG] Fetching logo from URL:', this.logoUri);
      
      const response = await fetch(this.logoUri);
      const blob = await response.blob();
      
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          this.logoBase64 = reader.result;
          resolve(this.logoBase64);
        };
        reader.readAsDataURL(blob);
      });
      
    } catch (error) {
      console.warn('Error fetching logo from URL:', error);
      return this.createTextLogo();
    }
  }
  
  // If we have a file URI (production), try to convert it
  if (this.logoUri && this.logoUri.startsWith('file://')) {
    try {
      console.log('🟡 [DEBUG] Converting file URI to base64:', this.logoUri);
      
      const base64 = await FileSystem.readAsStringAsync(this.logoUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      this.logoBase64 = `data:image/png;base64,${base64}`;
      console.log('✅ Converted file URI to base64');
      return this.logoBase64;
      
    } catch (error) {
      console.warn('Error converting file URI to base64:', error);
      return this.createTextLogo();
    }
  }
  
  // Fallback to text logo
  console.log('🟡 Using fallback text logo');
  return this.createTextLogo();
}

  // Generate invoice HTML with logo

async generateInvoiceHTML(invoice, profilePictureBase64 = null) {
     // Get logo as base64 with error handling
  let logoBase64;
  try {
    logoBase64 = await this.getLogoAsBase64();
  } catch (error) {
    console.warn('Error loading logo, using fallback:', error);
    logoBase64 = this.createTextLogo();
  }
    
    const formatDate = (dateString) => {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-ZA', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        } catch (error) {
            return '';
        }
    };

    // Calculate payment status without showing "owing"
    const getPaymentStatus = () => {
        if (invoice.paymentStatus === 'completed') {
            return 'PAID';
        } else if (invoice.depositAmount > 0 && invoice.balanceDue < invoice.totalAmount) {
            return 'DEPOSIT RECEIVED';
        } else {
            return 'PENDING';
        }
    };

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Invoice ${invoice.invoiceNumber || ''}</title>
            <style>
                @page {
                    size: A4;
                    margin: 20mm;
                }
                
                body {
                    font-family: Arial, sans-serif;
                    margin: 0;
                    padding: 0;
                    color: #000;
                    line-height: 1.4;
                }
                
                .invoice-container {
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 20px;
                }
                
                .business-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 30px;
                    border-bottom: 2px solid #000;
                    padding-bottom: 20px;
                }
                
                .logo-container {
                    display: flex;
                    align-items: center;
                    gap: 20px;
                }
                
                .business-logo {
                    width: 150px;
                    height: auto;
                    max-height: 80px;
                    object-fit: contain;
                }
                
                .profile-picture {
                    width: 60px;
                    height: 60px;
                    border-radius: 8px;
                    object-fit: cover;
                    border: 1px solid #ddd;
                }
                
                .business-info {
                    text-align: right;
                    max-width: 300px;
                }
                
                .business-title {
                    font-size: 24px;
                    font-weight: bold;
                    color: #000;
                    text-transform: uppercase;
                    margin-bottom: 5px;
                }
                
                .business-address {
                    font-size: 12px;
                    color: #333;
                    line-height: 1.4;
                }
                
                .invoice-title {
                    font-size: 28px;
                    font-weight: bold;
                    text-transform: uppercase;
                    margin: 20px 0;
                    text-align: center;
                    color: #6C63FF;
                }
                
                .invoice-number {
                    font-size: 18px;
                    font-weight: bold;
                    margin-bottom: 10px;
                    text-align: center;
                    background-color: #f0f0f0;
                    padding: 10px;
                    border-radius: 5px;
                }
                
                .dates {
                    display: flex;
                    justify-content: space-between;
                    margin: 20px 0;
                    font-size: 14px;
                    background-color: #f9f9f9;
                    padding: 15px;
                    border-radius: 5px;
                }
                
                .customer-info {
                    margin: 20px 0;
                    font-size: 14px;
                    padding: 15px;
                    background-color: #f0f0f0;
                    border-radius: 5px;
                }
                
                .bill-to {
                    font-weight: bold;
                    margin-bottom: 10px;
                    color: #333;
                }
                
                .items-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 30px 0;
                    font-size: 14px;
                }
                
                .items-table th {
                    background-color: #6C63FF;
                    color: white;
                    padding: 12px;
                    text-align: left;
                    border: 1px solid #ddd;
                    font-weight: bold;
                }
                
                .items-table td {
                    padding: 12px;
                    border: 1px solid #ddd;
                }
                
                .items-table tr:nth-child(even) {
                    background-color: #f9f9f9;
                }
                
                /* Updated Thank You Message Style - More Professional */
                .thank-you {
                    text-align: center;
                    margin: 30px 0;
                    font-size: 16px;
                    font-weight: 500;
                    color: #333;
                    padding: 20px;
                    background-color: #f9f9f9;
                    border-radius: 5px;
                    font-family: 'Georgia', 'Times New Roman', serif;
                    font-style: italic;
                    border-left: 4px solid #6C63FF;
                    border-right: 4px solid #6C63FF;
                }
                
                .payment-info {
                    margin: 20px 0;
                    padding: 20px;
                    background-color: #f9f9f9;
                    border: 1px solid #ddd;
                    border-radius: 5px;
                }
                
                .payment-title {
                    font-weight: bold;
                    margin-bottom: 10px;
                    color: #333;
                    font-size: 16px;
                }
                
                .terms {
                    margin: 20px 0;
                    padding: 20px;
                    border: 1px solid #ddd;
                    background-color: #f9f9f9;
                    border-radius: 5px;
                }
                
                .terms-title {
                    font-weight: bold;
                    margin-bottom: 10px;
                    color: #333;
                    font-size: 16px;
                }
                
                .footer {
                    text-align: center;
                    margin-top: 50px;
                    font-size: 12px;
                    color: #666;
                    border-top: 1px solid #ddd;
                    padding-top: 20px;
                }
                
                .total-row {
                    background-color: #e8f5e9;
                    font-weight: bold;
                }
                
                .logo-fallback {
                    font-family: Arial, sans-serif;
                    font-weight: bold;
                    color: #6C63FF;
                    text-align: center;
                    padding: 15px;
                    border: 2px solid #6C63FF;
                    border-radius: 5px;
                    background-color: #f8f8f8;
                    min-width: 150px;
                }
                
                .logo-fallback-main {
                    font-size: 20px;
                    letter-spacing: 1px;
                    margin-bottom: 5px;
                }
                
                .logo-fallback-subtitle {
                    font-size: 12px;
                    letter-spacing: 0.5px;
                }
                
                /* Updated amount due styling */
                .payment-summary {
                    margin: 20px 0;
                    padding: 15px;
                    background-color: #f8f9ff;
                    border: 1px solid #e0e0ff;
                    border-radius: 5px;
                }
                
                .summary-row {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 8px;
                    padding: 5px 0;
                }
                
                .summary-label {
                    font-weight: 500;
                    color: #333;
                }
                
                .summary-value {
                    font-weight: 600;
                    color: #333;
                }
                
                .balance-due {
                    font-size: 18px;
                    font-weight: bold;
                    color: #6C63FF;
                    margin-top: 10px;
                    padding-top: 10px;
                    border-top: 2px solid #e0e0ff;
                }
                
                .payment-status {
                    text-align: center;
                    margin: 10px 0;
                    padding: 8px 15px;
                    border-radius: 20px;
                    font-weight: bold;
                    font-size: 14px;
                    display: inline-block;
                }
                
                .status-paid {
                    background-color: #e8f5e9;
                    color: #4CAF50;
                }
                
                .status-deposit {
                    background-color: #e3f2fd;
                    color: #2196F3;
                }
                
                .status-pending {
                    background-color: #fff3e0;
                    color: #FF9800;
                }
            </style>
        </head>
        <body>
            <div class="invoice-container">
                <!-- Business Header with Logo -->
                <div class="business-header">
                    <div class="logo-container">
                        ${logoBase64 ? `
                            <img src="${logoBase64}" class="business-logo" alt="Fallo Tailor Logo">
                        ` : `
                            <div class="logo-fallback">
                                <div class="logo-fallback-main">FALLOT</div>
                                <div class="logo-fallback-subtitle">CORRECTION STUDIO</div>
                            </div>
                        `}
                        
                        ${profilePictureBase64 ? `
                            <img src="${profilePictureBase64}" class="profile-picture" alt="Profile Picture">
                        ` : ''}
                    </div>
                    
                    <div class="business-info">
                        <div class="business-title">Fallot Correction Studio</div>
                        <div class="business-address">
                            +27 69 198 5031<br>
                            190 Bergartillerie Road<br>
                            Danville, Pretoria<br>
                            South Africa
                        </div>
                    </div>
                </div>
                
                <!-- Invoice Title and Number -->
                <div class="invoice-title">INVOICE</div>
                <div class="invoice-number">Invoice #${invoice.invoiceNumber || 'INV0001'}</div>
                
                <!-- Payment Status Badge -->
                <div style="text-align: center; margin-bottom: 20px;">
                    <span class="payment-status status-${getPaymentStatus().toLowerCase().replace(' ', '-')}">
                        ${getPaymentStatus()}
                    </span>
                </div>
                
                <!-- Dates -->
                <div class="dates">
                    <div><strong>Invoice Date:</strong> ${formatDate(invoice.invoiceDate)}</div>
                    <div><strong>Due Date:</strong> ${formatDate(invoice.dueDate)}</div>
                </div>
                
                <!-- Customer Info -->
                <div class="customer-info">
                    <div class="bill-to">Bill To:</div>
                    <div><strong>${invoice.customerName || ''}</strong></div>
                    ${invoice.customerEmail ? `<div>Email: ${invoice.customerEmail}</div>` : ''}
                    ${invoice.customerPhone ? `<div>Phone: ${invoice.customerPhone}</div>` : ''}
                    ${invoice.customerAddress ? `<div>Address: ${invoice.customerAddress}</div>` : ''}
                </div>
                
                <!-- Payment Summary -->
                <div class="payment-summary">
                    <div class="summary-row">
                        <span class="summary-label">Total Amount:</span>
                        <span class="summary-value">R${(invoice.totalAmount || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div class="summary-row">
                        <span class="summary-label">Deposit Paid:</span>
                        <span class="summary-value">R${(invoice.depositAmount || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    ${invoice.balanceDue > 0 ? `
                        <div class="summary-row balance-due">
                            <span class="summary-label">Balance Due:</span>
                            <span class="summary-value">R${invoice.balanceDue.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                    ` : `
                        <div class="summary-row balance-due" style="color: #4CAF50;">
                            <span class="summary-label">Status:</span>
                            <span class="summary-value">FULLY PAID</span>
                        </div>
                    `}
                </div>
                
                <!-- Items Table -->
                <table class="items-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Description</th>
                            <th>Quantity</th>
                            <th>Unit Price (R)</th>
                            <th>Total (R)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${(invoice.items || []).map((item, index) => `
                            <tr>
                                <td>${index + 1}</td>
                                <td>${item.description || ''}</td>
                                <td>${item.quantity || 1}</td>
                                <td>${(item.unitPrice || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                <td>${(item.total || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            </tr>
                        `).join('')}
                        <!-- Subtotal Row -->
                        <tr>
                            <td colspan="4" style="text-align: right; font-weight: bold;">Subtotal:</td>
                            <td style="font-weight: bold;">R${(invoice.subtotal || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                        <!-- Tax Row -->
                        ${invoice.tax > 0 ? `
                            <tr>
                                <td colspan="4" style="text-align: right; font-weight: bold;">Tax:</td>
                                <td style="font-weight: bold;">R${(invoice.tax || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            </tr>
                        ` : ''}
                        <!-- Total Row -->
                        <tr class="total-row">
                            <td colspan="4" style="text-align: right; font-weight: bold;">TOTAL AMOUNT:</td>
                            <td style="font-weight: bold; font-size: 16px;">R${(invoice.totalAmount || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                    </tbody>
                </table>
                
                <!-- Professional Thank You Message -->
                <div class="thank-you">
                    We appreciate your business and look forward to serving you again.
                </div>
                
                <!-- Payment Info -->
                <div class="payment-info">
                    <div class="payment-title">Payment Information:</div>
                    <div>${invoice.bankDetails || 'Bank: FNB<br>Account Number: 62924305312<br>Branch Code: 250655<br>Account Name: Fallo Tailor'}</div>
                </div>
                
                <!-- Terms & Conditions -->
                <div class="terms">
                    <div class="terms-title">Terms & Conditions:</div>
                    <div>${invoice.terms || '1. 50% deposit required to commence work<br>2. Balance payable upon completion and before collection<br>3. Prices valid for 30 days from invoice date<br>4. Late payments may incur additional charges'}</div>
                </div>
                
                <!-- Footer -->
                <div class="footer">
                    <p><strong>Fallot Correction Studio - The House of Bespoke Tailoring & Couture Precision</strong></p>
                    <p>190 Bergartillerie Road, Danville, Pretoria | Phone: +27 69 198 5031 | insta: fallot_correctionstudio</p>
                    <p><em>This is a computer-generated invoice. No signature required.</em></p>
                </div>
            </div>
        </body>
        </html>
    `;
}

  // MAIN METHOD: Get or Create PDF
  async getOrCreateInvoicePDF(invoice, profilePictureUri = null) {
    await this.initPromise;
    await this.logoInitPromise;
    
    // Create cache key with profile picture reference
    const cacheKey = profilePictureUri ? `${invoice.id}_${profilePictureUri}` : invoice.id;
    const cachedUri = PDFCache.get(cacheKey);
    if (cachedUri) {
      console.log('💾 Using cached PDF');
      return cachedUri;
    }
    
    try {
      // 1. Check if PDF already exists on disk
      const existingPdfUri = await this.findExistingInvoicePDF(invoice);
      if (existingPdfUri) {
        console.log('📄 Using existing PDF from disk');
        PDFCache.set(cacheKey, existingPdfUri);
        return existingPdfUri;
      }
      
      // 2. If not exists, generate new PDF with profile picture and logo
      console.log('🔄 Generating new PDF with Fallo Tailor logo');
      const newPdfUri = await this.createInvoicePDF(invoice, profilePictureUri);
      PDFCache.set(cacheKey, newPdfUri);
      return newPdfUri;
      
    } catch (error) {
      console.error('❌ Error in getOrCreateInvoicePDF:', error);
      throw error;
    }
  }

  // Create new PDF with profile picture and logo
  async createInvoicePDF(invoice, profilePictureUri = null) {
    try {
      // Convert profile picture to base64 if available
      let profilePictureBase64 = null;
      if (profilePictureUri) {
        try {
          const file = new File(profilePictureUri);
          if (file.exists) {
            const base64 = await file.FileSystem.readAsStringAsync({ encoding: 'base64' });
            profilePictureBase64 = `data:image/jpeg;base64,${base64}`;
          }
        } catch (error) {
          console.warn('Error loading profile picture for PDF:', error);
        }
      }
      
      const html = await this.generateInvoiceHTML(invoice, profilePictureBase64);
      
      const { uri: tempUri } = await Print.printToFileAsync({
        html,
        base64: false,
        width: 595,
        height: 842,
      });
      
      // Generate unique filename
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 9);
      const invoiceNumber = invoice.invoiceNumber || 'unknown';
      const invoiceId = invoice.id || 'unknown';
      
      // Format: Invoice_INV0001_123456789_abc123.pdf
      const filename = `Invoice_${invoiceNumber}_${invoiceId}_${timestamp}_${random}.pdf`;
      const destinationFile = new File(this.invoicesDir, filename);
      
      // Copy to permanent location
      const sourceFile = new File(tempUri);
      sourceFile.copy(destinationFile);
      
      console.log('✅ PDF created with Fallo Tailor logo:', destinationFile.uri);
      return destinationFile.uri;
      
    } catch (error) {
      console.error('❌ Error creating PDF:', error);
      throw error;
    }
  }

  // Share PDF with logo
  async shareInvoicePDF(invoice, profilePictureUri = null) {
    try {
      await this.initPromise;
      await this.logoInitPromise;
      
      // Get or create PDF with profile picture and logo
      const pdfUri = await this.getOrCreateInvoicePDF(invoice, profilePictureUri);
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(pdfUri, {
          mimeType: 'application/pdf',
          dialogTitle: `Fallo Tailor Invoice - ${invoice.invoiceNumber || ''}`,
          UTI: 'com.adobe.pdf'
        });
        return true;
      } else {
        throw new Error('Sharing not available on this device');
      }
    } catch (error) {
      console.error('Error sharing PDF:', error);
      throw error;
    }
  }

  // Print invoice with logo
  async printInvoice(invoice, profilePictureUri = null) {
    try {
      // Convert profile picture to base64 if available
      let profilePictureBase64 = null;
      if (profilePictureUri) {
        try {
          const file = new File(profilePictureUri);
          if (file.exists) {
            const base64 = await file.FileSystem.readAsStringAsync({ encoding: 'base64' });
            profilePictureBase64 = `data:image/jpeg;base64,${base64}`;
          }
        } catch (error) {
          console.warn('Error loading profile picture for PDF:', error);
        }
      }
      
      const html = await this.generateInvoiceHTML(invoice, profilePictureBase64);
      
      await Print.printAsync({
        html,
        width: 595,
        height: 842,
      });
    } catch (error) {
      console.error('Error printing invoice:', error);
      throw error;
    }
  }

  // Find existing invoice PDF
  async findExistingInvoicePDF(invoice) {
    try {
      if (!this.invoicesDir.exists) return null;
      
      const files = this.invoicesDir.list();
      const invoiceNumber = invoice.invoiceNumber || 'unknown';
      
      // Look for files with invoice number in name
      for (const file of files) {
        if (file instanceof File && 
            file.name.endsWith('.pdf') && 
            file.name.includes(invoiceNumber)) {
          return file.uri;
        }
      }
      
      // Alternative: Check by invoice ID in filename
      if (invoice.id) {
        for (const file of files) {
          if (file instanceof File && 
              file.name.endsWith('.pdf') && 
              file.name.includes(`_${invoice.id}_`)) {
            return file.uri;
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error finding existing PDF:', error);
      return null;
    }
  }

  // Force regeneration of PDF
  async regenerateInvoicePDF(invoice, profilePictureUri = null) {
    try {
      await this.initPromise;
      await this.logoInitPromise;
      
      // Delete old PDFs for this invoice
      await this.deleteInvoicePDFs(invoice);
      
      // Create new PDF with profile picture and logo
      return await this.createInvoicePDF(invoice, profilePictureUri);
    } catch (error) {
      console.error('Error regenerating PDF:', error);
      throw error;
    }
  }

  // Delete invoice PDFs
  async deleteInvoicePDFs(invoice) {
    try {
      if (!this.invoicesDir.exists) return;
      
      const files = this.invoicesDir.list();
      const invoiceNumber = invoice.invoiceNumber || 'unknown';
      const invoiceId = invoice.id || 'unknown';
      
      for (const file of files) {
        if (file instanceof File && 
            file.name.endsWith('.pdf') && 
            (file.name.includes(invoiceNumber) || file.name.includes(`_${invoiceId}_`))) {
          file.delete();
          console.log('🗑️ Deleted PDF:', file.name);
        }
      }
    } catch (error) {
      console.error('Error deleting PDFs:', error);
    }
  }

  // Other PDF generation methods for compatibility
  async generateInvoicePDF(invoice, profilePictureUri = null) {
    return await this.getOrCreateInvoicePDF(invoice, profilePictureUri);
  }

  async saveInvoiceToFilesystem(invoice, profilePictureUri = null) {
    return await this.getOrCreateInvoicePDF(invoice, profilePictureUri);
  }

   async generateReceiptHTML(payment) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: 'Helvetica', 'Arial', sans-serif;
            margin: 0;
            padding: 40px;
            color: #333;
            line-height: 1.6;
          }
          
          @page {
            size: A4;
            margin: 20mm;
          }
          
          .header {
            text-align: center;
            margin-bottom: 40px;
            border-bottom: 2px solid #4CAF50;
            padding-bottom: 20px;
          }
          
          .business-name {
            font-size: 28px;
            font-weight: bold;
            color: #4CAF50;
            margin-bottom: 5px;
          }
          
          .receipt-number {
            font-size: 20px;
            color: #666;
            margin-bottom: 20px;
          }
          
          .section {
            margin-bottom: 30px;
          }
          
          .section-title {
            font-size: 18px;
            font-weight: bold;
            color: #333;
            margin-bottom: 10px;
            border-bottom: 1px solid #eee;
            padding-bottom: 5px;
          }
          
          .info-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
            margin-bottom: 30px;
          }
          
          .info-item {
            margin-bottom: 15px;
          }
          
          .info-label {
            font-weight: bold;
            color: #666;
            margin-bottom: 5px;
          }
          
          .info-value {
            font-size: 16px;
          }
          
          .payment-details {
            background-color: #f9f9f9;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
          }
          
          .payment-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            padding: 10px 0;
            border-bottom: 1px solid #eee;
          }
          
          .payment-row:last-child {
            border-bottom: none;
          }
          
          .payment-label {
            font-weight: bold;
          }
          
          .payment-total {
            font-size: 24px;
            font-weight: bold;
            color: #4CAF50;
            text-align: center;
            margin: 30px 0;
            padding: 20px;
            border: 2px solid #4CAF50;
            border-radius: 8px;
          }
          
          .footer {
            margin-top: 50px;
            text-align: center;
            color: #666;
            font-size: 12px;
            border-top: 1px solid #eee;
            padding-top: 20px;
          }
          
          .watermark {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 80px;
            color: rgba(0, 0, 0, 0.1);
            z-index: -1;
            font-weight: bold;
          }
          
          .thank-you {
            text-align: center;
            font-size: 18px;
            color: #4CAF50;
            margin: 30px 0;
            padding: 20px;
            background-color: #E8F5E9;
            border-radius: 8px;
          }
        </style>
      </head>
      <body>
        <div class="watermark">PAID</div>
        
        <div class="header">
          <div class="business-name">Fallo Tailor</div>
          <div>Payment Receipt</div>
          <div class="receipt-number">RECEIPT: ${payment.receiptNumber || `PAY-${Date.now()}`}</div>
        </div>
        
        <div class="thank-you">
          <strong>Thank You for Your Payment!</strong>
        </div>
        
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Customer Name</div>
            <div class="info-value">${payment.customerName || 'N/A'}</div>
          </div>
          
          <div class="info-item">
            <div class="info-label">Date</div>
            <div class="info-value">${new Date(payment.date || Date.now()).toLocaleDateString()}</div>
          </div>
          
          <div class="info-item">
            <div class="info-label">Payment Method</div>
            <div class="info-value">${payment.paymentMethod || 'Cash'}</div>
          </div>
          
          <div class="info-item">
            <div class="info-label">Reference Number</div>
            <div class="info-value">${payment.referenceNumber || 'N/A'}</div>
          </div>
        </div>
        
        <div class="payment-details">
          <div class="section-title">Payment Details</div>
          
          ${payment.description ? `
            <div class="info-item">
              <div class="info-label">Description</div>
              <div class="info-value">${payment.description}</div>
            </div>
          ` : ''}
          
          <div class="payment-row">
            <span class="payment-label">Amount Paid:</span>
            <span>R ${(payment.amount || 0).toLocaleString()}</span>
          </div>
          
          ${payment.tax ? `
            <div class="payment-row">
              <span class="payment-label">Tax:</span>
              <span>R ${payment.tax.toLocaleString()}</span>
            </div>
          ` : ''}
          
          ${payment.discount ? `
            <div class="payment-row">
              <span class="payment-label">Discount:</span>
              <span>-R ${payment.discount.toLocaleString()}</span>
            </div>
          ` : ''}
        </div>
        
        <div class="payment-total">
          TOTAL: R ${(payment.amount || 0).toLocaleString()}
        </div>
        
        <div class="footer">
          <p>This receipt confirms payment has been received.</p>
          <p>For any inquiries, please contact us with your receipt number.</p>
          <p><em>Computer-generated receipt. Valid without signature.</em></p>
        </div>
      </body>
      </html>
    `;
  }

  async generateFinancialReportHTML(data) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: 'Helvetica', 'Arial', sans-serif;
            margin: 0;
            padding: 40px;
            color: #333;
            line-height: 1.6;
          }
          
          @page {
            size: A4;
            margin: 20mm;
          }
          
          .header {
            text-align: center;
            margin-bottom: 40px;
            border-bottom: 2px solid #2196F3;
            padding-bottom: 20px;
          }
          
          .report-title {
            font-size: 28px;
            font-weight: bold;
            color: #2196F3;
            margin-bottom: 10px;
          }
          
          .report-period {
            font-size: 16px;
            color: #666;
          }
          
          .section {
            margin-bottom: 40px;
            page-break-inside: avoid;
          }
          
          .section-title {
            font-size: 20px;
            font-weight: bold;
            color: #333;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #eee;
          }
          
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
            margin-bottom: 30px;
          }
          
          .stat-card {
            border: 1px solid #ddd;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
          }
          
          .stat-value {
            font-size: 24px;
            font-weight: bold;
            color: #2196F3;
            margin-bottom: 5px;
          }
          
          .stat-label {
            color: #666;
            font-size: 14px;
          }
          
          .table-container {
            overflow-x: auto;
            margin-bottom: 30px;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          
          th {
            background-color: #f5f5f5;
            padding: 12px;
            text-align: left;
            font-weight: bold;
            color: #333;
            border-bottom: 2px solid #ddd;
          }
          
          td {
            padding: 12px;
            border-bottom: 1px solid #eee;
          }
          
          tr:nth-child(even) {
            background-color: #f9f9f9;
          }
          
          .total-row {
            font-weight: bold;
            background-color: #E3F2FD;
          }
          
          .chart-container {
            margin: 30px 0;
            padding: 20px;
            background-color: #f9f9f9;
            border-radius: 8px;
          }
          
          .chart-placeholder {
            height: 200px;
            background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #666;
            font-style: italic;
          }
          
          .footer {
            margin-top: 50px;
            text-align: center;
            color: #666;
            font-size: 12px;
            border-top: 1px solid #eee;
            padding-top: 20px;
          }
          
          .watermark {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 80px;
            color: rgba(0, 0, 0, 0.1);
            z-index: -1;
            font-weight: bold;
          }
          
          .page-break {
            page-break-before: always;
          }
          
          .positive {
            color: #4CAF50;
          }
          
          .negative {
            color: #F44336;
          }
          
          .summary {
            background-color: #E8F5E9;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="watermark">CONFIDENTIAL</div>
        
        <div class="header">
          <div class="report-title">Financial Report</div>
          <div class="report-period">${data.period || 'All Time'}</div>
          <div>Generated on: ${new Date().toLocaleDateString()}</div>
        </div>
        
        <div class="section">
          <div class="section-title">Executive Summary</div>
          
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-value">R ${(data.totalRevenue || 0).toLocaleString()}</div>
              <div class="stat-label">Total Revenue</div>
            </div>
            
            <div class="stat-card">
              <div class="stat-value">R ${(data.totalExpenses || 0).toLocaleString()}</div>
              <div class="stat-label">Total Expenses</div>
            </div>
            
            <div class="stat-card">
              <div class="stat-value ${(data.netProfit || 0) >= 0 ? 'positive' : 'negative'}">
                R ${Math.abs(data.netProfit || 0).toLocaleString()}
              </div>
              <div class="stat-label">Net ${(data.netProfit || 0) >= 0 ? 'Profit' : 'Loss'}</div>
            </div>
            
            <div class="stat-card">
              <div class="stat-value">${data.invoiceCount || 0}</div>
              <div class="stat-label">Total Invoices</div>
            </div>
          </div>
        </div>
        
        ${data.revenueByMonth && data.revenueByMonth.length > 0 ? `
          <div class="section">
            <div class="section-title">Monthly Revenue</div>
            <div class="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Revenue</th>
                    <th>Expenses</th>
                    <th>Net</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.revenueByMonth.map(item => `
                    <tr>
                      <td>${item.month}</td>
                      <td>R ${item.revenue.toLocaleString()}</td>
                      <td>R ${item.expenses.toLocaleString()}</td>
                      <td class="${item.net >= 0 ? 'positive' : 'negative'}">
                        R ${Math.abs(item.net).toLocaleString()}
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        ` : ''}
        
        ${data.topCustomers && data.topCustomers.length > 0 ? `
          <div class="section">
            <div class="section-title">Top Customers</div>
            <div class="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Total Spent</th>
                    <th>Jobs</th>
                    <th>Last Job</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.topCustomers.map(customer => `
                    <tr>
                      <td>${customer.name}</td>
                      <td>R ${customer.total.toLocaleString()}</td>
                      <td>${customer.jobCount}</td>
                      <td>${customer.lastJob ? new Date(customer.lastJob).toLocaleDateString() : 'N/A'}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        ` : ''}
        
        ${data.expenseCategories && data.expenseCategories.length > 0 ? `
          <div class="section">
            <div class="section-title">Expense Categories</div>
            <div class="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Amount</th>
                    <th>Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.expenseCategories.map(category => `
                    <tr>
                      <td>${category.name}</td>
                      <td>R ${category.amount.toLocaleString()}</td>
                      <td>${category.percentage}%</td>
                    </tr>
                  `).join('')}
                  <tr class="total-row">
                    <td><strong>Total</strong></td>
                    <td><strong>R ${data.totalExpenses.toLocaleString()}</strong></td>
                    <td><strong>100%</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ` : ''}
        
        <div class="section">
          <div class="section-title">Key Metrics</div>
          
          <div class="summary">
            <p><strong>Profit Margin:</strong> ${data.profitMargin || 0}%</p>
            <p><strong>Average Invoice Value:</strong> R ${(data.averageInvoice || 0).toLocaleString()}</p>
            <p><strong>Payment Collection Rate:</strong> ${data.collectionRate || 0}%</p>
            <p><strong>Customer Retention Rate:</strong> ${data.retentionRate || 0}%</p>
          </div>
        </div>
        
        <div class="footer">
          <p>This report was generated automatically by Fallo Tailor Business Management System.</p>
          <p>For detailed analysis or custom reports, please contact system administrator.</p>
          <p><em>Report ID: FIN-${Date.now()}</em></p>
        </div>
      </body>
      </html>
    `;
  }

  async generateJobReportHTML(job) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: 'Helvetica', 'Arial', sans-serif;
            margin: 0;
            padding: 40px;
            color: #333;
            line-height: 1.6;
          }
          
          @page {
            size: A4;
            margin: 20mm;
          }
          
          .header {
            text-align: center;
            margin-bottom: 40px;
            border-bottom: 2px solid #FF9800;
            padding-bottom: 20px;
          }
          
          .report-title {
            font-size: 28px;
            font-weight: bold;
            color: #FF9800;
            margin-bottom: 10px;
          }
          
          .job-id {
            font-size: 20px;
            color: #666;
            margin-bottom: 20px;
          }
          
          .info-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 30px;
            margin-bottom: 40px;
          }
          
          .info-section {
            margin-bottom: 30px;
          }
          
          .section-title {
            font-size: 18px;
            font-weight: bold;
            color: #333;
            margin-bottom: 15px;
            padding-bottom: 5px;
            border-bottom: 1px solid #eee;
          }
          
          .info-item {
            margin-bottom: 10px;
            display: flex;
          }
          
          .info-label {
            font-weight: bold;
            color: #666;
            min-width: 150px;
          }
          
          .progress-bar {
            height: 20px;
            background-color: #f0f0f0;
            border-radius: 10px;
            overflow: hidden;
            margin: 10px 0;
          }
          
          .progress-fill {
            height: 100%;
            background-color: #4CAF50;
            border-radius: 10px;
          }
          
          .status-badge {
            display: inline-block;
            padding: 5px 15px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 12px;
          }
          
          .status-completed {
            background-color: #E8F5E9;
            color: #4CAF50;
          }
          
          .status-in-progress {
            background-color: #E3F2FD;
            color: #2196F3;
          }
          
          .status-pending {
            background-color: #FFF3E0;
            color: #FF9800;
          }
          
          .materials-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          
          .materials-table th {
            background-color: #f5f5f5;
            padding: 12px;
            text-align: left;
            font-weight: bold;
            color: #333;
            border-bottom: 2px solid #ddd;
          }
          
          .materials-table td {
            padding: 12px;
            border-bottom: 1px solid #eee;
          }
          
          .total-row {
            font-weight: bold;
            background-color: #f9f9f9;
          }
          
          .notes-section {
            background-color: #f9f9f9;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
          }
          
          .footer {
            margin-top: 50px;
            text-align: center;
            color: #666;
            font-size: 12px;
            border-top: 1px solid #eee;
            padding-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="report-title">Job Completion Report</div>
          <div class="job-id">Job ID: ${job.id || 'N/A'}</div>
        </div>
        
        <div class="info-grid">
          <div class="info-section">
            <div class="section-title">Job Details</div>
            
            <div class="info-item">
              <span class="info-label">Job Title:</span>
              <span>${job.title || 'N/A'}</span>
            </div>
            
            <div class="info-item">
              <span class="info-label">Customer:</span>
              <span>${job.customerName || 'N/A'}</span>
            </div>
            
            <div class="info-item">
              <span class="info-label">Start Date:</span>
              <span>${job.startDate ? new Date(job.startDate).toLocaleDateString() : 'N/A'}</span>
            </div>
            
            <div class="info-item">
              <span class="info-label">Due Date:</span>
              <span>${job.dueDate ? new Date(job.dueDate).toLocaleDateString() : 'N/A'}</span>
            </div>
            
            <div class="info-item">
              <span class="info-label">Status:</span>
              <span class="status-badge status-${job.status || 'pending'}">
                ${(job.status || 'pending').toUpperCase()}
              </span>
            </div>
          </div>
          
          <div class="info-section">
            <div class="section-title">Progress</div>
            
            <div class="info-item">
              <span class="info-label">Progress:</span>
              <span>${job.progress || 0}%</span>
            </div>
            
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${job.progress || 0}%"></div>
            </div>
            
            ${job.completedAt ? `
              <div class="info-item">
                <span class="info-label">Completed:</span>
                <span>${new Date(job.completedAt).toLocaleDateString()}</span>
            </div>
            ` : ''}
            
            <div class="info-item">
              <span class="info-label">Assigned To:</span>
              <span>${job.assignedTo || 'Not assigned'}</span>
            </div>
          </div>
        </div>
        
        ${job.description ? `
          <div class="info-section">
            <div class="section-title">Description</div>
            <p>${job.description}</p>
          </div>
        ` : ''}
        
        ${job.materials && job.materials.length > 0 ? `
          <div class="info-section">
            <div class="section-title">Materials Used</div>
            
            <table class="materials-table">
              <thead>
                <tr>
                  <th>Material</th>
                  <th>Quantity</th>
                  <th>Unit Cost</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${job.materials.map(material => `
                  <tr>
                    <td>${material.name || 'Material'}</td>
                    <td>${material.quantity || 1}</td>
                    <td>R ${(material.cost || 0).toLocaleString()}</td>
                    <td>R ${((material.quantity || 1) * (material.cost || 0)).toLocaleString()}</td>
                  </tr>
                `).join('')}
                <tr class="total-row">
                  <td colspan="3"><strong>Total Materials Cost:</strong></td>
                  <td><strong>R ${job.materials.reduce((sum, mat) => sum + ((mat.quantity || 1) * (mat.cost || 0)), 0).toLocaleString()}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
        ` : ''}
        
        ${job.notes && job.notes.length > 0 ? `
          <div class="info-section">
            <div class="section-title">Notes</div>
            <div class="notes-section">
              ${job.notes.map(note => `
                <div style="margin-bottom: 15px;">
                  <div><strong>${new Date(note.date || Date.now()).toLocaleDateString()}:</strong></div>
                  <div>${note.text || ''}</div>
                  ${note.author ? `<div style="font-size: 12px; color: #666;">By: ${note.author}</div>` : ''}
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
        
        <div class="footer">
          <p>This job report was generated by Fallo Tailor Business Management System.</p>
          <p>Report generated on: ${new Date().toLocaleDateString()}</p>
        </div>
      </body>
      </html>
    `;
  }

  async generateQuotationHTML(quotation) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: 'Helvetica', 'Arial', sans-serif;
            margin: 0;
            padding: 40px;
            color: #333;
            line-height: 1.6;
          }
          
          @page {
            size: A4;
            margin: 20mm;
          }
          
          .header {
            text-align: center;
            margin-bottom: 40px;
            border-bottom: 2px solid #9C27B0;
            padding-bottom: 20px;
          }
          
          .business-name {
            font-size: 28px;
            font-weight: bold;
            color: #9C27B0;
            margin-bottom: 5px;
          }
          
          .quotation-number {
            font-size: 20px;
            color: #666;
            margin-bottom: 20px;
          }
          
          .valid-until {
            font-size: 14px;
            color: #666;
            margin-top: 10px;
          }
          
          .customer-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
          }
          
          .info-box {
            flex: 1;
          }
          
          .section-title {
            font-size: 18px;
            font-weight: bold;
            color: #333;
            margin-bottom: 10px;
            border-bottom: 1px solid #eee;
            padding-bottom: 5px;
          }
          
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          
          .items-table th {
            background-color: #f5f5f5;
            padding: 12px;
            text-align: left;
            font-weight: bold;
            color: #333;
            border-bottom: 2px solid #ddd;
          }
          
          .items-table td {
            padding: 12px;
            border-bottom: 1px solid #eee;
          }
          
          .text-right {
            text-align: right;
          }
          
          .totals {
            float: right;
            margin-top: 30px;
            width: 300px;
          }
          
          .total-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            padding: 5px 0,
          }
          
          .total-label {
            font-weight: bold;
          }
          
          .grand-total {
            font-size: 20px;
            font-weight: bold;
            color: #9C27B0;
            border-top: 2px solid #9C27B0;
            padding-top: 15px;
            margin-top: 15px;
          }
          
          .terms {
            margin-top: 50px;
            padding: 20px;
            background-color: #f9f9f9;
            border-radius: 5px;
            clear: both;
          }
          
          .terms-title {
            font-weight: bold;
            margin-bottom: 10px;
          }
          
          .footer {
            margin-top: 50px;
            text-align: center;
            color: #666;
            font-size: 12px;
            border-top: 1px solid #eee;
            padding-top: 20px;
          }
          
          .watermark {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 80px;
            color: rgba(0, 0, 0, 0.1);
            z-index: -1;
            font-weight: bold;
          }
          
          .note {
            font-style: italic;
            color: #666;
            margin: 20px 0;
            padding: 15px;
            background-color: #FFF3E0;
            border-left: 4px solid #FF9800;
          }
        </style>
      </head>
      <body>
        <div class="watermark">QUOTATION</div>
        
        <div class="header">
          <div class="business-name">Fallo Tailor</div>
          <div>Quotation for Services</div>
          <div class="quotation-number">QUOTATION: ${quotation.quotationNumber || 'Q-' + Date.now()}</div>
          ${quotation.validUntil ? `
            <div class="valid-until">Valid until: ${new Date(quotation.validUntil).toLocaleDateString()}</div>
          ` : ''}
        </div>
        
        <div class="customer-info">
          <div class="info-box">
            <div class="section-title">Quotation For:</div>
            <div>
              <div><strong>${quotation.customerName || 'N/A'}</strong></div>
              <div>${quotation.customerEmail || ''}</div>
              <div>${quotation.customerPhone || ''}</div>
              <div>${quotation.customerAddress || ''}</div>
            </div>
          </div>
          
          <div class="info-box">
            <div class="section-title">Quotation Details:</div>
            <div>
              <div><strong>Date:</strong> ${new Date().toLocaleDateString()}</div>
              ${quotation.validUntil ? `
                <div><strong>Valid Until:</strong> ${new Date(quotation.validUntil).toLocaleDateString()}</div>
              ` : ''}
              <div><strong>Prepared By:</strong> ${quotation.preparedBy || 'Fallo Tailor'}</div>
            </div>
          </div>
        </div>
        
        ${quotation.description ? `
          <div class="note">
            <strong>Scope of Work:</strong> ${quotation.description}
          </div>
        ` : ''}
        
        <table class="items-table">
          <thead>
            <tr>
              <th>Description</th>
              <th class="text-right">Quantity</th>
              <th class="text-right">Unit Price (R)</th>
              <th class="text-right">Total (R)</th>
            </tr>
          </thead>
          <tbody>
            ${(quotation.items || []).map(item => `
              <tr>
                <td>${item.description || 'Service'}</td>
                <td class="text-right">${item.quantity || 1}</td>
                <td class="text-right">${(item.unitPrice || 0).toLocaleString()}</td>
                <td class="text-right">${((item.quantity || 1) * (item.unitPrice || 0)).toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="totals">
          <div class="total-row">
            <span class="total-label">Subtotal:</span>
            <span>R ${(quotation.subtotal || 0).toLocaleString()}</span>
          </div>
          
          ${quotation.tax > 0 ? `
            <div class="total-row">
              <span class="total-label">Tax (${quotation.taxRate || 0}%):</span>
              <span>R ${(quotation.tax || 0).toLocaleString()}</span>
            </div>
          ` : ''}
          
          ${quotation.discount > 0 ? `
            <div class="total-row">
              <span class="total-label">Discount:</span>
              <span>-R ${(quotation.discount || 0).toLocaleString()}</span>
            </div>
          ` : ''}
          
          <div class="total-row grand-total">
            <span>TOTAL AMOUNT:</span>
            <span>R ${(quotation.totalAmount || 0).toLocaleString()}</span>
          </div>
          
          ${quotation.depositRequired ? `
            <div class="total-row">
              <span class="total-label">Deposit Required (${quotation.depositPercentage || 50}%):</span>
              <span>R ${(quotation.depositAmount || 0).toLocaleString()}</span>
            </div>
          ` : ''}
        </div>
        
        <div class="terms">
          <div class="terms-title">Terms & Conditions:</div>
          <ol>
            <li>This quotation is valid for 30 days from the date issued.</li>
            <li>A ${quotation.depositPercentage || 50}% deposit is required to commence work.</li>
            <li>Balance payment is due upon completion and before delivery.</li>
            <li>Prices quoted are subject to change if specifications are altered.</li>
            <li>Additional charges may apply for expedited services.</li>
            <li>Cancellations must be made at least 48 hours in advance.</li>
          </ol>
        </div>
        
        <div class="footer">
          <p>Thank you for considering Fallo Tailor for your fashion needs.</p>
          <p>To accept this quotation, please sign below and return a copy.</p>
          <p><em>This is a computer-generated quotation. Valid without signature.</em></p>
        </div>
      </body>
      </html>
    `;
  }


  // Utility methods
  async generatePDF(html, filename = 'document') {
    try {
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
        width: 595,
        height: 842,
      });
      
      // Rename file with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const documentDir = Paths.document;
      
      // Create PDFs directory if it doesn't exist
      const pdfsDir = new Directory(documentDir, 'pdfs');
      if (!pdfsDir.exists) {
        pdfsDir.create({ intermediates: true });
      }
      
      // Create destination file
      const destinationFile = new File(pdfsDir, `${filename}_${timestamp}.pdf`);
      
      // Copy the generated PDF
      const sourceFile = new File(uri);
      sourceFile.copy(destinationFile);
      
      return destinationFile.uri;
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw error;
    }
  }

  async listSavedPDFs() {
    try {
      const documentDir = Paths.document;
      const invoicesDir = new Directory(documentDir, 'invoices');
      
      if (!invoicesDir.exists) {
        return [];
      }
      
      const files = invoicesDir.list();
      return files.filter(file => file instanceof File && file.name.endsWith('.pdf'));
    } catch (error) {
      console.error('Error listing PDFs:', error);
      return [];
    }
  }

  async deletePDF(filename) {
    try {
      const documentDir = Paths.document;
      const invoicesDir = new Directory(documentDir, 'invoices');
      const file = new File(invoicesDir, filename);
      
      if (file.exists) {
        file.delete();
      }
      return true;
    } catch (error) {
      console.error('Error deleting PDF:', error);
      throw error;
    }
  }

  async getPDFUri(filename) {
    const documentDir = Paths.document;
    const invoicesDir = new Directory(documentDir, 'invoices');
    const file = new File(invoicesDir, filename);
    return file.uri;
  }

  // Get all saved PDFs
  async getAllInvoicePDFs() {
    try {
      await this.initPromise;
      
      if (!this.invoicesDir.exists) return [];
      
      const files = this.invoicesDir.list();
      return files
        .filter(file => file instanceof File && file.name.endsWith('.pdf'))
        .map(file => ({
          uri: file.uri,
          name: file.name,
          size: file.size,
          modificationTime: file.modificationTime
        }))
        .sort((a, b) => b.modificationTime - a.modificationTime); // Newest first
    } catch (error) {
      console.error('Error getting PDFs:', error);
      return [];
    }
  }

  // Clear all PDFs (for cleanup)
  async clearAllPDFs() {
    try {
      await this.initPromise;
      
      if (!this.invoicesDir.exists) return 0;
      
      const files = this.invoicesDir.list();
      let deletedCount = 0;
      
      for (const file of files) {
        if (file instanceof File && file.name.endsWith('.pdf')) {
          file.delete();
          deletedCount++;
        }
      }
      
      console.log(`🗑️ Deleted ${deletedCount} PDF files`);
      return deletedCount;
    } catch (error) {
      console.error('Error clearing PDFs:', error);
      throw error;
    }
  }
}

export default new PDFService();