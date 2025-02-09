import { nilql } from "@nillion/nilql";

export class NillionService {
  private static instance: NillionService;
  private secretKey: any; // Replace with proper type from nilql
  private cluster: any; // Replace with proper type from nilql

  private constructor() {
    this.cluster = {"nodes": [{}, {}]}; // Configure your nodes
    this.initializeSecretKey();
  }

  private async initializeSecretKey() {
    this.secretKey = await nilql.SecretKey.generate(this.cluster, {"sum": true});
  }

  static getInstance(): NillionService {
    if (!NillionService.instance) {
      NillionService.instance = new NillionService();
    }
    return NillionService.instance;
  }

  async encrypt(data: any): Promise<string> {
    const encrypted = await nilql.encrypt(this.secretKey, data);
    return encrypted.toString();
  }

  async decrypt(ciphertext: string): Promise<any> {
    return await nilql.decrypt(this.secretKey, BigInt(ciphertext));
  }
} 