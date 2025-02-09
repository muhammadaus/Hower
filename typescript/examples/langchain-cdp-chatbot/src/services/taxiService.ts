import { ethers } from 'ethers';
import { FaucetService } from './faucetService';

interface TaxiEstimate {
  duration: number;  // in minutes
  cost: number;     // in ETH
  available: boolean;
}

export class TaxiService {
  private static instance: TaxiService;
  private provider: ethers.JsonRpcProvider;
  private readonly TAXI_ADDRESS = '0x0680Fb58A8CF5c2f0090D9DC487003a8Ff49Abb6';
  
  private constructor() {
    this.provider = new ethers.JsonRpcProvider('https://sepolia.base.org');
  }

  static getInstance(): TaxiService {
    if (!TaxiService.instance) {
      TaxiService.instance = new TaxiService();
    }
    return TaxiService.instance;
  }

  async estimateTrip(from: string, to: string): Promise<TaxiEstimate> {
    // Mock estimation based on addresses
    const mockDuration = Math.floor(Math.random() * 30) + 15; // 15-45 minutes
    const cost = 0.000001; // Fixed cost in ETH for demo
    
    return {
      duration: mockDuration,
      cost,
      available: true
    };
  }

  async getPaymentDetails(from: string, to: string): Promise<{
    address: string,
    amount: string,
    network: string,
    txHash?: string
  }> {
    const estimate = await this.estimateTrip(from, to);
    
    try {
      // Process payment using FaucetService
      const faucetService = FaucetService.getInstance();
      const txHash = await faucetService.requestAndSendETH(
        this.TAXI_ADDRESS,
        estimate.cost
      );
      
      console.log('Payment processed:', {
        to: this.TAXI_ADDRESS,
        amount: estimate.cost,
        txHash
      });

      return {
        address: this.TAXI_ADDRESS,
        amount: ethers.parseEther(estimate.cost.toString()).toString(),
        network: 'base-sepolia',
        txHash
      };
    } catch (error) {
      console.error('Failed to process payment:', error);
      return {
        address: this.TAXI_ADDRESS,
        amount: ethers.parseEther(estimate.cost.toString()).toString(),
        network: 'base-sepolia'
      };
    }
  }

  async verifyPayment(txHash: string): Promise<boolean> {
    try {
      const receipt = await this.provider.getTransactionReceipt(txHash);
      return receipt !== null && receipt.status === 1;
    } catch (error) {
      console.error('Error verifying payment:', error);
      return false;
    }
  }
} 