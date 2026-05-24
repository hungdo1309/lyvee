import { router, type Href } from 'expo-router';

const DEFAULT_HOME = '/(app)/(tabs)' as Href;

/** Close the item modal stack and return to the main app. */
export function dismissItemFlow(href: Href = DEFAULT_HOME) {
  if (router.canDismiss()) {
    router.dismissAll();
    return;
  }
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace(href);
}

/** Leave a modal form screen; falls back to Home when there is no back stack. */
export function dismissFormScreen(href: Href = DEFAULT_HOME) {
  dismissItemFlow(href);
}
