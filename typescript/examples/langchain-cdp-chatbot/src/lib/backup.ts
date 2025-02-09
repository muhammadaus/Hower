import { nilql } from "@nillion/nilql";
import { TimeBlockType, CalendarPresetType } from './schema';

interface BackupConfig {
  nodes: { url: string; jwt: string }[];
  schema: string;
}

export class BackupService {
  private config: BackupConfig;
  private secretKey: any; // nilql.SecretKey type

  constructor(config: BackupConfig) {
    this.config = config;
  }

  async initialize() {
    const cluster = { nodes: this.config.nodes.map(() => ({})) };
    this.secretKey = await nilql.SecretKey.generate(cluster, { "sum": true });
  }

  async encryptSensitiveData(data: any): Promise<string> {
    const plaintext = BigInt(Buffer.from(JSON.stringify(data)).toString('hex'));
    const ciphertext = await nilql.encrypt(this.secretKey, plaintext);
    return ciphertext.toString();
  }

  async backupCalendarData(data: CalendarPresetType) {
    const encryptedData = [];
    
    for (const block of data.timeBlocks) {
      const encryptedBlock = {
        _id: block._id,
        title: await this.encryptSensitiveData(block.title),
        startTime: block.startTime,
        endTime: block.endTime,
        priority: block.priority,
        delegatable: block.delegatable,
        maxBudget: block.maxBudget ? await this.encryptSensitiveData(block.maxBudget) : undefined,
        status: block.status,
        created_at: block.created_at,
        updated_at: block.updated_at
      };
      encryptedData.push(encryptedBlock);
    }

    // Upload to each node
    const results = await Promise.all(
      this.config.nodes.map(node => 
        this.uploadToNode(node, {
          schema: this.config.schema,
          data: encryptedData
        })
      )
    );

    return results;
  }

  private async uploadToNode(node: { url: string; jwt: string }, payload: any) {
    try {
      const response = await fetch(`${node.url}/api/v1/data/create`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${node.jwt}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error uploading to node:', error);
      throw error;
    }
  }
}