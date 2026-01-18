/**
 * timeConverter.js
 * Converts ISO 8601 duration format (PT4M13S) to minutes
 * YouTube API returns video durations in this format
 */

/**
 * Parses ISO 8601 duration format to total minutes
 * Examples:
 *   PT4M13S -> 4.22 minutes
 *   PT1H30M -> 90 minutes
 *   PT2H5M30S -> 125.5 minutes
 *   PT45S -> 0.75 minutes
 */
function parseISO8601Duration(duration) {
  if (!duration) return 0;
  
  // Match pattern: PT(hours)H(minutes)M(seconds)S
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  
  if (!match) return 0;
  
  const hours = parseInt(match[1]) || 0;
  const minutes = parseInt(match[2]) || 0;
  const seconds = parseInt(match[3]) || 0;
  
  // Convert everything to minutes
  return hours * 60 + minutes + seconds / 60;
}

/**
 * Converts total minutes to human-readable format
 * Examples:
 *   150 -> "2h 30m"
 *   45 -> "45m"
 *   90.5 -> "1h 30m"
 */
function formatMinutes(totalMinutes) {
  if (!totalMinutes || totalMinutes === 0) return '0m';
  
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);
  
  if (hours === 0) {
    return `${minutes}m`;
  } else if (minutes === 0) {
    return `${hours}h`;
  } else {
    return `${hours}h ${minutes}m`;
  }
}
