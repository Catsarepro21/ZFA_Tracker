module.exports = {
  plugins: {
    tailwindcss: {},
    // Only use autoprefixer if it's available
    ...((() => {
      try {
        require.resolve('autoprefixer');
        return { autoprefixer: {} };
      } catch (e) {
        console.warn('Autoprefixer not found, CSS will not be prefixed');
        return {};
      }
    })())
  }
};
