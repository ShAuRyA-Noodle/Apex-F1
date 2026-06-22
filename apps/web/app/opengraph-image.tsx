import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Apex · Independent Formula 1 fan platform';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #141313 0%, #0F0F0F 100%)',
          padding: '80px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div
            style={{
              width: 56,
              height: 56,
              background: '#E10600',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#E5E2E1',
              fontFamily: 'sans-serif',
              fontWeight: 800,
              fontSize: 32,
            }}
          >
            A
          </div>
          <div
            style={{
              fontFamily: 'sans-serif',
              fontSize: 28,
              color: '#E5E2E1',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
            }}
          >
            Apex
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 30 }}>
          <div
            style={{
              fontFamily: 'sans-serif',
              fontSize: 18,
              letterSpacing: '0.2em',
              color: '#E10600',
              textTransform: 'uppercase',
            }}
          >
            Independent Formula 1
          </div>
          <div
            style={{
              fontFamily: 'sans-serif',
              fontSize: 88,
              fontWeight: 800,
              color: '#E5E2E1',
              lineHeight: 0.95,
              letterSpacing: '-0.04em',
            }}
          >
            Race-day intelligence.
            <br />
            Without the gatekeepers.
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            color: '#8E9192',
            fontFamily: 'sans-serif',
            fontSize: 18,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
          }}
        >
          <span>apex.gg</span>
          <span>Unofficial · Not affiliated with F1 / FIA / FOM</span>
        </div>
      </div>
    ),
    size,
  );
}
