/* eslint-disable max-len */

const INTRINSIC_WIDTH = 28;
const INTRINSIC_HEIGHT = 24;

export default function IconFeed({
  width = INTRINSIC_WIDTH,
  includeTitle = true,
}: {
  width?: number
  includeTitle?: boolean
}) {
  return (
    <svg
      width={width}
      height={INTRINSIC_HEIGHT * width / INTRINSIC_WIDTH}
      viewBox="0 0 28 28"
      fill="none"
      stroke="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className="hover:opacity-75 transition-opacity"
    >
      {includeTitle && <title>Sobre Wilbor</title>}

      <circle cx="14" cy="14" r="9" strokeWidth="1.5" />
      <path
        d="M14 10v2"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M14 14v4"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
