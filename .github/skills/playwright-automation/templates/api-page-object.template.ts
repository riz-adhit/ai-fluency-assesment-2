import { APIRequestContext } from '@playwright/test';

/**
 * Page Object Model for [API_NAME] API
 * 
 * This class encapsulates all interactions with the [API_NAME] endpoints.
 * Following POM pattern for API testing.
 */
export class [API_NAME]Api {
  private readonly baseURL: string;

  constructor(private request: APIRequestContext, baseURL?: string) {
    this.baseURL = baseURL || '';
  }

  /**
   * [HTTP_METHOD] [ENDPOINT_PATH]
   * @description [Description of what this endpoint does]
   * @param [param1] - [Description]
   * @returns Promise with API response
   */
  async [methodName]([parameters]): Promise<APIResponse> {
    const response = await this.request.[httpMethod](`${this.baseURL}[endpoint]`, {
      data: {
        // Request body
      },
      headers: {
        // Custom headers if needed
        // 'Authorization': `Bearer ${token}`
      },
      params: {
        // Query parameters
      }
    });

    return response;
  }

  /**
   * Helper method to verify response status and structure
   */
  async verifySuccessResponse(response: APIResponse, expectedStatus: number = 200) {
    if (response.status() !== expectedStatus) {
      const body = await response.text();
      throw new Error(`Expected ${expectedStatus}, got ${response.status()}: ${body}`);
    }
    return await response.json();
  }

  /**
   * Helper method to get error details
   */
  async getErrorDetails(response: APIResponse) {
    try {
      const body = await response.json();
      return {
        status: response.status(),
        error: body.error || 'Unknown error',
        message: body.message || '',
        field: body.field || null
      };
    } catch {
      return {
        status: response.status(),
        error: 'Unable to parse error response',
        message: await response.text()
      };
    }
  }
}

// Export for use in tests
export default [API_NAME]Api;
