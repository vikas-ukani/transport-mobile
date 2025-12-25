const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Ensure web platform is properly configured
config.resolver = {
  ...config.resolver,
  platforms: ['ios', 'android', 'native', 'web'],
  sourceExts: [...(config.resolver?.sourceExts || []), 'web.js', 'web.ts', 'web.tsx'],
};

module.exports = withNativeWind(config, { input: './global.css' });
