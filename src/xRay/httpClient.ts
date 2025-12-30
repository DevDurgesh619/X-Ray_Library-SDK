export interface XRayClientConfig {
  apiKey: string
  serverUrl: string
}

export class XRayHttpClient {
  private config: XRayClientConfig

  constructor(config: XRayClientConfig) {
    this.config = config
  }

  /**
   * Send execution to X-Ray server
   */
  async sendExecution(execution: any): Promise<{ success: boolean; executionId: string }> {
    const response = await fetch(`${this.config.serverUrl}/api/logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.config.apiKey
      },
      body: JSON.stringify(execution)
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to send execution')
    }

    return response.json()
  }
}
