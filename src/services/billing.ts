/**
 * Cancels paid billing for a group when the owner deletes it.
 * Wire this to Stripe, RevenueCat, or your billing provider when subscriptions ship.
 */
export async function cancelGroupBilling(
  groupId: string,
  ownerId: string
): Promise<void> {
  if (__DEV__) {
    console.log(
      `[billing] Cancelled billing for group ${groupId} (owner ${ownerId})`
    );
  }
}
