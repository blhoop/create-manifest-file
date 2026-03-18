// Global test setup
process.env.ANTHROPIC_API_KEY = 'test-key-sk-ant-test123456789';
process.env.NODE_ENV = 'test';

// Suppress console output during tests (optional)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
// };
