export default {
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    coverage: {
      reporter: ['text', 'html'],
      include: ['js/**/*.js'],
    },
  },
};
