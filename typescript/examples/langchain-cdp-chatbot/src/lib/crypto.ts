// Simple encryption/decryption for local storage
// Note: This is a basic implementation. For production, use more secure methods

const ENCRYPTION_KEY = process.env.NEXT_PUBLIC_ENCRYPTION_KEY || 'default-key';

export function encrypt(text: string): string {
  if (typeof window === 'undefined') return text;
  
  try {
    // Simple XOR encryption for demo purposes
    const textToChars = (text: string) => text.split('').map(c => c.charCodeAt(0));
    const byteHex = (n: number) => ("0" + Number(n).toString(16)).substr(-2);
    const applySaltToChar = (code: number) => textToChars(ENCRYPTION_KEY)
      .reduce((a, b) => a ^ b, code);

    return text
      .split('')
      .map(textToChars)
      .map(applySaltToChar)
      .map(byteHex)
      .join('');
  } catch (error) {
    console.error('Encryption failed:', error);
    return text;
  }
}

export function decrypt(encoded: string): string {
  if (typeof window === 'undefined') return encoded;
  
  try {
    // Simple XOR decryption for demo purposes
    const textToChars = (text: string) => text.split('').map(c => c.charCodeAt(0));
    const applySaltToChar = (code: number) => textToChars(ENCRYPTION_KEY)
      .reduce((a, b) => a ^ b, code);
    
    return encoded
      .match(/.{1,2}/g)!
      .map(hex => parseInt(hex, 16))
      .map(applySaltToChar)
      .map(charCode => String.fromCharCode(charCode))
      .join('');
  } catch (error) {
    console.error('Decryption failed:', error);
    return encoded;
  }
}

// For more secure encryption in production, use Web Crypto API:
export async function secureEncrypt(text: string): Promise<string> {
  if (typeof window === 'undefined') return text;
  
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    
    const key = await window.crypto.subtle.importKey(
      'raw',
      encoder.encode(ENCRYPTION_KEY),
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );
    
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );
    
    const encryptedArray = new Uint8Array(encrypted);
    const combined = new Uint8Array(iv.length + encryptedArray.length);
    combined.set(iv);
    combined.set(encryptedArray, iv.length);
    
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('Secure encryption failed:', error);
    return text;
  }
}

export async function secureDecrypt(encoded: string): Promise<string> {
  if (typeof window === 'undefined') return encoded;
  
  try {
    const combined = new Uint8Array(
      atob(encoded).split('').map(c => c.charCodeAt(0))
    );
    
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    
    const key = await window.crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(ENCRYPTION_KEY),
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );
    
    const decrypted = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );
    
    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error('Secure decryption failed:', error);
    return encoded;
  }
} 