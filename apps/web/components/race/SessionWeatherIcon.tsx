import {
  bucketFromWeathercode,
  bucketIcon,
  bucketLabel,
} from '@apex/api-client/openmeteo';

/**
 * SessionWeatherIcon · tiny Material Symbols glyph per session row.
 * Sized to drop next to a session label without breaking row height.
 * Returns nothing when there's no weathercode (graceful fade-out).
 */
export function SessionWeatherIcon({
  weathercode,
  size = 16,
}: {
  weathercode: number | null | undefined;
  size?: number;
}) {
  if (weathercode == null) return null;
  const b = bucketFromWeathercode(weathercode);
  if (b === 'unknown') return null;

  const isWet = b === 'rain' || b === 'snow' || b === 'thunderstorm';
  const color = isWet
    ? 'text-telemetry-red'
    : b === 'overcast' || b === 'fog'
      ? 'text-on-surface-variant'
      : 'text-outline';

  return (
    <span
      title={bucketLabel(b)}
      aria-label={bucketLabel(b)}
      className={`material-symbols-outlined inline-block leading-none ${color}`}
      style={{ fontSize: size }}
    >
      {bucketIcon(b)}
    </span>
  );
}
