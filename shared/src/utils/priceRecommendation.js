/**
 * Price recommendation utilities — shared between API and frontend.
 *
 * diffPercent = ((yourPrice - competitorPrice) / competitorPrice) * 100
 *   negative → you're cheaper, positive → you're more expensive
 */

export function getSuggestion(diffPercent, currencyNote) {
  let suggestion;
  if (diffPercent < -15) {
    suggestion = "You're significantly undercutting. Consider raising your price to capture more margin.";
  } else if (diffPercent < -5) {
    suggestion = "You're well-positioned below the competitor. Your pricing is competitive.";
  } else if (diffPercent < 0) {
    suggestion = 'Prices are very close. Monitor frequently for changes.';
  } else if (diffPercent === 0) {
    suggestion = 'Prices match. Consider differentiating on value-adds or shipping.';
  } else if (diffPercent <= 5) {
    suggestion = 'Slightly above competitor. A small discount could win price-sensitive buyers.';
  } else if (diffPercent <= 15) {
    suggestion = 'Noticeably more expensive. Consider matching or highlighting premium value.';
  } else {
    suggestion = 'Significantly more expensive. Review your pricing strategy or emphasize unique value.';
  }
  if (currencyNote) {
    suggestion += ` (Note: ${currencyNote})`;
  }
  return suggestion;
}

export function getPosition(diffPercent) {
  if (diffPercent < 0) return 'cheaper';
  if (diffPercent === 0) return 'same';
  return 'more_expensive';
}

/**
 * Returns a simple action enum for UI badges.
 *  'increase'  — you're way below market, leaving margin on the table
 *  'decrease'  — you're noticeably above market
 *  'keep'      — you're competitive
 */
export function getAction(diffPercent) {
  if (diffPercent < -15) return 'increase';
  if (diffPercent > 5) return 'decrease';
  return 'keep';
}
