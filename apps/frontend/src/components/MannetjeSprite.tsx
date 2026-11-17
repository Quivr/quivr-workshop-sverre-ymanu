// dark-mode-ok-file: the mascot is brand artwork with fixed Quivr yellow/blue
/** The yellow letter Q: a ring with a face in the hole and a tail. */
export function Mannetje({
  isTalking = false,
  isDecorative = false,
}: {
  isTalking?: boolean
  /** Summoned copies are not announced to screen readers. */
  isDecorative?: boolean
}) {
  return (
    <div className="quivr-mannetje-pop h-full w-full">
      <div className="quivr-mannetje-bob h-full w-full">
        <svg
          viewBox="0 0 56 56"
          className="h-full w-full"
          role={isDecorative ? undefined : 'img'}
          aria-label={isDecorative ? undefined : 'quivr-mannetje'}
          aria-hidden={isDecorative || undefined}
        >
          <ellipse
            className="quivr-mannetje-foot quivr-mannetje-foot-left"
            cx="21"
            cy="50"
            rx="5"
            ry="2.5"
            fill="#34495e"
          />
          <ellipse
            className="quivr-mannetje-foot quivr-mannetje-foot-right"
            cx="35"
            cy="50"
            rx="5"
            ry="2.5"
            fill="#34495e"
          />
          {/* Tail of the Q: outline first, drawn under the ring */}
          <path
            d="M32 29 L47 45"
            stroke="#34495e"
            strokeWidth="9"
            strokeLinecap="round"
          />
          <path
            d="M32 29 L47 45"
            stroke="#ffd750"
            strokeWidth="4.5"
            strokeLinecap="round"
          />
          <circle
            cx="28"
            cy="25"
            r="19"
            fill="#ffd750"
            stroke="#34495e"
            strokeWidth="2.5"
          />
          <circle
            cx="28"
            cy="25"
            r="10.5"
            fill="#34495e"
          />
          <g className="quivr-mannetje-look">
            <ellipse
              className="quivr-mannetje-eye"
              cx="24"
              cy="22.5"
              rx="1.9"
              ry="2.8"
              fill="#ffd750"
            />
            <ellipse
              className="quivr-mannetje-eye"
              cx="32"
              cy="22.5"
              rx="1.9"
              ry="2.8"
              fill="#ffd750"
            />
            {isTalking ? (
              <ellipse
                className="quivr-mannetje-mouth-talking"
                cx="28"
                cy="30"
                rx="3.2"
                ry="2.8"
                fill="#ffd750"
              />
            ) : (
              <path
                d="M23.5 28.5 Q28 33 32.5 28.5"
                fill="none"
                stroke="#ffd750"
                strokeWidth="2"
                strokeLinecap="round"
              />
            )}
          </g>
        </svg>
      </div>
    </div>
  )
}
