import { ethers } from "ethers";

export class FaucetService {
  private static instance: FaucetService;
  private provider: ethers.JsonRpcProvider | null = null;
  private wallet: ethers.Wallet | null = null;
  private initialized: Promise<void>;
  
  private constructor() {
    this.initialized = this.initializeWallet();
  }

  private async initializeWallet() {
    try {
      console.log('Initializing wallet...');
      
      // Initialize provider first
      this.provider = new ethers.JsonRpcProvider('https://sepolia.base.org');
      await this.provider.ready; // Wait for provider to be ready
      
      const privateKey = process.env.NEXT_PUBLIC_WALLET_PRIVATE_KEY;
      if (!privateKey) {
        throw new Error('Please set NEXT_PUBLIC_WALLET_PRIVATE_KEY in your environment variables');
      }

      // Create wallet with provider
      this.wallet = new ethers.Wallet(privateKey).connect(this.provider);
      
      // Verify wallet is connected
      try {
        const address = await this.wallet.getAddress();
        console.log('Wallet initialized for address:', address);
      } catch (error) {
        throw new Error('Failed to connect wallet to provider');
      }
      
    } catch (error) {
      console.error('Failed to initialize wallet:', error);
      throw error;
    }
  }

  static getInstance(): FaucetService {
    if (!FaucetService.instance) {
      FaucetService.instance = new FaucetService();
    }
    return FaucetService.instance;
  }

  async requestAndSendETH(toAddress: string, amount: number): Promise<string> {
    try {
      await this.initialized;

      if (!this.wallet || !this.provider) {
        throw new Error('Wallet not initialized');
      }

      // Check current balance
      console.log('Checking wallet balance...');
      const currentBalance = await this.provider.getBalance(await this.wallet.getAddress());
      const requiredAmount = ethers.parseEther(amount.toString());
      
      if (currentBalance < requiredAmount) {
        throw new Error(`Insufficient balance. Have: ${ethers.formatEther(currentBalance)} ETH, Need: ${amount} ETH`);
      }

      // Send payment
      console.log('Sending payment to:', toAddress);
      const tx = await this.wallet.sendTransaction({
        to: toAddress,
        value: requiredAmount
      });
      
      await tx.wait();
      console.log('Payment confirmed on blockchain:', tx.hash);

      return tx.hash;
    } catch (error) {
      console.error('Error in payment service:', error);
      throw error;
    }
  }

  async verifyTransaction(txHash: string): Promise<boolean> {
    try {
      await this.initialized;
      if (!this.provider) {
        throw new Error('Provider not initialized');
      }

      const receipt = await this.provider.getTransactionReceipt(txHash);
      return receipt !== null && receipt.status === 1;
    } catch (error) {
      console.error('Error verifying transaction:', error);
      return false;
    }
  }
} 