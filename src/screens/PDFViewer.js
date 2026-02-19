import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Platform, Linking, Alert, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import WebView from 'react-native-webview';
import { Appbar, ActivityIndicator, Button, Snackbar } from 'react-native-paper';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Paths, File, Directory } from 'expo-file-system';

export default function PDFViewer() {
  const route = useRoute();
  const navigation = useNavigation();
  const { pdfPath, title } = route.params;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [htmlContent, setHtmlContent] = useState('');
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [pdfFile, setPdfFile] = useState(null);
  const [base64Content, setBase64Content] = useState(null);

  useEffect(() => {
    preparePDF();
  }, [pdfPath]);

  const preparePDF = async () => {
  try {
    setLoading(true);
    setError(null);
    
    console.log('📄 [PDFViewer] Preparing PDF from path:', pdfPath);
    
    if (!pdfPath) {
      throw new Error('No PDF path provided');
    }

    // Create File instance
    const file = new File(pdfPath);
    setPdfFile(file);
    
    // Check if file exists
    const fileExists = file.exists;
    console.log('📄 [PDFViewer] File exists:', fileExists);
    console.log('📄 [PDFViewer] File URI:', file.uri);
    console.log('📄 [PDFViewer] File size:', file.size);
    
    if (!fileExists) {
      throw new Error('PDF file not found');
    }

    // For ALL platforms, use base64 embedded PDF with proper encoding
    try {
      console.log('📄 [PDFViewer] Converting to base64...');
      const base64 = await file.base64();
      setBase64Content(base64);
      
      // Create HTML with multiple fallback options
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body, html {
              margin: 0;
              padding: 0;
              height: 100%;
              overflow: hidden;
              background: #f5f5f5;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            
            .container {
              width: 100%;
              height: 100%;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
            }
            
            .pdf-viewer {
              width: 100%;
              height: 100%;
              border: none;
            }
            
            .fallback-message {
              padding: 40px 20px;
              text-align: center;
              background: white;
              border-radius: 10px;
              box-shadow: 0 4px 20px rgba(0,0,0,0.1);
              max-width: 90%;
            }
            
            .error-icon {
              font-size: 48px;
              margin-bottom: 20px;
            }
            
            .message-title {
              font-size: 18px;
              font-weight: bold;
              color: #333;
              margin-bottom: 10px;
            }
            
            .message-text {
              color: #666;
              margin-bottom: 20px;
              line-height: 1.5;
            }
            
            .hidden-iframe {
              position: absolute;
              width: 0;
              height: 0;
              border: none;
              visibility: hidden;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <!-- Method 1: Direct object tag (works on most devices) -->
            <object 
              id="pdfObject"
              class="pdf-viewer"
              data="data:application/pdf;base64,${base64}#toolbar=0&navpanes=0&scrollbar=0"
              type="application/pdf"
            >
              <!-- Fallback 1: Iframe -->
              <iframe 
                id="pdfIframe"
                class="pdf-viewer"
                src="data:application/pdf;base64,${base64}#toolbar=0&navpanes=0&scrollbar=0"
              >
                <!-- Fallback 2: Direct message -->
                <div class="fallback-message">
                  <div class="error-icon">📄</div>
                  <div class="message-title">PDF Viewer Not Supported</div>
                  <div class="message-text">
                    Your device doesn't support embedded PDF viewing.<br>
                    The PDF has been loaded successfully but cannot be displayed inline.
                  </div>
                  <div style="margin-top: 20px; color: #888; font-size: 14px;">
                    File: ${file.name || 'document.pdf'}<br>
                    Size: ${Math.round(file.size / 1024)} KB
                  </div>
                </div>
              </iframe>
            </object>
            
            <!-- Hidden iframe as alternative -->
            <iframe 
              id="hiddenIframe"
              class="hidden-iframe"
              src="data:application/pdf;base64,${base64}"
              onload="window.ReactNativeWebView.postMessage('pdf_loaded')"
              onerror="window.ReactNativeWebView.postMessage('pdf_load_error')"
            ></iframe>
          </div>
          
          <script>
            // Multiple methods to detect PDF load
            document.addEventListener('DOMContentLoaded', function() {
              console.log('PDF Viewer HTML loaded');
              
              // Method 1: Check object tag
              const pdfObject = document.getElementById('pdfObject');
              if (pdfObject) {
                pdfObject.onload = function() {
                  console.log('PDF loaded in object tag');
                  window.ReactNativeWebView.postMessage('pdf_loaded');
                };
                pdfObject.onerror = function() {
                  console.log('Object tag failed, trying iframe');
                  // Try iframe instead
                  const pdfIframe = document.getElementById('pdfIframe');
                  if (pdfIframe) {
                    pdfIframe.onload = function() {
                      window.ReactNativeWebView.postMessage('pdf_loaded');
                    };
                    pdfIframe.onerror = function() {
                      window.ReactNativeWebView.postMessage('pdf_load_error');
                    };
                  }
                };
              }
              
              // Also try to load with timeout
              setTimeout(function() {
                // Check if PDF is visible
                try {
                  const viewer = document.querySelector('.pdf-viewer');
                  if (viewer && viewer.offsetHeight > 0) {
                    window.ReactNativeWebView.postMessage('pdf_loaded');
                  } else {
                    // Try to force display
                    const hiddenIframe = document.getElementById('hiddenIframe');
                    if (hiddenIframe) {
                      hiddenIframe.className = 'pdf-viewer';
                      window.ReactNativeWebView.postMessage('pdf_loaded');
                    }
                  }
                } catch (e) {
                  console.log('Auto-check error:', e);
                }
              }, 1000);
              
              // Emergency timeout
              setTimeout(function() {
                window.ReactNativeWebView.postMessage('pdf_loaded');
              }, 3000);
            });
            
            // Handle messages from React Native
            window.addEventListener('message', function(event) {
              if (event.data === 'check_pdf_status') {
                const response = {
                  type: 'pdf_status',
                  visible: document.querySelector('.pdf-viewer')?.offsetHeight > 0,
                  loaded: true
                };
                window.ReactNativeWebView.postMessage(JSON.stringify(response));
              }
            });
          </script>
        </body>
        </html>
      `;
      
      console.log('📄 [PDFViewer] Using base64 embedded PDF');
      setHtmlContent(html);
      
    } catch (base64Error) {
      console.warn('📄 [PDFViewer] Base64 conversion failed:', base64Error.message);
      throw new Error('Failed to prepare PDF for viewing: ' + base64Error.message);
    }
    
  } catch (error) {
    console.error('❌ [PDFViewer] Error preparing PDF:', error);
    setError(error.message || 'Failed to load PDF');
    setSnackbarVisible(true);
    
    // Fallback error HTML
    const errorHtml = createErrorHTML(error.message);
    setHtmlContent(errorHtml);
  } finally {
    setLoading(false);
  }
};

  const createGoogleDocsHTML = (encodedUri) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body, html {
            margin: 0;
            padding: 0;
            height: 100%;
            overflow: hidden;
          }
          iframe {
            width: 100%;
            height: 100%;
            border: none;
          }
        </style>
      </head>
      <body>
        <iframe 
          src="https://docs.google.com/gview?url=${encodedUri}&embedded=true"
          width="100%"
          height="100%"
        ></iframe>
        <script>
          document.addEventListener('DOMContentLoaded', function() {
            const iframe = document.querySelector('iframe');
            iframe.onload = function() {
              window.ReactNativeWebView.postMessage('pdf_loaded');
            };
            iframe.onerror = function() {
              window.ReactNativeWebView.postMessage('pdf_load_error');
            };
          });
        </script>
      </body>
      </html>
    `;
  };

  const createErrorHTML = (errorMessage) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 40px 20px;
            text-align: center;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            height: 100%;
            margin: 0;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
          }
          .card {
            background: white;
            border-radius: 20px;
            padding: 40px;
            max-width: 400px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          }
          .error-icon {
            font-size: 60px;
            color: #ff4757;
            margin-bottom: 20px;
          }
          .error-title {
            color: #333;
            margin-bottom: 10px;
          }
          .error-message {
            color: #666;
            margin-bottom: 30px;
            line-height: 1.6;
          }
          .button {
            display: inline-block;
            padding: 15px 30px;
            background: #6C63FF;
            color: white;
            text-decoration: none;
            border-radius: 50px;
            font-weight: bold;
            margin: 10px;
            border: none;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
          }
          .button:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(0,0,0,0.2);
          }
          .button-external {
            background: #2196F3;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="error-icon">⚠️</div>
          <h2 class="error-title">Unable to Load PDF</h2>
          <p class="error-message">${errorMessage || 'An unknown error occurred while loading the PDF document.'}</p>
          <button class="button" onclick="window.ReactNativeWebView.postMessage('retry')">
            Try Again
          </button>
          <button class="button button-external" onclick="window.ReactNativeWebView.postMessage('open_external')">
            Open in External App
          </button>
        </div>
        <script>
          // Add hover effects
          document.querySelectorAll('.button').forEach(button => {
            button.addEventListener('touchstart', function() {
              this.style.transform = 'translateY(-2px)';
              this.style.boxShadow = '0 10px 20px rgba(0,0,0,0.2)';
            });
            button.addEventListener('touchend', function() {
              this.style.transform = '';
              this.style.boxShadow = '';
            });
          });
        </script>
      </body>
      </html>
    `;
  };

  const handleOpenInExternalViewer = async () => {
    try {
      if (!pdfFile || !pdfFile.uri) {
        Alert.alert('Error', 'No PDF available to open');
        return;
      }
      
      // For Android, we need to create a content URI
      if (Platform.OS === 'android') {
        try {
          // Get content URI for the file
          const contentUri = await FileSystem.getContentUriAsync(pdfFile.uri);
          
          const canOpen = await Linking.canOpenURL(contentUri);
          if (canOpen) {
            await Linking.openURL(contentUri);
          } else {
            // Try sharing as fallback
            await Share.share({
              url: pdfFile.uri,
              title: 'Open PDF',
            });
          }
        } catch (contentUriError) {
          console.warn('Failed to get content URI, trying direct:', contentUriError);
          
          // Try direct file URI
          const canOpen = await Linking.canOpenURL(pdfFile.uri);
          if (canOpen) {
            await Linking.openURL(pdfFile.uri);
          } else {
            // Share as last resort
            await Share.share({
              url: pdfFile.uri,
              title: 'Open PDF',
            });
          }
        }
      } else {
        // iOS - direct file URI should work
        const canOpen = await Linking.canOpenURL(pdfFile.uri);
        if (canOpen) {
          await Linking.openURL(pdfFile.uri);
        } else {
          Alert.alert('Error', 'No app available to open PDF. Please install a PDF reader.');
        }
      }
    } catch (error) {
      console.error('Error opening PDF externally:', error);
      Alert.alert('Error', 'Failed to open PDF: ' + error.message);
    }
  };

  const handleSharePDF = async () => {
    try {
      if (!pdfFile) return;
      
      await Share.share({
        url: pdfFile.uri,
        title: `Share PDF - ${title || 'Document'}`,
        message: `Check out this PDF: ${title || 'Document'}`,
      });
    } catch (error) {
      console.error('Error sharing PDF:', error);
      Alert.alert('Error', 'Failed to share PDF');
    }
  };

  const handleRetry = () => {
    setError(null);
    setHtmlContent('');
    setBase64Content(null);
    preparePDF();
  };

  const handleWebViewMessage = (event) => {
    const message = event.nativeEvent.data;
    console.log('WebView message:', message);
    
    if (message === 'retry') {
      handleRetry();
    } else if (message === 'open_external') {
      handleOpenInExternalViewer();
    } else if (message === 'pdf_loaded') {
      console.log('✅ PDF loaded successfully in WebView');
    } else if (message === 'pdf_load_error') {
      setError('Failed to load PDF in WebView');
      setSnackbarVisible(true);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Appbar.Header>
          <Appbar.BackAction onPress={() => navigation.goBack()} />
          <Appbar.Content title={title || 'PDF Viewer'} />
        </Appbar.Header>
        
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#6C63FF" />
          <Button 
            mode="outlined" 
            onPress={handleRetry}
            style={{ marginTop: 20 }}
          >
            Retry Loading
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title={title || 'PDF Viewer'} />
        <Appbar.Action icon="share" onPress={handleSharePDF} />
        <Appbar.Action icon="open-in-app" onPress={handleOpenInExternalViewer} />
        <Appbar.Action icon="refresh" onPress={handleRetry} />
      </Appbar.Header>
      
      <WebView
        originWhitelist={['*']}
        source={{ html: htmlContent }}
        style={styles.webview}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6C63FF" />
          </View>
        )}
        onMessage={handleWebViewMessage}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('❌ WebView error:', nativeEvent);
          setError(`WebView Error: ${nativeEvent.description}`);
          setSnackbarVisible(true);
        }}
        onLoadEnd={() => {
          console.log('✅ WebView loaded successfully');
        }}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        mixedContentMode="always"
        allowsInlineMediaPlayback={true}
        scalesPageToFit={true}
        useWebKit={true}
      />
      
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        action={{
          label: 'Dismiss',
          onPress: () => setSnackbarVisible(false),
        }}
      >
        {error || 'An error occurred'}
      </Snackbar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
});