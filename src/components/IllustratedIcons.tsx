import React from 'react';
import { DriverId, UpgradeCategory, VehicleId, WorldId } from '../game/types';

/**
 * Panel 1: HILL RUSH – OFFROAD ADVENTURE 3D Slanted Textured Arcade Logo
 */
export const HillRushLogoLockup: React.FC<{ size?: 'lg' | 'md' | 'sm' }> = ({
  size = 'lg',
}) => {
  const scaleClass =
    size === 'lg'
      ? 'w-[340px] sm:w-[480px]'
      : size === 'md'
      ? 'w-[260px] sm:w-[330px]'
      : 'w-[195px]';

  return (
    <div
      className={`${scaleClass} select-none pointer-events-none drop-shadow-[0_10px_16px_rgba(0,0,0,0.75)]`}
    >
      <svg viewBox="0 0 540 200" className="w-full h-auto overflow-visible">
        <defs>
          <linearGradient id="hillRushGold" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFF799" />
            <stop offset="35%" stopColor="#FACC15" />
            <stop offset="75%" stopColor="#F97316" />
            <stop offset="100%" stopColor="#C2410C" />
          </linearGradient>
          <linearGradient id="hillRushBevel" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.65" />
            <stop offset="45%" stopColor="#FDE047" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#7C2D12" stopOpacity="0.5" />
          </linearGradient>
          <linearGradient id="bannerWhite" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="60%" stopColor="#F1F5F9" />
            <stop offset="100%" stopColor="#CBD5E1" />
          </linearGradient>
        </defs>

        <g transform="skewX(-10) rotate(-3 270 95)">
          {/* Deep 3D Extruded Black Block Shadow */}
          <text
            x="276"
            y="108"
            textAnchor="middle"
            fontFamily="'Chakra Petch', sans-serif"
            fontWeight="900"
            fontStyle="italic"
            fontSize="88"
            fill="#090D16"
            stroke="#090D16"
            strokeWidth="24"
            strokeLinejoin="round"
          >
            HILL RUSH
          </text>

          {/* Main Metallic Gold-Orange Lettering */}
          <text
            x="268"
            y="98"
            textAnchor="middle"
            fontFamily="'Chakra Petch', sans-serif"
            fontWeight="900"
            fontStyle="italic"
            fontSize="88"
            fill="url(#hillRushGold)"
            stroke="#111827"
            strokeWidth="10"
            strokeLinejoin="round"
          >
            HILL RUSH
          </text>

          {/* Top Inner Specular Highlight */}
          <text
            x="268"
            y="96"
            textAnchor="middle"
            fontFamily="'Chakra Petch', sans-serif"
            fontWeight="900"
            fontStyle="italic"
            fontSize="88"
            fill="url(#hillRushBevel)"
          >
            HILL RUSH
          </text>

          {/* Slanted White Subtitle Ribbon: OFFROAD ADVENTURE */}
          <rect
            x="64"
            y="116"
            width="412"
            height="46"
            rx="9"
            fill="#090D16"
            transform="translate(5, 7)"
          />
          <rect
            x="64"
            y="116"
            width="412"
            height="46"
            rx="9"
            fill="url(#bannerWhite)"
            stroke="#090D16"
            strokeWidth="5.5"
          />
          <text
            x="270"
            y="148"
            textAnchor="middle"
            fontFamily="'Chakra Petch', sans-serif"
            fontWeight="900"
            fontSize="30"
            letterSpacing="2.5"
            fill="#0F172A"
          >
            OFFROAD ADVENTURE
          </text>
        </g>
      </svg>
    </div>
  );
};

/**
 * Top Riveted Steel & Dual Checkered Flag "VEHICLE SELECTION - Choose Your Ride" Banner
 * (100% Matching the attached Vehicle Selection reference image)
 */
export const VehicleSelectionHeaderBanner: React.FC = () => {
  return (
    <div className="w-[340px] sm:w-[660px] md:w-[760px] select-none pointer-events-none drop-shadow-[0_10px_18px_rgba(0,0,0,0.75)]">
      <svg viewBox="0 0 820 155" className="w-full h-auto overflow-visible">
        <defs>
          <linearGradient id="steelPlateGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#475569" />
            <stop offset="25%" stopColor="#1E293B" />
            <stop offset="80%" stopColor="#0F172A" />
            <stop offset="100%" stopColor="#020617" />
          </linearGradient>
          <linearGradient id="steelRimGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#E2E8F0" />
            <stop offset="50%" stopColor="#64748B" />
            <stop offset="100%" stopColor="#334155" />
          </linearGradient>
          <linearGradient id="silverTextGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="55%" stopColor="#E2E8F0" />
            <stop offset="100%" stopColor="#94A3B8" />
          </linearGradient>
          <linearGradient id="goldTextGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FEF08A" />
            <stop offset="45%" stopColor="#FACC15" />
            <stop offset="100%" stopColor="#EA580C" />
          </linearGradient>
        </defs>

        {/* Left Waving Checkered Flag */}
        <g transform="translate(22, 18) rotate(-10)">
          <path
            d="M0 15 Q45 0 95 12 L110 85 Q60 72 15 88 Z"
            fill="#0F172A"
            stroke="#475569"
            strokeWidth="3"
          />
          {[0, 1, 2, 3].map((row) =>
            [0, 1, 2, 3, 4].map((col) => {
              const isWhite = (row + col) % 2 === 0;
              return (
                <rect
                  key={`l_${row}_${col}`}
                  x={10 + col * 18 + row * 2}
                  y={14 + row * 16}
                  width="18"
                  height="16"
                  fill={isWhite ? '#F8FAFC' : '#090D16'}
                />
              );
            })
          )}
        </g>

        {/* Right Waving Checkered Flag */}
        <g transform="translate(798, 18) scale(-1, 1) rotate(-10)">
          <path
            d="M0 15 Q45 0 95 12 L110 85 Q60 72 15 88 Z"
            fill="#0F172A"
            stroke="#475569"
            strokeWidth="3"
          />
          {[0, 1, 2, 3].map((row) =>
            [0, 1, 2, 3, 4].map((col) => {
              const isWhite = (row + col) % 2 === 0;
              return (
                <rect
                  key={`r_${row}_${col}`}
                  x={10 + col * 18 + row * 2}
                  y={14 + row * 16}
                  width="18"
                  height="16"
                  fill={isWhite ? '#F8FAFC' : '#090D16'}
                />
              );
            })
          )}
        </g>

        {/* Main Riveted Dark Steel Trapezoid Plate */}
        <polygon
          points="105,10 715,10 688,104 132,104"
          fill="url(#steelPlateGrad)"
          stroke="url(#steelRimGrad)"
          strokeWidth="6"
          strokeLinejoin="round"
        />
        <polygon
          points="114,17 706,17 682,97 138,97"
          fill="none"
          stroke="#F59E0B"
          strokeWidth="2"
          strokeOpacity="0.6"
        />

        {/* Corner Steel Bolts / Rivets */}
        {[
          [125, 26],
          [144, 86],
          [695, 26],
          [676, 86],
        ].map(([bx, by], i) => (
          <g key={i}>
            <circle cx={bx} cy={by} r="6" fill="#94A3B8" stroke="#090D16" strokeWidth="2" />
            <line x1={bx - 3} y1={by - 2} x2={bx + 3} y2={by + 2} stroke="#1E293B" strokeWidth="1.5" />
          </g>
        ))}

        {/* Sub-Banner: "Choose Your Ride" with Yellow/Gold Lower Trim */}
        <polygon
          points="220,98 600,98 576,144 244,144"
          fill="#090D16"
          stroke="#FACC15"
          strokeWidth="4"
          strokeLinejoin="round"
        />

        {/* "VEHICLE" in Metallic White & "SELECTION" in Metallic Gold */}
        <g transform="skewX(-8)">
          <text
            x="295"
            y="78"
            textAnchor="middle"
            fontFamily="'Chakra Petch', sans-serif"
            fontWeight="900"
            fontSize="60"
            fill="#000000"
            stroke="#000000"
            strokeWidth="12"
            strokeLinejoin="round"
          >
            VEHICLE
          </text>
          <text
            x="292"
            y="74"
            textAnchor="middle"
            fontFamily="'Chakra Petch', sans-serif"
            fontWeight="900"
            fontSize="60"
            fill="url(#silverTextGrad)"
            stroke="#090D16"
            strokeWidth="4"
          >
            VEHICLE
          </text>

          <text
            x="555"
            y="78"
            textAnchor="middle"
            fontFamily="'Chakra Petch', sans-serif"
            fontWeight="900"
            fontSize="60"
            fill="#000000"
            stroke="#000000"
            strokeWidth="12"
            strokeLinejoin="round"
          >
            SELECTION
          </text>
          <text
            x="552"
            y="74"
            textAnchor="middle"
            fontFamily="'Chakra Petch', sans-serif"
            fontWeight="900"
            fontSize="60"
            fill="url(#goldTextGrad)"
            stroke="#090D16"
            strokeWidth="4"
          >
            SELECTION
          </text>
        </g>

        {/* "Choose Your Ride" */}
        <text
          x="410"
          y="131"
          textAnchor="middle"
          fontFamily="'Chakra Petch', sans-serif"
          fontWeight="800"
          fontStyle="italic"
          fontSize="31"
          fill="#FFFFFF"
        >
          Choose Your Ride
        </text>
      </svg>
    </div>
  );
};

/**
 * 100% Faithful Illustrated Vehicle Art for all vehicles matching the user's attached reference image:
 * - 'jeep': Red Offroad Jeep with 4 roof floodlights, white mountain door decal, winch bumper, spare tire
 * - 'monster': Blue Monster Truck with hot-rod yellow/orange/red flames, 4 roof floodlights, lifted purple shocks, giant mud tires
 * - 'buggy': Golden-Yellow Dune Buggy sand-rail roll cage with flame panels, 4 roof lights, red coil shocks
 * - 'dirtbike': Lime-Green #27 Motocross Dirt Bike with gold forks, chrome exhaust, wire-spoke wheels
 * - 'rally': Metallic Blue #23 WRC Rally Car with white twin racing stripes, rear spoiler, yellow fog lamps
 * - 'pickup': Heavy Orange 6x6 Expedition Truck
 */
export const IllustratedVehicleArt: React.FC<{
  vehicleId: VehicleId;
  primaryColor: string;
  secondaryColor: string;
  className?: string;
  tilted?: boolean;
}> = ({ vehicleId, primaryColor, secondaryColor, className = 'w-64 h-40', tilted = false }) => {
  return (
    <svg
      viewBox="0 0 320 210"
      className={`${className} overflow-visible select-none`}
      style={tilted ? { transform: 'rotate(-14deg)' } : undefined}
    >
      <defs>
        <linearGradient id="jeepRedGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FF3B30" />
          <stop offset="60%" stopColor="#DC2626" />
          <stop offset="100%" stopColor="#7F1D1D" />
        </linearGradient>
        <linearGradient id="monsterBlueGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="55%" stopColor="#0284C7" />
          <stop offset="100%" stopColor="#1E3A8A" />
        </linearGradient>
        <linearGradient id="buggyGoldGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="55%" stopColor="#FACC15" />
          <stop offset="100%" stopColor="#CA8A04" />
        </linearGradient>
        <linearGradient id="rallyBlueGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="60%" stopColor="#1D4ED8" />
          <stop offset="100%" stopColor="#1E1B4B" />
        </linearGradient>
        <linearGradient id="flameGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="45%" stopColor="#F97316" />
          <stop offset="100%" stopColor="#DC2626" />
        </linearGradient>
      </defs>

      {/* Ground Contact Shadow */}
      <ellipse cx="160" cy="186" rx="124" ry="13" fill="rgba(0,0,0,0.52)" />

      {vehicleId === 'monster' ? (
        /* =========================================================
           2. MONSTER TRUCK (Blue Pickup + Hot-Rod Flames + Giant Tires)
           ========================================================= */
        <g>
          {/* High-Lift Chassis Frame & Purple/Silver Dual Shocks */}
          <rect x="78" y="96" width="164" height="14" rx="4" fill="#1E293B" stroke="#090D16" strokeWidth="2.5" />
          {/* Rear Dual Shocks */}
          <line x1="88" y1="78" x2="78" y2="140" stroke="#CBD5E1" strokeWidth="6" />
          <path d="M80 86 L92 92 L78 98 L90 104 L76 110 L88 116" fill="none" stroke="#A855F7" strokeWidth="4" />
          <line x1="104" y1="78" x2="96" y2="140" stroke="#94A3B8" strokeWidth="5" />
          {/* Front Dual Shocks */}
          <line x1="218" y1="78" x2="232" y2="140" stroke="#CBD5E1" strokeWidth="6" />
          <path d="M214 86 L226 92 L216 98 L228 104 L218 110 L230 116" fill="none" stroke="#A855F7" strokeWidth="4" />
          <line x1="202" y1="78" x2="214" y2="140" stroke="#94A3B8" strokeWidth="5" />

          {/* Heavy Axle Differential Truss */}
          <line x1="82" y1="142" x2="234" y2="142" stroke="#334155" strokeWidth="8" />
          <circle cx="158" cy="142" r="11" fill="#475569" stroke="#090D16" strokeWidth="2.5" />

          {/* Roof Bar with 4 Round Offroad Floodlights */}
          <rect x="136" y="16" width="44" height="6" rx="2" fill="#18181B" />
          {[142, 152, 162, 172].map((lx, idx) => (
            <g key={idx}>
              <circle cx={lx} cy="13" r="5.5" fill="#18181B" stroke="#090D16" strokeWidth="1.5" />
              <circle cx={lx} cy="13" r="3.8" fill="#FEF08A" />
            </g>
          ))}

          {/* Lifted Blue Pickup Truck Body */}
          <path
            d="M44 54 L106 54 L124 22 L192 22 L214 52 L272 58 L276 88 L44 88 Z"
            fill="url(#monsterBlueGrad)"
            stroke="#090D16"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />

          {/* Cab Windows */}
          <polygon points="129,27 160,27 160,52 114,52" fill="#1E293B" stroke="#090D16" strokeWidth="2" />
          <polygon points="166,27 189,27 207,52 166,52" fill="#38BDF8" fillOpacity="0.65" stroke="#090D16" strokeWidth="2" />

          {/* Iconic Yellow/Orange/Red Hot-Rod Flame Decals across Doors & Fenders */}
          <path
            d="M250 62 L195 58 L212 66 L158 60 L185 71 L122 66 L162 78 L112 79 L155 85 L252 84 Z"
            fill="url(#flameGrad)"
            stroke="#7C2D12"
            strokeWidth="1.5"
          />

          {/* Chrome Front Grille & Heavy Bumper */}
          <rect x="264" y="60" width="14" height="22" rx="3" fill="#E2E8F0" stroke="#090D16" strokeWidth="2.5" />
          <line x1="266" y1="66" x2="276" y2="66" stroke="#1E293B" strokeWidth="2" />
          <line x1="266" y1="71" x2="276" y2="71" stroke="#1E293B" strokeWidth="2" />
          <line x1="266" y1="76" x2="276" y2="76" stroke="#1E293B" strokeWidth="2" />
          <rect x="258" y="82" width="24" height="10" rx="3" fill="#CBD5E1" stroke="#090D16" strokeWidth="2.5" />

          {/* Giant Deep-Lug Monster Truck Tires (Rear & Front) */}
          {[82, 232].map((wx, idx) => (
            <g key={idx} transform={`translate(${wx}, 140)`}>
              {/* Outer Mud Cleats */}
              <circle
                cx="0"
                cy="0"
                r="46"
                fill="none"
                stroke="#18181B"
                strokeWidth="9"
                strokeDasharray="11 6"
              />
              <circle cx="0" cy="0" r="43" fill="#18181B" stroke="#09090B" strokeWidth="3.5" />
              {/* Tire tread ribs */}
              <circle cx="0" cy="0" r="33" fill="none" stroke="#27272A" strokeWidth="4" strokeDasharray="8 5" />
              {/* Deep Dish Purple & Silver Beadlock Rim */}
              <circle cx="0" cy="0" r="22" fill="#581C87" stroke="#090D16" strokeWidth="3" />
              <circle cx="0" cy="0" r="16" fill="#CBD5E1" stroke="#1E293B" strokeWidth="2" />
              <circle cx="0" cy="0" r="7" fill="#7E22CE" />
            </g>
          ))}
        </g>
      ) : vehicleId === 'buggy' ? (
        /* =========================================================
           3. DUNE BUGGY (Golden-Yellow Sand-Rail Roll Cage + Flames)
           ========================================================= */
        <g>
          {/* Exposed Red Front & Rear Coil-Over Shocks */}
          <line x1="88" y1="92" x2="78" y2="146" stroke="#E2E8F0" strokeWidth="5.5" />
          <path d="M82 98 L92 104 L80 110 L90 116 L78 122 L88 128" fill="none" stroke="#EF4444" strokeWidth="4" />
          <line x1="220" y1="88" x2="238" y2="146" stroke="#E2E8F0" strokeWidth="5.5" />
          <path d="M218 96 L230 102 L220 108 L232 114 L222 120 L234 126" fill="none" stroke="#EF4444" strokeWidth="4" />

          {/* Racing Bucket Seat & Driver */}
          <path d="M126 56 L142 56 L148 96 L122 96 Z" fill="#18181B" stroke="#EF4444" strokeWidth="2" />
          <circle cx="144" cy="52" r="12" fill="#1E293B" stroke="#FACC15" strokeWidth="2.5" />
          <path d="M148 48 L156 52 L148 56 Z" fill="#EF4444" />

          {/* Lower Flame Body Panel */}
          <path
            d="M62 92 L112 72 L218 76 L262 96 L248 118 L70 118 Z"
            fill="url(#buggyGoldGrad)"
            stroke="#090D16"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
          {/* Red/Orange Flame Graphic on Side Panel */}
          <path
            d="M90 112 L135 84 L128 98 L178 84 L164 102 L224 94 L182 114 Z"
            fill="url(#flameGrad)"
          />

          {/* Golden-Yellow Tubular Sand-Rail Roll Cage */}
          <path
            d="M66 92 L106 38 L186 38 L244 92 M106 38 L146 92 M186 38 L152 92 M66 92 L114 64"
            fill="none"
            stroke="#FACC15"
            strokeWidth="7.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M66 92 L106 38 L186 38 L244 92"
            fill="none"
            stroke="#FEF08A"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* 4 Round Roof Floodlights on Top Bar */}
          {[132, 146, 160, 174].map((lx, idx) => (
            <g key={idx}>
              <circle cx={lx} cy="30" r="6.5" fill="#18181B" stroke="#090D16" strokeWidth="2" />
              <circle cx={lx} cy="30" r="4.5" fill="#FEF9C3" />
            </g>
          ))}

          {/* Rear & Front Knobby Buggy Tires */}
          {[78, 238].map((wx, idx) => {
            const r = idx === 0 ? 39 : 35;
            return (
              <g key={idx} transform={`translate(${wx}, 146)`}>
                <circle
                  cx="0"
                  cy="0"
                  r={r}
                  fill="none"
                  stroke="#18181B"
                  strokeWidth="7"
                  strokeDasharray="9 5"
                />
                <circle cx="0" cy="0" r={r - 2} fill="#18181B" stroke="#09090B" strokeWidth="3" />
                <circle cx="0" cy="0" r={r * 0.54} fill="#64748B" stroke="#090D16" strokeWidth="2.5" />
                <circle cx="0" cy="0" r={r * 0.36} fill="#1E293B" />
                <circle cx="0" cy="0" r="6" fill="#FACC15" />
              </g>
            );
          })}
        </g>
      ) : vehicleId === 'dirtbike' ? (
        /* =========================================================
           4. DIRT BIKE (Lime-Green #27 Motocross Bike + Gold Forks)
           ========================================================= */
        <g>
          {/* Rear Swingarm & Suspension Monoshock */}
          <line x1="145" y1="108" x2="82" y2="146" stroke="#CBD5E1" strokeWidth="8" strokeLinecap="round" />
          <line x1="142" y1="78" x2="115" y2="122" stroke="#FACC15" strokeWidth="6" />

          {/* Chrome Exhaust Pipe & Muffler */}
          <path
            d="M158 106 Q128 84 88 76 L72 82 L116 96"
            fill="#94A3B8"
            stroke="#090D16"
            strokeWidth="2.5"
          />

          {/* Silver Engine Crankcase & Frame */}
          <polygon
            points="135,84 182,84 176,120 140,120"
            fill="#94A3B8"
            stroke="#090D16"
            strokeWidth="3"
          />
          <circle cx="152" cy="108" r="10" fill="#475569" stroke="#090D16" strokeWidth="2" />

          {/* Long Gold Inverted Motocross Front Forks */}
          <line x1="194" y1="42" x2="238" y2="146" stroke="#FACC15" strokeWidth="8" strokeLinecap="round" />
          <line x1="188" y1="45" x2="232" y2="146" stroke="#CA8A04" strokeWidth="5" strokeLinecap="round" />

          {/* Handlebars & Grips */}
          <line x1="194" y1="42" x2="178" y2="28" stroke="#18181B" strokeWidth="5" strokeLinecap="round" />
          <circle cx="176" cy="27" r="4" fill="#22C55E" />

          {/* Lime-Green Motocross Plastics, High Front Fender & Rear Tail */}
          <path
            d="M62 66 L128 74 L168 62 L206 46 L216 68 L176 92 L124 88 Z"
            fill="#22C55E"
            stroke="#090D16"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          {/* High Curved Front Mudguard */}
          <path
            d="M204 64 Q236 62 254 84 Q228 76 202 76 Z"
            fill="#22C55E"
            stroke="#090D16"
            strokeWidth="2.5"
          />
          {/* Black Gripper Seat */}
          <path d="M104 68 Q138 72 166 58 L156 72 L102 74 Z" fill="#18181B" />

          {/* White & Green "#27" Number Plate */}
          <polygon points="188,44 210,48 206,68 186,64" fill="#FFFFFF" stroke="#090D16" strokeWidth="2" />
          <text
            x="198"
            y="61"
            textAnchor="middle"
            fontFamily="'Chakra Petch', sans-serif"
            fontWeight="900"
            fontSize="13"
            fill="#090D16"
          >
            27
          </text>

          {/* Wire-Spoke Knobby Motocross Wheels */}
          {[82, 236].map((wx, idx) => (
            <g key={idx} transform={`translate(${wx}, 146)`}>
              <circle
                cx="0"
                cy="0"
                r="37"
                fill="none"
                stroke="#18181B"
                strokeWidth="6"
                strokeDasharray="7 5"
              />
              <circle cx="0" cy="0" r="35" fill="none" stroke="#18181B" strokeWidth="7" />
              <circle cx="0" cy="0" r="27" fill="none" stroke="#CBD5E1" strokeWidth="3.5" />
              {/* Wire Spokes */}
              {Array.from({ length: 8 }).map((_, sp) => {
                const a = (sp * Math.PI) / 4;
                return (
                  <line
                    key={sp}
                    x1={Math.cos(a) * -26}
                    y1={Math.sin(a) * -26}
                    x2={Math.cos(a) * 26}
                    y2={Math.sin(a) * 26}
                    stroke="#E2E8F0"
                    strokeWidth="1.5"
                  />
                );
              })}
              <circle cx="0" cy="0" r="7" fill="#22C55E" stroke="#090D16" strokeWidth="2" />
            </g>
          ))}
        </g>
      ) : vehicleId === 'rally' ? (
        /* =========================================================
           5. RALLY CAR (Metallic Blue #23 WRC Coupe + White Stripes)
           ========================================================= */
        <g>
          {/* Rear Aerodynamic WRC Wing Spoiler */}
          <path
            d="M46 66 L36 42 L58 42 L58 48 L48 66 Z"
            fill="#1D4ED8"
            stroke="#090D16"
            strokeWidth="2.5"
          />

          {/* Main Aerodynamic Metallic Blue Rally Coupe Body */}
          <path
            d="M42 78 L68 74 L106 42 L192 42 L232 74 L282 86 L286 124 L42 124 Z"
            fill="url(#rallyBlueGrad)"
            stroke="#090D16"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />

          {/* White Racing Stripe Diagonal Livery & Hood Stripes */}
          <polygon points="72,74 96,74 78,122 54,122" fill="#FFFFFF" opacity="0.92" />
          <polygon points="224,74 274,84 266,94 216,80" fill="#FFFFFF" opacity="0.92" />

          {/* Tinted Rally Cabin Windows & Roll Bar */}
          <polygon points="112,48 152,48 152,74 82,74" fill="#0F172A" stroke="#CBD5E1" strokeWidth="1.5" />
          <polygon points="158,48 188,48 222,74 158,74" fill="#38BDF8" fillOpacity="0.6" stroke="#CBD5E1" strokeWidth="1.5" />

          {/* White Door Number Plate "23" */}
          <rect
            x="132"
            y="82"
            width="38"
            height="30"
            rx="4"
            fill="#FFFFFF"
            stroke="#090D16"
            strokeWidth="2"
          />
          <text
            x="151"
            y="104"
            textAnchor="middle"
            fontFamily="'Chakra Petch', sans-serif"
            fontWeight="900"
            fontSize="22"
            fill="#090D16"
          >
            23
          </text>

          {/* Front Splitter, Grille & Yellow Rally Fog Lamps */}
          <rect x="272" y="96" width="14" height="18" rx="3" fill="#0F172A" />
          <circle cx="266" cy="92" r="6" fill="#FEF08A" stroke="#090D16" strokeWidth="2" />
          <circle cx="268" cy="112" r="4.5" fill="#FACC15" stroke="#090D16" strokeWidth="1.5" />

          {/* Low-Profile Tarmac/Gravel Multi-Spoke Wheels with Red Calipers */}
          {[88, 232].map((wx, idx) => (
            <g key={idx} transform={`translate(${wx}, 136)`}>
              <circle cx="0" cy="0" r="32" fill="#18181B" stroke="#09090B" strokeWidth="3.5" />
              <circle cx="0" cy="0" r="22" fill="#334155" stroke="#94A3B8" strokeWidth="2.5" />
              {/* Red Brake Caliper */}
              <path d="M-14 -10 A16 16 0 0 1 -4 -18 L-2 -10 Z" fill="#EF4444" />
              {Array.from({ length: 6 }).map((_, sp) => {
                const a = (sp * Math.PI) / 3;
                return (
                  <line
                    key={sp}
                    x1="0"
                    y1="0"
                    x2={Math.cos(a) * 20}
                    y2={Math.sin(a) * 20}
                    stroke="#CBD5E1"
                    strokeWidth="3"
                  />
                );
              })}
              <circle cx="0" cy="0" r="5" fill="#EF4444" />
            </g>
          ))}
        </g>
      ) : (
        /* =========================================================
           1. OFFROAD JEEP (Red 4x4 Wrangler + 4 Roof Lights + Mountain Decal)
           ========================================================= */
        <g>
          {/* Rear-Mounted Spare Tire */}
          <g transform="translate(34, 62) rotate(-10)">
            <rect
              x="0"
              y="0"
              width="24"
              height="56"
              rx="6"
              fill="#18181B"
              stroke="#09090B"
              strokeWidth="3"
            />
            <line x1="2" y1="12" x2="22" y2="12" stroke="#3F3F46" strokeWidth="3" />
            <line x1="2" y1="28" x2="22" y2="28" stroke="#3F3F46" strokeWidth="3" />
            <line x1="2" y1="44" x2="22" y2="44" stroke="#3F3F46" strokeWidth="3" />
          </g>

          {/* Visible Suspension Shocks & Solid Axles */}
          <line x1="88" y1="124" x2="232" y2="124" stroke="#1E293B" strokeWidth="8" />
          <line x1="92" y1="96" x2="88" y2="144" stroke="#E2E8F0" strokeWidth="6" />
          <path
            d="M86 102 L98 107 L85 113 L97 119 L84 125 L96 131"
            fill="none"
            stroke="#EF4444"
            strokeWidth="3.5"
          />
          <line x1="226" y1="96" x2="232" y2="144" stroke="#E2E8F0" strokeWidth="6" />
          <path
            d="M222 102 L234 107 L223 113 L235 119 L224 125 L236 131"
            fill="none"
            stroke="#EF4444"
            strokeWidth="3.5"
          />

          {/* Black Roof Rack & 4 Round Roof Floodlights (Matching Reference Image) */}
          <rect x="66" y="24" width="124" height="6" rx="3" fill="#18181B" />
          {[142, 156, 170, 184].map((lx, idx) => (
            <g key={idx}>
              <circle cx={lx} cy="19" r="6" fill="#18181B" stroke="#090D16" strokeWidth="2" />
              <circle cx={lx} cy="19" r="4" fill="#FEF08A" />
            </g>
          ))}

          {/* Hardtop & Roll Cage Cabin */}
          <path
            d="M54 78 L66 30 L186 30 L206 78 Z"
            fill="#18181B"
            stroke="#090D16"
            strokeWidth="4"
            strokeLinejoin="round"
          />
          {/* Rear & Front Side Windows */}
          <polygon points="68,38 116,38 116,72 60,72" fill="#334155" stroke="#090D16" strokeWidth="2" />
          <polygon points="124,38 180,38 196,72 124,72" fill="#38BDF8" fillOpacity="0.55" stroke="#090D16" strokeWidth="2" />

          {/* Main Glossy Red Wrangler Bodywork */}
          <path
            d="M50 76 L208 76 L264 82 L268 118 L50 118 Z"
            fill={vehicleId === 'pickup' ? primaryColor : 'url(#jeepRedGrad)'}
            stroke="#090D16"
            strokeWidth="4"
            strokeLinejoin="round"
          />

          {/* Specular Highlight Strip */}
          <rect
            x="56"
            y="80"
            width="200"
            height="7"
            rx="3.5"
            fill="rgba(255,255,255,0.32)"
          />

          {/* White Mountain Peak Graphic Decal on Side Door (Exact match to Offroad Jeep in Reference Image) */}
          <polygon
            points="106,112 124,88 136,102 148,84 168,112"
            fill="#FFFFFF"
            opacity="0.92"
          />
          <polygon
            points="114,112 124,98 134,112"
            fill="#DC2626"
          />

          {/* Black Offroad Wheel Arch Fenders */}
          <path
            d="M54 120 A 42 42 0 0 1 128 120"
            fill="none"
            stroke="#18181B"
            strokeWidth="12"
            strokeLinecap="round"
          />
          <path
            d="M192 120 A 42 42 0 0 1 266 120"
            fill="none"
            stroke="#18181B"
            strokeWidth="12"
            strokeLinecap="round"
          />

          {/* Front Grille, Headlight & Heavy Winch Bumper with Red Tow Hook */}
          <rect
            x="258"
            y="84"
            width="14"
            height="28"
            rx="3"
            fill="#18181B"
            stroke="#090D16"
            strokeWidth="2.5"
          />
          <circle
            cx="264"
            cy="93"
            r="6.5"
            fill="#FEF08A"
            stroke="#090D16"
            strokeWidth="2"
          />
          <rect
            x="254"
            y="108"
            width="28"
            height="12"
            rx="4"
            fill="#1E293B"
            stroke="#090D16"
            strokeWidth="2.5"
          />
          {/* Red Winch Tow Hook */}
          <rect x="272" y="111" width="8" height="6" rx="2" fill="#EF4444" />

          {/* Rear & Front Knobby Offroad Tires */}
          {[90, 230].map((wx, idx) => (
            <g key={idx} transform={`translate(${wx}, 142)`}>
              <circle cx="0" cy="0" r="36" fill="#18181B" stroke="#09090B" strokeWidth="4" />
              <circle
                cx="0"
                cy="0"
                r="36"
                fill="none"
                stroke="#27272A"
                strokeWidth="6"
                strokeDasharray="9 6"
              />
              <circle cx="0" cy="0" r="20" fill="#94A3B8" stroke="#0F172A" strokeWidth="3" />
              <circle cx="0" cy="0" r="14" fill="#1E293B" />
              <line x1="-18" y1="0" x2="18" y2="0" stroke="#CBD5E1" strokeWidth="3.5" />
              <line x1="-9" y1="-16" x2="9" y2="16" stroke="#CBD5E1" strokeWidth="3.5" />
              <line x1="9" y1="-16" x2="-9" y2="16" stroke="#CBD5E1" strokeWidth="3.5" />
              <circle cx="0" cy="0" r="5.5" fill="#EF4444" stroke="#0F172A" strokeWidth="2" />
            </g>
          ))}
        </g>
      )}
    </svg>
  );
};

/**
 * Panel 4: Custom Illustrated Upgrade Icons (Piston, Coil Shock, Tire, Fuel Jerrycan, Grip, Gyro)
 */
export const UpgradePartIcon: React.FC<{ category: UpgradeCategory }> = ({
  category,
}) => {
  switch (category) {
    case 'engine':
      return (
        <svg viewBox="0 0 80 80" className="w-16 h-16">
          <g transform="rotate(28 40 40)">
            <rect
              x="22"
              y="10"
              width="36"
              height="28"
              rx="4"
              fill="#CBD5E1"
              stroke="#0F172A"
              strokeWidth="3"
            />
            <line x1="22" y1="17" x2="58" y2="17" stroke="#475569" strokeWidth="2.5" />
            <line x1="22" y1="23" x2="58" y2="23" stroke="#475569" strokeWidth="2.5" />
            <circle cx="40" cy="29" r="5" fill="#334155" />
            <path
              d="M35 38 L32 60 L48 60 L45 38 Z"
              fill="#94A3B8"
              stroke="#0F172A"
              strokeWidth="3"
            />
            <circle
              cx="40"
              cy="64"
              r="10"
              fill="#CBD5E1"
              stroke="#0F172A"
              strokeWidth="3"
            />
            <circle cx="40" cy="64" r="5" fill="#1E293B" />
          </g>
        </svg>
      );
    case 'suspension':
      return (
        <svg viewBox="0 0 80 80" className="w-16 h-16">
          <g transform="rotate(32 40 40)">
            <circle cx="40" cy="12" r="5" fill="#94A3B8" stroke="#0F172A" strokeWidth="2.5" />
            <circle cx="40" cy="68" r="5" fill="#94A3B8" stroke="#0F172A" strokeWidth="2.5" />
            <rect
              x="35"
              y="16"
              width="10"
              height="48"
              fill="#E2E8F0"
              stroke="#0F172A"
              strokeWidth="2.5"
            />
            <path
              d="M28 24 L52 29 L28 35 L52 41 L28 47 L52 53 L28 58"
              fill="none"
              stroke="#FACC15"
              strokeWidth="5.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        </svg>
      );
    case 'tires':
    case 'grip':
      return (
        <svg viewBox="0 0 80 80" className="w-16 h-16">
          <circle cx="40" cy="40" r="28" fill="#18181B" stroke="#09090B" strokeWidth="3.5" />
          <circle
            cx="40"
            cy="40"
            r="28"
            fill="none"
            stroke="#3F3F46"
            strokeWidth="5"
            strokeDasharray="7 5"
          />
          <circle cx="40" cy="40" r="16" fill="#CBD5E1" stroke="#0F172A" strokeWidth="2.5" />
          <line x1="24" y1="40" x2="56" y2="40" stroke="#475569" strokeWidth="3.5" />
          <line x1="40" y1="24" x2="40" y2="56" stroke="#475569" strokeWidth="3.5" />
          <circle cx="40" cy="40" r="5" fill="#F59E0B" />
        </svg>
      );
    case 'fuel':
    default:
      return (
        <svg viewBox="0 0 80 80" className="w-16 h-16">
          <rect
            x="20"
            y="20"
            width="40"
            height="48"
            rx="6"
            fill="#EF4444"
            stroke="#450A0A"
            strokeWidth="3"
          />
          <rect
            x="28"
            y="12"
            width="18"
            height="9"
            rx="2"
            fill="#DC2626"
            stroke="#450A0A"
            strokeWidth="2.5"
          />
          <polygon
            points="48,20 56,11 61,15 54,23"
            fill="#FACC15"
            stroke="#450A0A"
            strokeWidth="2"
          />
          <line x1="28" y1="32" x2="52" y2="58" stroke="#FCA5A5" strokeWidth="3.5" />
          <line x1="52" y1="32" x2="28" y2="58" stroke="#FCA5A5" strokeWidth="3.5" />
        </svg>
      );
  }
};

/**
 * Panel 5: World Selection Illustrated Landscape Artwork
 */
export const WorldLandscapeThumb: React.FC<{ worldId: WorldId }> = ({ worldId }) => {
  switch (worldId) {
    case 'green_valley':
      return (
        <svg viewBox="0 0 240 130" className="w-full h-full object-cover">
          <rect width="240" height="130" fill="#38BDF8" />
          <polygon points="20,95 75,30 130,95" fill="#3B82F6" />
          <polygon points="75,30 56,55 94,55" fill="#FFFFFF" />
          <polygon points="110,95 175,24 235,95" fill="#2563EB" />
          <polygon points="175,24 152,54 198,54" fill="#F8FAFC" />
          <path d="M0 95 Q60 68 130 90 T240 82 L240 130 L0 130 Z" fill="#16A34A" />
          <path d="M0 108 Q90 84 240 104 L240 130 L0 130 Z" fill="#4ADE80" />
          <polygon points="28,55 14,98 42,98" fill="#14532D" />
          <polygon points="210,50 194,96 226,96" fill="#14532D" />
        </svg>
      );
    case 'desert_run':
      return (
        <svg viewBox="0 0 240 130" className="w-full h-full object-cover">
          <rect width="240" height="130" fill="#FDBA74" />
          <circle cx="190" cy="36" r="20" fill="#FEF08A" />
          <polygon points="30,95 85,48 145,95" fill="#C2410C" />
          <polygon points="120,95 175,54 230,95" fill="#9A3412" />
          <path d="M0 94 Q75 70 155 92 T240 86 L240 130 L0 130 Z" fill="#F59E0B" />
          <path d="M0 108 Q110 88 240 106 L240 130 L0 130 Z" fill="#D97706" />
          <rect x="44" y="64" width="8" height="36" rx="4" fill="#15803D" />
          <rect x="36" y="74" width="24" height="6" rx="3" fill="#15803D" />
        </svg>
      );
    case 'snow_mountains':
      return (
        <svg viewBox="0 0 240 130" className="w-full h-full object-cover">
          <rect width="240" height="130" fill="#60A5FA" />
          <polygon points="15,100 85,20 155,100" fill="#EFF6FF" />
          <polygon points="85,20 155,100 120,100" fill="#BFDBFE" />
          <polygon points="105,100 175,28 240,100" fill="#FFFFFF" />
          <path d="M0 98 Q80 78 240 96 L240 130 L0 130 Z" fill="#E0F2FE" />
          <polygon points="32,58 18,100 46,100" fill="#1E3A8A" />
          <polygon points="205,54 190,100 220,100" fill="#1E3A8A" />
        </svg>
      );
    case 'dark_forest':
      return (
        <svg viewBox="0 0 240 130" className="w-full h-full object-cover">
          <rect width="240" height="130" fill="#0F292E" />
          <circle cx="185" cy="34" r="16" fill="#A7F3D0" opacity="0.8" />
          <polygon points="25,20 8,105 42,105" fill="#064E3B" />
          <polygon points="65,28 48,105 82,105" fill="#047857" />
          <polygon points="165,24 148,105 182,105" fill="#064E3B" />
          <polygon points="205,18 186,105 224,105" fill="#022C22" />
          <path d="M0 98 Q95 82 240 98 L240 130 L0 130 Z" fill="#065F46" />
        </svg>
      );
    case 'volcanic_land':
      return (
        <svg viewBox="0 0 240 130" className="w-full h-full object-cover">
          <rect width="240" height="130" fill="#7F1D1D" />
          <polygon points="45,100 115,24 185,100" fill="#27272A" />
          <polygon points="100,40 130,40 122,24 108,24" fill="#F97316" />
          <path
            d="M115 36 Q122 68 95 125"
            fill="none"
            stroke="#FACC15"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <path d="M0 100 Q80 86 240 102 L240 130 L0 130 Z" fill="#18181B" />
        </svg>
      );
    case 'neon_city':
    default:
      return (
        <svg viewBox="0 0 240 130" className="w-full h-full object-cover">
          <rect width="240" height="130" fill="#1E1B4B" />
          <rect x="24" y="34" width="28" height="70" fill="#312E81" stroke="#22D3EE" strokeWidth="1.5" />
          <rect x="62" y="20" width="34" height="84" fill="#3B0764" stroke="#EC4899" strokeWidth="1.5" />
          <rect x="108" y="42" width="30" height="62" fill="#312E81" stroke="#A855F7" strokeWidth="1.5" />
          <rect x="150" y="26" width="36" height="78" fill="#3B0764" stroke="#22D3EE" strokeWidth="1.5" />
          <rect x="196" y="46" width="26" height="58" fill="#312E81" stroke="#EC4899" strokeWidth="1.5" />
          <path d="M0 102 L240 102 L240 130 L0 130 Z" fill="#090514" />
          <line x1="0" y1="102" x2="240" y2="102" stroke="#06B6D4" strokeWidth="3" />
        </svg>
      );
  }
};

/**
 * Panel 6: Bottom-Center Circular Analog Speedometer Gauge ("72 KM/H")
 */
export const AnalogSpeedometerDial: React.FC<{ speedKmh: number }> = ({
  speedKmh,
}) => {
  const clamped = Math.min(140, Math.max(0, speedKmh));
  const needleDeg = -120 + (clamped / 140) * 240;

  return (
    <div className="relative w-28 h-24 sm:w-36 sm:h-28 select-none pointer-events-none drop-shadow-[0_6px_12px_rgba(0,0,0,0.75)]">
      <svg viewBox="0 0 160 130" className="w-full h-full">
        <circle
          cx="80"
          cy="76"
          r="64"
          fill="#18181B"
          stroke="#94A3B8"
          strokeWidth="6"
        />
        <circle
          cx="80"
          cy="76"
          r="58"
          fill="#090D16"
          stroke="#334155"
          strokeWidth="2"
        />

        {Array.from({ length: 13 }).map((_, idx) => {
          const aDeg = -210 + idx * 20;
          const aRad = (aDeg * Math.PI) / 180;
          const x1 = 80 + Math.cos(aRad) * 44;
          const y1 = 76 + Math.sin(aRad) * 44;
          const x2 = 80 + Math.cos(aRad) * 53;
          const y2 = 76 + Math.sin(aRad) * 53;
          const color = idx < 5 ? '#22C55E' : idx < 9 ? '#FACC15' : '#EF4444';
          return (
            <line
              key={idx}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={color}
              strokeWidth="3.5"
              strokeLinecap="round"
            />
          );
        })}

        <g transform={`translate(80, 76) rotate(${needleDeg})`}>
          <polygon points="-3,8 3,8 0,-46" fill="#EF4444" />
          <circle cx="0" cy="0" r="7" fill="#E2E8F0" stroke="#0F172A" strokeWidth="2" />
        </g>

        <text
          x="80"
          y="98"
          textAnchor="middle"
          fontFamily="'Chakra Petch', sans-serif"
          fontWeight="800"
          fontSize="24"
          fill="#FFFFFF"
        >
          {speedKmh}
        </text>
        <text
          x="80"
          y="114"
          textAnchor="middle"
          fontFamily="'Chakra Petch', sans-serif"
          fontWeight="700"
          fontSize="11"
          fill="#94A3B8"
        >
          KM/H
        </text>
      </svg>
    </div>
  );
};

/**
 * Expressive Cartoon Driver Portrait Avatar for the 6 Selectable Characters (4 Male, 2 Female):
 * 1. 'rex' (Male): Rex "Mudking" Wilder - Backwards red cap, spiky brown hair, dust goggles, big grin
 * 2. 'duke' (Male): "Iron" Duke Kowalski - Viking horned helmet, thick braided beard, aviator shades
 * 3. 'maya' (Female): Maya "Turbo" Cruz - High ponytail, neon pink racing visor, headset mic, confident wink
 * 4. 'axel' (Male): Axel "Nitro" Vance - Electric blue mohawk, cyber-goggles, flame collar jacket
 * 5. 'zara' (Female): Zara "Valkyrie" Vance - Twin braided pigtails, gold desert bandana & goggles, fierce smile
 * 6. 'viktor' (Male): Captain Viktor "G-Force" Volkov - White rally helmet, handlebar mustache, tactical visor
 */
export const CartoonDriverAvatar: React.FC<{
  driverId: DriverId;
  className?: string;
}> = ({ driverId, className = 'w-12 h-12' }) => {
  return (
    <svg
      viewBox="0 0 100 100"
      className={`${className} select-none overflow-visible`}
    >
      {/* Background Badge Circle */}
      <circle
        cx="50"
        cy="50"
        r="46"
        fill={
          driverId === 'rex'
            ? '#7F1D1D'
            : driverId === 'duke'
            ? '#1E3A8A'
            : driverId === 'maya'
            ? '#831843'
            : driverId === 'axel'
            ? '#3B0764'
            : driverId === 'zara'
            ? '#064E3B'
            : '#312E81'
        }
        stroke="#090D16"
        strokeWidth="4"
      />

      {driverId === 'rex' && (
        /* 1. REX "MUDKING" WILDER (Male #1) - Red Backwards Cap + Goggles + Grin */
        <g>
          {/* Racing Jacket Shoulders & White Racing Stripes */}
          <path
            d="M16 92 Q24 68 50 68 Q76 68 84 92 Z"
            fill="#DC2626"
            stroke="#090D16"
            strokeWidth="3"
          />
          <rect x="44" y="68" width="12" height="24" fill="#FACC15" />
          {/* Neck & Head */}
          <rect x="42" y="56" width="16" height="16" rx="6" fill="#F1C27D" />
          <circle
            cx="50"
            cy="46"
            r="22"
            fill="#F1C27D"
            stroke="#090D16"
            strokeWidth="3"
          />
          {/* Ears */}
          <circle cx="27" cy="48" r="5" fill="#F1C27D" stroke="#090D16" strokeWidth="2.5" />
          <circle cx="73" cy="48" r="5" fill="#F1C27D" stroke="#090D16" strokeWidth="2.5" />
          {/* Red Backwards Cap + Spiky Brown Hair Fringe */}
          <path
            d="M27 38 Q30 16 50 16 Q70 16 73 38 Z"
            fill="#EF4444"
            stroke="#090D16"
            strokeWidth="3"
          />
          <path d="M70 32 L88 36 L86 42 L68 38 Z" fill="#B91C1C" stroke="#090D16" strokeWidth="2.5" />
          {/* Goggles on Forehead */}
          <rect x="30" y="25" width="18" height="11" rx="4" fill="#38BDF8" stroke="#090D16" strokeWidth="2.5" />
          <rect x="52" y="25" width="18" height="11" rx="4" fill="#38BDF8" stroke="#090D16" strokeWidth="2.5" />
          {/* Expressive Cartoon Eyes & Eyebrows */}
          <path d="M34 40 L45 42" stroke="#451A03" strokeWidth="3" strokeLinecap="round" />
          <path d="M66 40 L55 42" stroke="#451A03" strokeWidth="3" strokeLinecap="round" />
          <circle cx="40" cy="46" r="3.5" fill="#090D16" />
          <circle cx="60" cy="46" r="3.5" fill="#090D16" />
          <circle cx="41" cy="45" r="1.2" fill="#FFFFFF" />
          <circle cx="61" cy="45" r="1.2" fill="#FFFFFF" />
          {/* Band-aid on Cheek & Big Toothy Grin */}
          <rect x="58" y="51" width="9" height="4" rx="1" fill="#FDE68A" transform="rotate(-12 62 53)" />
          <path
            d="M38 55 Q50 65 62 55 Z"
            fill="#FFFFFF"
            stroke="#090D16"
            strokeWidth="2.5"
          />
        </g>
      )}

      {driverId === 'duke' && (
        /* 2. "IRON" DUKE KOWALSKI (Male #2) - Horned Helmet + Braided Beard + Shades */
        <g>
          {/* Blue Armored Suit Shoulders */}
          <path
            d="M14 92 Q22 66 50 66 Q78 66 86 92 Z"
            fill="#0284C7"
            stroke="#090D16"
            strokeWidth="3"
          />
          <circle cx="50" cy="46" r="22" fill="#E0AC69" stroke="#090D16" strokeWidth="3" />
          {/* Viking Horns on Steel Helmet */}
          <path
            d="M28 32 Q12 22 16 10 Q24 18 32 26 Z"
            fill="#FEF08A"
            stroke="#090D16"
            strokeWidth="2.5"
          />
          <path
            d="M72 32 Q88 22 84 10 Q76 18 68 26 Z"
            fill="#FEF08A"
            stroke="#090D16"
            strokeWidth="2.5"
          />
          {/* Steel Offroad Helmet */}
          <path
            d="M26 38 Q28 16 50 16 Q72 16 74 38 Z"
            fill="#475569"
            stroke="#090D16"
            strokeWidth="3"
          />
          <rect x="47" y="16" width="6" height="20" fill="#FACC15" />
          {/* Dark Aviator Shades */}
          <rect x="31" y="39" width="17" height="11" rx="3" fill="#090D16" stroke="#FACC15" strokeWidth="2" />
          <rect x="52" y="39" width="17" height="11" rx="3" fill="#090D16" stroke="#FACC15" strokeWidth="2" />
          <line x1="48" y1="42" x2="52" y2="42" stroke="#FACC15" strokeWidth="2" />
          {/* Thick Reddish-Brown Cartoon Beard & Grin */}
          <path
            d="M28 50 Q28 76 50 78 Q72 76 72 50 Q62 54 50 54 Q38 54 28 50 Z"
            fill="#78350F"
            stroke="#090D16"
            strokeWidth="3"
          />
          <path d="M41 58 Q50 64 59 58" fill="none" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" />
        </g>
      )}

      {driverId === 'maya' && (
        /* 3. MAYA "TURBO" CRUZ (Female #1) - High Ponytail + Pink Visor + Headset */
        <g>
          {/* Flowing Dark Ponytail */}
          <path
            d="M66 24 Q90 18 88 46 Q82 42 72 34 Z"
            fill="#1E1B4B"
            stroke="#090D16"
            strokeWidth="3"
          />
          {/* Neon Pink & Cyan Racing Jacket */}
          <path
            d="M18 92 Q26 68 50 68 Q74 68 82 92 Z"
            fill="#EC4899"
            stroke="#090D16"
            strokeWidth="3"
          />
          <path d="M40 68 L50 88 L60 68 Z" fill="#38BDF8" />
          {/* Neck & Head */}
          <rect x="44" y="56" width="12" height="15" rx="5" fill="#D99B66" />
          <circle
            cx="50"
            cy="46"
            r="21"
            fill="#D99B66"
            stroke="#090D16"
            strokeWidth="3"
          />
          {/* Sleek Hair & Cyan/Pink Racing Visor */}
          <path
            d="M28 40 Q28 18 50 18 Q72 18 72 40 Q62 30 50 30 Q38 30 28 40 Z"
            fill="#1E1B4B"
            stroke="#090D16"
            strokeWidth="2.5"
          />
          <path
            d="M27 32 Q50 24 73 32 L76 39 Q50 32 24 39 Z"
            fill="#38BDF8"
            stroke="#090D16"
            strokeWidth="2.5"
          />
          {/* Expressive Female Eyes with Lashes */}
          <path d="M33 41 Q39 38 44 41" fill="none" stroke="#090D16" strokeWidth="2.5" />
          <path d="M56 41 Q61 38 67 41" fill="none" stroke="#090D16" strokeWidth="2.5" />
          <circle cx="39" cy="46" r="4" fill="#090D16" />
          <circle cx="61" cy="46" r="4" fill="#090D16" />
          <circle cx="40.5" cy="44.5" r="1.5" fill="#FFFFFF" />
          <circle cx="62.5" cy="44.5" r="1.5" fill="#FFFFFF" />
          {/* Rosy Cheeks & Confident Smile */}
          <ellipse cx="33" cy="52" rx="4" ry="2.2" fill="#F43F5E" opacity="0.55" />
          <ellipse cx="67" cy="52" rx="4" ry="2.2" fill="#F43F5E" opacity="0.55" />
          <path
            d="M41 55 Q50 63 59 55 Z"
            fill="#FFFFFF"
            stroke="#090D16"
            strokeWidth="2"
          />
          {/* Racing Headset Mic */}
          <circle cx="28" cy="48" r="5" fill="#38BDF8" stroke="#090D16" strokeWidth="2" />
          <path d="M28 50 Q34 60 45 59" fill="none" stroke="#090D16" strokeWidth="2.5" strokeLinecap="round" />
        </g>
      )}

      {driverId === 'axel' && (
        /* 4. AXEL "NITRO" VANCE (Male #3) - Electric Blue Spiky Mohawk + Cyber Goggles */
        <g>
          {/* Purple & Lime Stunt Suit */}
          <path
            d="M16 92 Q24 68 50 68 Q76 68 84 92 Z"
            fill="#9333EA"
            stroke="#090D16"
            strokeWidth="3"
          />
          <path d="M36 68 L50 90 L64 68 Z" fill="#A3E635" />
          {/* Head */}
          <circle
            cx="50"
            cy="48"
            r="21"
            fill="#FCD34D"
            stroke="#090D16"
            strokeWidth="3"
          />
          {/* Giant Spiky Electric Blue Mohawk */}
          <polygon
            points="50,4 38,26 44,26 32,12 46,30 54,30 68,12 56,26 62,26"
            fill="#38BDF8"
            stroke="#090D16"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          {/* Neon Lime Stunt Goggles over Eyes */}
          <rect
            x="29"
            y="36"
            width="42"
            height="14"
            rx="6"
            fill="#A3E635"
            stroke="#090D16"
            strokeWidth="3"
          />
          <line x1="34" y1="40" x2="46" y2="40" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="54" y1="40" x2="66" y2="40" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
          {/* Wild Daredevil Smirk */}
          <path
            d="M38 57 L62 54 L58 63 L42 62 Z"
            fill="#FFFFFF"
            stroke="#090D16"
            strokeWidth="2.5"
          />
        </g>
      )}

      {driverId === 'zara' && (
        /* 5. ZARA "VALKYRIE" VANCE (Female #2) - Twin Braids + Gold Desert Bandana & Goggles */
        <g>
          {/* Twin Braided Pigtails Left & Right */}
          <path
            d="M28 48 Q16 62 20 80 Q28 76 31 58 Z"
            fill="#7C2D12"
            stroke="#090D16"
            strokeWidth="2.5"
          />
          <path
            d="M72 48 Q84 62 80 80 Q72 76 69 58 Z"
            fill="#7C2D12"
            stroke="#090D16"
            strokeWidth="2.5"
          />
          {/* Emerald Safari Jacket & Gold Scarf */}
          <path
            d="M18 92 Q26 68 50 68 Q74 68 82 92 Z"
            fill="#10B981"
            stroke="#090D16"
            strokeWidth="3"
          />
          <path d="M34 66 Q50 76 66 66 L60 78 L40 78 Z" fill="#FACC15" stroke="#090D16" strokeWidth="2" />
          {/* Head */}
          <circle
            cx="50"
            cy="46"
            r="21"
            fill="#C68642"
            stroke="#090D16"
            strokeWidth="3"
          />
          {/* Auburn Hair & Gold Headband + Aviator Goggles */}
          <path
            d="M28 38 Q30 16 50 16 Q70 16 72 38 Z"
            fill="#7C2D12"
            stroke="#090D16"
            strokeWidth="3"
          />
          <rect x="28" y="29" width="44" height="8" rx="3" fill="#FACC15" stroke="#090D16" strokeWidth="2" />
          <circle cx="40" cy="27" r="6" fill="#38BDF8" stroke="#090D16" strokeWidth="2.5" />
          <circle cx="60" cy="27" r="6" fill="#38BDF8" stroke="#090D16" strokeWidth="2.5" />
          {/* Expressive Eyes & Fierce Smile */}
          <circle cx="40" cy="45" r="3.8" fill="#090D16" />
          <circle cx="60" cy="45" r="3.8" fill="#090D16" />
          <circle cx="41.2" cy="43.8" r="1.4" fill="#FFFFFF" />
          <circle cx="61.2" cy="43.8" r="1.4" fill="#FFFFFF" />
          <ellipse cx="33" cy="51" rx="3.8" ry="2" fill="#FB7185" opacity="0.5" />
          <ellipse cx="67" cy="51" rx="3.8" ry="2" fill="#FB7185" opacity="0.5" />
          <path
            d="M41 55 Q50 62 59 55 Z"
            fill="#FFFFFF"
            stroke="#090D16"
            strokeWidth="2"
          />
        </g>
      )}

      {driverId === 'viktor' && (
        /* 6. CAPTAIN VIKTOR "G-FORCE" VOLKOV (Male #4) - White Pro Helmet + Mustache */
        <g>
          {/* Indigo & Red Pro Rally Suit */}
          <path
            d="M16 92 Q24 68 50 68 Q76 68 84 92 Z"
            fill="#6366F1"
            stroke="#090D16"
            strokeWidth="3"
          />
          <rect x="45" y="68" width="10" height="24" fill="#F43F5E" />
          {/* White Open-Face Pro Rally Helmet */}
          <circle
            cx="50"
            cy="45"
            r="24"
            fill="#F8FAFC"
            stroke="#090D16"
            strokeWidth="3"
          />
          <rect x="46" y="21" width="8" height="14" fill="#EF4444" />
          {/* Face Opening */}
          <rect
            x="33"
            y="36"
            width="34"
            height="26"
            rx="8"
            fill="#F5CBA7"
            stroke="#090D16"
            strokeWidth="2.5"
          />
          {/* Crimson Tactical Visor */}
          <rect
            x="31"
            y="32"
            width="38"
            height="12"
            rx="4"
            fill="#F43F5E"
            stroke="#090D16"
            strokeWidth="2.5"
          />
          <line x1="36" y1="36" x2="52" y2="36" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
          {/* Iconic Handlebar Mustache */}
          <path
            d="M50 51 Q40 48 34 55 Q42 57 50 54 Q58 57 66 55 Q60 48 50 51 Z"
            fill="#334155"
            stroke="#090D16"
            strokeWidth="2"
          />
        </g>
      )}
    </svg>
  );
};

