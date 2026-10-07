// R1: τα υπόλοιπα «πλάνα» (λιμάνι, σκηνή, φούρνος).

import { Grad, rand, type BodyProps } from "@/screens/r1-scenes-a";

const CONTAINER_HUES = [20, 200, 60, 140, 330, 95];

export function Harbour({ id, t, hue }: BodyProps) {
  return (
    <>
      <defs>
        <Grad
          id={`${id}-bg`}
          stops={[
            [0, t(15, 0.06)],
            [0.45, t(30, 0.1)],
            [0.6, t(52, 0.1, hue + 25)],
            [0.68, t(74, 0.12, 55)],
            [1, t(20, 0.05)],
          ]}
        />
        <Grad
          id={`${id}-sea`}
          stops={[
            [0, t(30, 0.08)],
            [1, t(9, 0.03)],
          ]}
        />
      </defs>
      <rect width="1600" height="900" fill={`url(#${id}-bg)`} />
      {Array.from({ length: 70 }, (_, i) => (
        <circle
          key={i}
          cx={i * 23 + rand(i) * 18}
          cy={596 + rand(i + 9) * 9}
          r={1.2 + rand(i + 3) * 2}
          fill={t(90, 0.13, 80, 0.85)}
        />
      ))}
      <g stroke={t(8, 0.03)} fill="none" strokeLinecap="square">
        <path
          strokeWidth="9"
          d="M300 612 V220 M196 240 H650 M300 220 L470 240 M300 220 L228 240 M820 612 V300 M756 315 H1090 M820 300 L955 315"
        />
        <path
          strokeWidth="6"
          d="M256 612 L300 470 L344 612 M776 612 L820 500 L864 612"
        />
        <path strokeWidth="2.5" d="M586 240 V432 M1040 315 V470" />
      </g>
      <circle
        className="r1s-blink"
        cx="300"
        cy="211"
        r="7"
        fill={t(66, 0.23, 27)}
      />
      <circle
        className="r1s-blink"
        style={{ animationDelay: "-0.8s" }}
        cx="820"
        cy="291"
        r="7"
        fill={t(66, 0.23, 27)}
      />
      {Array.from({ length: 18 }, (_, i) => (
        <rect
          key={i}
          x={1060 + (i % 9) * 40}
          y={i < 9 ? 556 : 578}
          width="38"
          height="20"
          fill={t(36, 0.09, CONTAINER_HUES[i % 6])}
        />
      ))}
      <path d="M1000 598 L1540 598 L1500 652 L1030 652Z" fill={t(8, 0.02)} />
      <rect x="1430" y="512" width="70" height="86" fill={t(9, 0.02)} />
      {[0, 1, 2].map((i) => (
        <rect
          key={i}
          x={1440 + i * 20}
          y="526"
          width="12"
          height="7"
          fill={t(92, 0.12, 82)}
        />
      ))}
      <rect y="612" width="1600" height="288" fill={`url(#${id}-sea)`} />
      <g filter={`url(#${id}-blur)`}>
        {Array.from({ length: 22 }, (_, i) => (
          <rect
            key={i}
            className="r1s-shimmer"
            style={{ animationDelay: `${-i * 0.41}s` }}
            x={i * 73 + rand(i) * 30}
            y="620"
            width="5"
            height={60 + rand(i + 5) * 140}
            fill={t(85, 0.12, 75, 0.45)}
          />
        ))}
      </g>
    </>
  );
}

const CROWD = (() => {
  let d = "M0 900 L0 800";
  const arms: string[] = [];
  for (let i = 0; i < 41; i++) {
    const x = i * 40;
    const h = 770 + rand(i + 7) * 40;
    d += ` L${x} ${h + 30} Q${x + 4} ${h - 8} ${x + 20} ${h - 10} Q${x + 36} ${h - 8} ${x + 40} ${h + 30}`;
    if (rand(i + 31) > 0.7)
      arms.push(
        `M${x + 12} ${h + 34} L${x + 12 + (rand(i + 2) - 0.5) * 50} ${h - 92}`,
      );
  }
  return { body: `${d} L1600 900Z`, arms: arms.join(" ") };
})();

export function Stage({ id, t, hue }: BodyProps) {
  return (
    <>
      <defs>
        <Grad
          id={`${id}-bg`}
          stops={[
            [0, t(6, 0.02)],
            [0.7, t(16, 0.08)],
            [1, t(24, 0.12)],
          ]}
        />
        <Grad
          id={`${id}-beam`}
          stops={[
            [0, t(96, 0.08, hue + 35, 0.75)],
            [1, t(70, 0.17, hue, 0)],
          ]}
        />
      </defs>
      <rect width="1600" height="900" fill={`url(#${id}-bg)`} />
      <ellipse
        cx="800"
        cy="540"
        rx="780"
        ry="270"
        fill={t(48, 0.15, hue, 0.38)}
        filter={`url(#${id}-soft)`}
      />
      {[180, 500, 800, 1100, 1420].map((x, i) => (
        <polygon
          key={x}
          className="r1s-sway"
          style={{
            transformOrigin: `${x}px 0px`,
            animationDelay: `${-i * 1.3}s`,
            mixBlendMode: "screen",
          }}
          points={`${x - 14},0 ${x + 14},0 ${x + 250},900 ${x - 250},900`}
          fill={`url(#${id}-beam)`}
        />
      ))}
      {[180, 500, 800, 1100, 1420].map((x) => (
        <g key={x}>
          <circle
            cx={x}
            cy="18"
            r="56"
            fill={t(92, 0.1, hue + 35, 0.35)}
            filter={`url(#${id}-blur)`}
          />
          <circle cx={x} cy="18" r="16" fill={t(98, 0.04, hue + 35)} />
        </g>
      ))}
      <path d={CROWD.body} fill={t(5, 0.01)} />
      <path
        d={CROWD.arms}
        stroke={t(5, 0.01)}
        strokeWidth="13"
        strokeLinecap="round"
      />
    </>
  );
}

export function Bakery({ id, t, hue }: BodyProps) {
  return (
    <>
      <defs>
        <Grad
          id={`${id}-bg`}
          stops={[
            [0, t(17, 0.04)],
            [0.65, t(29, 0.07)],
            [1, t(19, 0.05)],
          ]}
        />
        <Grad
          id={`${id}-shaft`}
          stops={[
            [0, t(96, 0.08, 85, 0.5)],
            [1, t(86, 0.1, 80, 0)],
          ]}
        />
      </defs>
      <rect width="1600" height="900" fill={`url(#${id}-bg)`} />
      <rect
        x="1040"
        y="40"
        width="480"
        height="560"
        fill={t(90, 0.11, 80, 0.55)}
        filter={`url(#${id}-soft)`}
      />
      <rect x="1080" y="70" width="400" height="500" fill={t(97, 0.05, 88)} />
      <g fill={t(14, 0.03)}>
        <rect x="1272" y="70" width="14" height="500" />
        <rect x="1080" y="312" width="400" height="12" />
      </g>
      <polygon
        points="1080,90 1480,90 980,900 260,900"
        fill={`url(#${id}-shaft)`}
        style={{ mixBlendMode: "screen" }}
      />
      {Array.from({ length: 26 }, (_, i) => (
        <circle
          key={i}
          className="r1s-drift"
          style={{ animationDelay: `${-i * 0.6}s` }}
          cx={420 + rand(i) * 900}
          cy={180 + rand(i + 50) * 600}
          r={1.4 + rand(i + 9) * 2.4}
          fill={t(96, 0.05, 85, 0.75)}
        />
      ))}
      <path d="M500 0 V176" stroke={t(10, 0.02)} strokeWidth="3" />
      <circle
        cx="500"
        cy="236"
        r="70"
        fill={t(90, 0.12, 80, 0.4)}
        filter={`url(#${id}-soft)`}
      />
      <path d="M426 232 Q500 160 574 232Z" fill={t(10, 0.02)} />
      <circle cx="500" cy="238" r="9" fill={t(98, 0.05, 85)} />
      <path d="M0 722 L1600 700 L1600 900 L0 900Z" fill={t(11, 0.03)} />
      <path
        d="M0 722 L1600 700"
        stroke={t(76, 0.12, hue, 0.6)}
        strokeWidth="3"
      />
      {[380, 540, 700].map((x, i) => (
        <g key={x}>
          <ellipse
            cx={x}
            cy={700 - i * 3}
            rx="74"
            ry="30"
            fill={t(50, 0.13, 58)}
          />
          <ellipse
            cx={x + 6}
            cy={688 - i * 3}
            rx="52"
            ry="11"
            fill={t(80, 0.12, 75, 0.55)}
          />
          <path
            d={`M${x - 30} ${694 - i * 3} l18 -14 M${x - 4} ${694 - i * 3} l18 -14 M${x + 22} ${694 - i * 3} l18 -14`}
            stroke={t(30, 0.08, 50)}
            strokeWidth="4"
          />
        </g>
      ))}
    </>
  );
}
