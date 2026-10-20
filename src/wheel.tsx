import { wheelSectors } from "./wheel-model";
import type { WheelEntry } from "./wheel-model";

export const WHEEL_COLORS = [
  "#f5c64f",
  "#f08068",
  "#74cbb4",
  "#a5b7ea",
  "#e9a1c2",
  "#f6e1ac",
  "#83c5d3",
  "#a99ad9",
];
const SIZE = 500;
const CENTER = SIZE / 2;
const RADIUS = 226;

function point(degrees: number, radius: number) {
  const radians = (degrees * Math.PI) / 180;
  return {
    x: CENTER + Math.cos(radians) * radius,
    y: CENTER + Math.sin(radians) * radius,
  };
}

export function Wheel({
  people,
  rotation,
  spinning,
  duration,
}: {
  people: WheelEntry[];
  rotation: number;
  spinning: boolean;
  duration: number;
}) {
  const count = Math.max(people.length, 1);
  const sectors = wheelSectors(people);
  return (
    <div className={`wheel-assembly ${spinning ? "is-spinning" : ""}`}>
      <div className="wheel-shadow" />
      <div className="pointer">
        <span />
      </div>
      <div className="wheel-rim">
        <div
          className="wheel-disc"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: spinning
              ? `transform ${duration}s cubic-bezier(.12,.64,.12,1)`
              : "none",
          }}
        >
          <svg
            viewBox="0 0 500 500"
            role="img"
            aria-label={`Roleta com ${people.length} ${people.some((person) => person.weight) ? "grupos com fatias proporcionais ao número de pessoas" : "participantes com chances iguais"}`}
          >
            <circle cx="250" cy="250" r="227" fill="#f8c74c" />
            {people.map((person, index) => {
              const sector = sectors[index];
              const step = sector.end - sector.start;
              const start = sector.start - 90;
              const end = sector.end - 90;
              const first = point(start, RADIUS);
              const last = point(end, RADIUS);
              const centerAngle = start + step / 2;
              const label =
                person.name.length > 17
                  ? `${person.name.slice(0, 16)}…`
                  : person.name;
              return (
                <g key={person.id}>
                  {count === 1 ? (
                    <circle
                      cx="250"
                      cy="250"
                      r={RADIUS}
                      fill={WHEEL_COLORS[0]}
                    />
                  ) : (
                    <path
                      d={`M 250 250 L ${first.x} ${first.y} A ${RADIUS} ${RADIUS} 0 ${step > 180 ? 1 : 0} 1 ${last.x} ${last.y} Z`}
                      fill={WHEEL_COLORS[index % WHEEL_COLORS.length]}
                      stroke="#fff4d8"
                      strokeWidth={count > 80 ? ".3" : "1.5"}
                    />
                  )}
                  {count <= 48 && (
                    <text
                      transform={`rotate(${centerAngle} 250 250)`}
                      x="452"
                      y="250"
                      textAnchor="end"
                      dominantBaseline="middle"
                      fill="#17213e"
                      fontSize={count > 24 ? "9" : count > 16 ? "11" : "13.2"}
                      fontWeight="600"
                      letterSpacing=".1"
                    >
                      {label}
                    </text>
                  )}
                </g>
              );
            })}
            {!people.length && (
              <text
                x="250"
                y="125"
                textAnchor="middle"
                fill="#17213e"
                fontSize="19"
              >
                Seu nome pode estar aqui
              </text>
            )}
            <circle
              cx="250"
              cy="250"
              r="226"
              fill="none"
              stroke="#b28c43"
              strokeWidth="2"
            />
          </svg>
        </div>
        <div className="bulbs" aria-hidden="true">
          {Array.from({ length: 48 }, (_, index) => (
            <i
              key={index}
              style={{
                transform: `rotate(${index * 7.5}deg) translateY(calc(var(--wheel-size) * -.478))`,
                animationDelay: `${(index % 3) * 0.15}s`,
              }}
            />
          ))}
        </div>
        <div className="wheel-hub">
          <span>BOA</span>
          <strong>SORTE</strong>
          <i>✦</i>
        </div>
      </div>
      <div className="wheel-pedestal">
        <div />
        <span />
      </div>
    </div>
  );
}
