/**
 * Test Data for [FEATURE_NAME]
 * 
 * Centralized test data management for better maintainability.
 * Data extracted from CSV test cases.
 */

export const [FEATURE_NAME]_TEST_DATA = {
  // Valid data scenarios
  valid: {
    [scenario1]: {
      field1: 'value1',
      field2: 'value2',
      // ...
    },
    [scenario2]: {
      field1: 'value1',
      field2: 'value2',
    }
  },

  // Invalid data scenarios  
  invalid: {
    [scenario1]: {
      field1: 'invalid-value',
      reason: 'Invalid format',
      expectedError: 'Validation failed'
    },
    [scenario2]: {
      field1: '',
      reason: 'Missing required field',
      expectedError: 'field1 is required'
    }
  },

  // Edge cases
  edgeCases: {
    [scenario1]: {
      field1: 'a'.repeat(255), // Max length
      field2: 'edge-case-value'
    },
    [scenario2]: {
      field1: 'a', // Min length
      field2: 'value'
    }
  },

  // Expected responses
  expectedResponses: {
    success: {
      status: 200,
      body: {
        id: expect.any(String),
        created_at: expect.any(String),
        // ...
      }
    },
    validationError: {
      status: 400,
      body: {
        error: 'Validation Error',
        message: expect.any(String),
        field: expect.any(String)
      }
    },
    notFound: {
      status: 404,
      body: {
        error: 'Not Found',
        message: expect.stringContaining('not found')
      }
    }
  },

  // Common test constants
  constants: {
    DEFAULT_TIMEOUT: 5000,
    RETRY_COUNT: 3,
    // ...
  }
};

// Helper function to get random test data
export function getRandomValidData() {
  const scenarios = Object.values([FEATURE_NAME]_TEST_DATA.valid);
  return scenarios[Math.floor(Math.random() * scenarios.length)];
}

// Helper function to create test data with overrides
export function createTestData(overrides: Partial<any> = {}) {
  return {
    ...[FEATURE_NAME]_TEST_DATA.valid[scenario1],
    ...overrides
  };
}

export default [FEATURE_NAME]_TEST_DATA;
