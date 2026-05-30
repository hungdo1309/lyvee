const appJson = require('./app.json');

const googleIosUrlScheme = process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME;

function configureGoogleSignInPlugin(plugins) {
  return plugins.map((plugin) => {
    const pluginName = Array.isArray(plugin) ? plugin[0] : plugin;
    if (pluginName !== '@react-native-google-signin/google-signin') {
      return plugin;
    }

    if (googleIosUrlScheme) {
      return [
        '@react-native-google-signin/google-signin',
        { iosUrlScheme: googleIosUrlScheme },
      ];
    }

    return plugin;
  });
}

const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

module.exports = ({ config }) => ({
  ...appJson.expo,
  ...config,
  ios: {
    ...appJson.expo.ios,
    infoPlist: {
      ...appJson.expo.ios?.infoPlist,
      ...(googleIosClientId ? { GIDClientID: googleIosClientId } : {}),
    },
  },
  plugins: configureGoogleSignInPlugin(appJson.expo.plugins),
});
