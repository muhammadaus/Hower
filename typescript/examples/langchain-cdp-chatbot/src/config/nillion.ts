export const NILLION_CONFIG = {
  nodes: [
    {
      url: process.env.NILLION_NODE1_URL,
      jwt: process.env.NILLION_NODE1_JWT
    },
    {
      url: process.env.NILLION_NODE2_URL,
      jwt: process.env.NILLION_NODE2_JWT
    }
  ],
  schema: "9b22147f-d6d5-40f1-927d-96c08XXXXXXXX" // Your schema ID
}; 