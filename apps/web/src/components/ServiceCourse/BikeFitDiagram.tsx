/**
 * Interactive SVG Bike Fit Diagram
 *
 * Displays a bike frame with geometry, fit position, and optionally a rider silhouette.
 * Based on the visual style of fizmoo.com and bikeinsights.com
 */

import { useMemo } from 'react';

export interface BikeGeometryData {
  stackMm: number;
  reachMm: number;
  seatTubeAngle: number;       // degrees
  headTubeAngle: number;       // degrees
  headTubeLengthMm?: number;
  seatTubeLengthMm?: number;
  chainstayLengthMm?: number;
  wheelbaseMm?: number;
  bbDropMm?: number;
  forkRakeMm?: number;
  trailMm?: number;
}

export interface FitPositionData {
  saddleHeight: number;        // BB to saddle top (mm)
  saddleSetback: number;       // Behind BB (negative = behind)
  saddleAngle?: number;        // Degrees from level
  handlebarStack: number;      // BB to handlebar (mm)
  handlebarReach: number;      // BB to handlebar (mm)
  stemLength?: number;
  stemAngle?: number;
  spacerStack?: number;
  crankLength?: number;
}

export interface RiderMeasurements {
  inseam?: number;
  torsoLength?: number;
  armLength?: number;
  shoulderWidth?: number;
  thighLength?: number;
  lowerLegLength?: number;
}

interface BikeFitDiagramProps {
  geometry: BikeGeometryData;
  fitPosition?: FitPositionData;
  rider?: RiderMeasurements;
  showMeasurements?: boolean;
  showRider?: boolean;
  highlightedMeasurement?: string;
  width?: number;
  height?: number;
  className?: string;
}

const WHEEL_RADIUS_MM = 340; // 700c wheel radius in mm

// Validate and provide sensible defaults for geometry values
function validateGeometry(geometry: BikeGeometryData) {
  const stack = geometry.stackMm;
  const reach = geometry.reachMm;

  // Estimate seat tube length if missing or unreasonable (should be 400-650mm typically)
  let seatTubeLength = geometry.seatTubeLengthMm;

  // Check if value might be in wrong unit (e.g., cm or m instead of mm)
  if (seatTubeLength && seatTubeLength < 100) {
    // Likely in cm, convert to mm
    seatTubeLength = seatTubeLength * 10;
  } else if (seatTubeLength && seatTubeLength < 10) {
    // Likely in meters, convert to mm
    seatTubeLength = seatTubeLength * 1000;
  }

  if (!seatTubeLength || seatTubeLength < 350 || seatTubeLength > 700) {
    // Estimate from stack - seat tube is typically 85-95% of stack
    seatTubeLength = stack * 0.92;
  }

  // Validate head tube length (typically 100-250mm)
  let headTubeLength = geometry.headTubeLengthMm;
  // Check for cm instead of mm
  if (headTubeLength && headTubeLength < 40) {
    headTubeLength = headTubeLength * 10;
  }
  if (!headTubeLength || headTubeLength < 80 || headTubeLength > 300) {
    // Estimate based on stack - head tube is typically 20-35% of stack
    headTubeLength = Math.max(100, stack * 0.25);
  }

  // Chainstay (typically 400-450mm for road/gravel)
  let chainstay = geometry.chainstayLengthMm;
  // Check for cm instead of mm
  if (chainstay && chainstay < 60) {
    chainstay = chainstay * 10;
  }
  if (!chainstay || chainstay < 350 || chainstay > 500) {
    chainstay = 420;
  }

  // Wheelbase (typically 950-1100mm)
  let wheelbase = geometry.wheelbaseMm;
  // Check for cm instead of mm
  if (wheelbase && wheelbase < 150) {
    wheelbase = wheelbase * 10;
  }
  if (!wheelbase || wheelbase < 900 || wheelbase > 1200) {
    wheelbase = chainstay + reach + 600; // Rough estimate
  }

  // BB drop (typically 65-80mm)
  let bbDrop = geometry.bbDropMm;
  if (!bbDrop || bbDrop < 50 || bbDrop > 100) {
    bbDrop = 70;
  }

  // Fork rake (typically 40-55mm)
  let forkRake = geometry.forkRakeMm;
  if (!forkRake || forkRake < 30 || forkRake > 70) {
    forkRake = 47;
  }

  return {
    stack,
    reach,
    seatTubeLength,
    headTubeLength,
    chainstay,
    wheelbase,
    bbDrop,
    forkRake,
    seatTubeAngle: geometry.seatTubeAngle || 73,
    headTubeAngle: geometry.headTubeAngle || 73,
  };
}

export function BikeFitDiagram({
  geometry,
  fitPosition,
  rider,
  showMeasurements = true,
  showRider = false,
  highlightedMeasurement,
  width = 600,
  height = 400,
  className = '',
}: BikeFitDiagramProps) {
  // Calculate all bike points with dynamic scaling
  const bikePoints = useMemo(() => {
    // Validate and get sensible geometry values
    const geo = validateGeometry(geometry);

    // Calculate total bike dimensions for scaling
    const totalWidth = geo.wheelbase + WHEEL_RADIUS_MM * 2 + 100;
    const totalHeight = Math.max(geo.stack + 200, WHEEL_RADIUS_MM * 2 + 150);

    // Calculate scale to fit within the viewBox with padding
    const padding = 50;
    const availableWidth = width - padding * 2;
    const availableHeight = height - padding * 2;
    const scaleX = availableWidth / totalWidth;
    const scaleY = availableHeight / totalHeight;
    const scale = Math.min(scaleX, scaleY) * 0.9;

    const wheelRadius = WHEEL_RADIUS_MM * scale;
    const bbDrop = geo.bbDrop * scale;
    const chainstayScaled = geo.chainstay * scale;

    // Position BB - center the bike in the viewBox
    const bb = {
      x: padding + chainstayScaled + wheelRadius + 20,
      y: height - padding - wheelRadius + bbDrop,
    };

    // Rear wheel center
    const rearWheelX = bb.x - Math.sqrt(Math.max(0, chainstayScaled * chainstayScaled - bbDrop * bbDrop));
    const rearWheel = {
      x: rearWheelX,
      y: bb.y - bbDrop,
    };

    // Seat tube angle in radians
    const staRad = (geo.seatTubeAngle * Math.PI) / 180;

    // Seat tube top
    const seatTubeLength = geo.seatTubeLength * scale;
    const seatTubeTop = {
      x: bb.x - seatTubeLength * Math.cos(staRad),
      y: bb.y - seatTubeLength * Math.sin(staRad),
    };

    // Head tube using stack and reach
    const stack = geo.stack * scale;
    const reach = geo.reach * scale;

    // Head tube top (stack/reach point)
    const headTubeTop = {
      x: bb.x + reach,
      y: bb.y - stack,
    };

    // Head tube angle
    const htaRad = (geo.headTubeAngle * Math.PI) / 180;
    const headTubeLength = geo.headTubeLength * scale;

    // Head tube bottom
    const headTubeBottom = {
      x: headTubeTop.x + headTubeLength * Math.cos(htaRad),
      y: headTubeTop.y + headTubeLength * Math.sin(htaRad),
    };

    // Front wheel - calculate based on fork geometry
    const forkRake = geo.forkRake * scale;
    // Fork axle-to-crown length (estimate if not provided)
    const forkAxleToCrown = (geometry.wheelbaseMm ?
      (geo.wheelbase * scale - chainstayScaled - reach) :
      (wheelRadius + bbDrop) * 0.95);

    const frontWheel = {
      x: headTubeBottom.x + (forkAxleToCrown - headTubeLength * 0.3) * Math.cos(htaRad) + forkRake * Math.sin(htaRad),
      y: rearWheel.y,
    };

    return {
      scale,
      bb,
      rearWheel,
      frontWheel,
      wheelRadius,
      seatTubeTop,
      headTubeTop,
      headTubeBottom,
      staRad,
      htaRad,
      geo,
    };
  }, [geometry, width, height]);

  // Calculate fit position points
  const fitPoints = useMemo(() => {
    if (!fitPosition) return null;

    const { scale, bb, staRad } = bikePoints;

    // Saddle position
    const saddleHeight = fitPosition.saddleHeight * scale;
    const saddleSetback = Math.abs(fitPosition.saddleSetback) * scale;

    // Saddle center
    const saddle = {
      x: bb.x - saddleSetback,
      y: bb.y - saddleHeight,
    };

    // Saddle rails (for visualization)
    const saddleLength = 50 * scale;
    const saddleAngleRad = ((fitPosition.saddleAngle || 0) * Math.PI) / 180;
    const saddleNose = {
      x: saddle.x + saddleLength * Math.cos(saddleAngleRad),
      y: saddle.y - saddleLength * Math.sin(saddleAngleRad),
    };
    const saddleRear = {
      x: saddle.x - saddleLength * 0.7 * Math.cos(saddleAngleRad),
      y: saddle.y + saddleLength * 0.7 * Math.sin(saddleAngleRad),
    };

    // Handlebar position
    const handlebarStack = fitPosition.handlebarStack * scale;
    const handlebarReach = fitPosition.handlebarReach * scale;

    const handlebar = {
      x: bb.x + handlebarReach,
      y: bb.y - handlebarStack,
    };

    // Handlebar width (for visualization)
    const barWidth = 40 * scale;

    // Seatpost from saddle to seat tube
    const seatpostTop = saddle;
    const seatpostBottom = {
      x: bb.x - (bikePoints.seatTubeTop.y - bb.y) / Math.tan(staRad) * 0.9,
      y: bikePoints.seatTubeTop.y + 20 * scale,
    };

    return {
      saddle,
      saddleNose,
      saddleRear,
      handlebar,
      barWidth,
      seatpostTop,
      seatpostBottom,
    };
  }, [fitPosition, bikePoints]);

  // Calculate rider silhouette points
  const riderPoints = useMemo(() => {
    if (!showRider || !fitPoints || !rider) return null;

    const { scale } = bikePoints;
    const { saddle, handlebar } = fitPoints;

    // Estimate rider proportions (scaled for visualization)
    const torso = (rider.torsoLength || 600) * scale * 0.8;
    const thigh = (rider.thighLength || 450) * scale * 0.8;

    // Hip position (on saddle, slightly forward)
    const hip = {
      x: saddle.x + 20 * scale,
      y: saddle.y - 10 * scale,
    };

    // Calculate shoulder position based on torso angle to handlebar
    const torsoAngle = Math.atan2(hip.y - handlebar.y, handlebar.x - hip.x);
    const shoulder = {
      x: hip.x + torso * 0.85 * Math.cos(torsoAngle),
      y: hip.y - torso * 0.85 * Math.sin(torsoAngle),
    };

    // Head above shoulders
    const head = {
      x: shoulder.x + 15 * scale,
      y: shoulder.y - 30 * scale,
    };

    // Hands at handlebar
    const hands = handlebar;

    // Calculate knee position (simplified - leg bent at ~75 degrees at top of stroke)
    const knee = {
      x: hip.x + thigh * 0.3,
      y: hip.y + thigh * 0.85,
    };

    // Foot at pedal (assume pedal at 3 o'clock position)
    const crankLength = (fitPosition?.crankLength || 172.5) * scale;
    const foot = {
      x: bikePoints.bb.x + crankLength,
      y: bikePoints.bb.y,
    };

    return {
      hip,
      shoulder,
      head,
      hands,
      knee,
      foot,
      torsoAngle: torsoAngle * (180 / Math.PI),
    };
  }, [showRider, fitPoints, rider, bikePoints, fitPosition]);

  const {
    bb, rearWheel, frontWheel, wheelRadius,
    seatTubeTop, headTubeTop, headTubeBottom,
  } = bikePoints;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={`bike-fit-diagram ${className}`}
      style={{ maxWidth: '100%', height: 'auto', backgroundColor: '#fafafa', border: '1px solid #e5e5e5', borderRadius: '8px' }}
    >
      {/* Background grid */}
      <defs>
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e5e5e5" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />

      {/* Wheels */}
      <circle
        cx={rearWheel.x}
        cy={rearWheel.y}
        r={wheelRadius}
        fill="none"
        stroke="#ccc"
        strokeWidth="2"
      />
      <circle
        cx={rearWheel.x}
        cy={rearWheel.y}
        r={wheelRadius * 0.08}
        fill="#666"
      />
      <circle
        cx={frontWheel.x}
        cy={frontWheel.y}
        r={wheelRadius}
        fill="none"
        stroke="#ccc"
        strokeWidth="2"
      />
      <circle
        cx={frontWheel.x}
        cy={frontWheel.y}
        r={wheelRadius * 0.08}
        fill="#666"
      />

      {/* Frame */}
      <g className="frame" stroke="#333" strokeWidth="3" fill="none" strokeLinecap="round">
        {/* Seat tube */}
        <line x1={bb.x} y1={bb.y} x2={seatTubeTop.x} y2={seatTubeTop.y} />

        {/* Top tube */}
        <line x1={seatTubeTop.x} y1={seatTubeTop.y} x2={headTubeTop.x} y2={headTubeTop.y} />

        {/* Down tube */}
        <line x1={bb.x} y1={bb.y} x2={headTubeBottom.x} y2={headTubeBottom.y} />

        {/* Head tube */}
        <line x1={headTubeTop.x} y1={headTubeTop.y} x2={headTubeBottom.x} y2={headTubeBottom.y} strokeWidth="5" />

        {/* Chainstays */}
        <line x1={bb.x} y1={bb.y} x2={rearWheel.x} y2={rearWheel.y} />

        {/* Seat stays */}
        <line x1={seatTubeTop.x} y1={seatTubeTop.y} x2={rearWheel.x} y2={rearWheel.y} />

        {/* Fork */}
        <line x1={headTubeBottom.x} y1={headTubeBottom.y} x2={frontWheel.x} y2={frontWheel.y} strokeWidth="2" />
      </g>

      {/* BB marker */}
      <circle cx={bb.x} cy={bb.y} r="5" fill="#333" />

      {/* Fit position overlay */}
      {fitPoints && (
        <g className="fit-position">
          {/* Seatpost */}
          <line
            x1={fitPoints.seatpostBottom.x}
            y1={fitPoints.seatpostBottom.y}
            x2={fitPoints.saddle.x}
            y2={fitPoints.saddle.y}
            stroke="#666"
            strokeWidth="3"
          />

          {/* Saddle */}
          <g className="saddle">
            <ellipse
              cx={fitPoints.saddle.x}
              cy={fitPoints.saddle.y}
              rx="35"
              ry="8"
              fill="#444"
              transform={`rotate(${fitPosition?.saddleAngle || 0} ${fitPoints.saddle.x} ${fitPoints.saddle.y})`}
            />
          </g>

          {/* Stem & handlebar (simplified) */}
          <line
            x1={headTubeTop.x}
            y1={headTubeTop.y}
            x2={fitPoints.handlebar.x}
            y2={fitPoints.handlebar.y}
            stroke="#666"
            strokeWidth="3"
          />

          {/* Handlebar */}
          <ellipse
            cx={fitPoints.handlebar.x}
            cy={fitPoints.handlebar.y}
            rx="8"
            ry="20"
            fill="#444"
          />

          {/* Cranks & pedals */}
          <g className="cranks" stroke="#555" strokeWidth="2">
            <line
              x1={bb.x}
              y1={bb.y}
              x2={bb.x + (fitPosition?.crankLength || 172.5) * bikePoints.scale}
              y2={bb.y}
            />
            <line
              x1={bb.x}
              y1={bb.y}
              x2={bb.x - (fitPosition?.crankLength || 172.5) * bikePoints.scale}
              y2={bb.y}
            />
            <rect
              x={bb.x + (fitPosition?.crankLength || 172.5) * bikePoints.scale - 15}
              y={bb.y - 5}
              width="30"
              height="10"
              fill="#555"
              rx="2"
            />
          </g>
        </g>
      )}

      {/* Rider silhouette */}
      {riderPoints && (
        <g className="rider" stroke="#3b82f6" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.7">
          {/* Torso */}
          <line
            x1={riderPoints.hip.x}
            y1={riderPoints.hip.y}
            x2={riderPoints.shoulder.x}
            y2={riderPoints.shoulder.y}
          />

          {/* Head */}
          <circle
            cx={riderPoints.head.x}
            cy={riderPoints.head.y}
            r="12"
            fill="#3b82f6"
            opacity="0.5"
          />

          {/* Arm */}
          <line
            x1={riderPoints.shoulder.x}
            y1={riderPoints.shoulder.y}
            x2={riderPoints.hands.x}
            y2={riderPoints.hands.y}
          />

          {/* Upper leg */}
          <line
            x1={riderPoints.hip.x}
            y1={riderPoints.hip.y}
            x2={riderPoints.knee.x}
            y2={riderPoints.knee.y}
          />

          {/* Lower leg */}
          <line
            x1={riderPoints.knee.x}
            y1={riderPoints.knee.y}
            x2={riderPoints.foot.x}
            y2={riderPoints.foot.y}
          />
        </g>
      )}

      {/* Measurement annotations */}
      {showMeasurements && fitPosition && fitPoints && (
        <g className="measurements" fontSize="10" fill="#666">
          {/* Stack measurement */}
          <g className={highlightedMeasurement === 'stack' ? 'highlighted' : ''}>
            <line
              x1={bb.x + 10}
              y1={bb.y}
              x2={bb.x + 10}
              y2={fitPoints.handlebar.y}
              stroke="#10b981"
              strokeWidth="1"
              strokeDasharray="4,2"
            />
            <text x={bb.x + 15} y={(bb.y + fitPoints.handlebar.y) / 2} fill="#10b981" fontSize="9">
              Stack: {Math.round(fitPosition.handlebarStack)}mm
            </text>
          </g>

          {/* Reach measurement */}
          <g className={highlightedMeasurement === 'reach' ? 'highlighted' : ''}>
            <line
              x1={bb.x}
              y1={fitPoints.handlebar.y + 10}
              x2={fitPoints.handlebar.x}
              y2={fitPoints.handlebar.y + 10}
              stroke="#3b82f6"
              strokeWidth="1"
              strokeDasharray="4,2"
            />
            <text x={(bb.x + fitPoints.handlebar.x) / 2} y={fitPoints.handlebar.y + 22} fill="#3b82f6" fontSize="9" textAnchor="middle">
              Reach: {Math.round(fitPosition.handlebarReach)}mm
            </text>
          </g>

          {/* Saddle height measurement */}
          <g className={highlightedMeasurement === 'saddleHeight' ? 'highlighted' : ''}>
            <line
              x1={bb.x - 15}
              y1={bb.y}
              x2={bb.x - 15}
              y2={fitPoints.saddle.y}
              stroke="#f59e0b"
              strokeWidth="1"
              strokeDasharray="4,2"
            />
            <text x={bb.x - 20} y={(bb.y + fitPoints.saddle.y) / 2} fill="#f59e0b" fontSize="9" textAnchor="end">
              Saddle: {Math.round(fitPosition.saddleHeight)}mm
            </text>
          </g>

          {/* Drop measurement */}
          {fitPoints.saddle.y < fitPoints.handlebar.y && (
            <g className={highlightedMeasurement === 'drop' ? 'highlighted' : ''}>
              <line
                x1={fitPoints.handlebar.x + 20}
                y1={fitPoints.saddle.y}
                x2={fitPoints.handlebar.x + 20}
                y2={fitPoints.handlebar.y}
                stroke="#ef4444"
                strokeWidth="1"
                strokeDasharray="4,2"
              />
              <text x={fitPoints.handlebar.x + 25} y={(fitPoints.saddle.y + fitPoints.handlebar.y) / 2} fill="#ef4444" fontSize="9">
                Drop: {Math.round(fitPoints.handlebar.y - fitPoints.saddle.y) / bikePoints.scale}mm
              </text>
            </g>
          )}
        </g>
      )}

      {/* Frame geometry labels */}
      {showMeasurements && (
        <g className="geometry-labels" fontSize="8" fill="#999">
          <text x={headTubeTop.x - 5} y={headTubeTop.y - 5} textAnchor="end">
            Stack: {geometry.stackMm}mm
          </text>
          <text x={bb.x + (geometry.reachMm * bikePoints.scale) / 2} y={bb.y + 15} textAnchor="middle">
            Reach: {geometry.reachMm}mm
          </text>
          <text x={seatTubeTop.x - 10} y={(bb.y + seatTubeTop.y) / 2} textAnchor="end" transform={`rotate(-${90 - (geometry.seatTubeAngle || 73)} ${seatTubeTop.x - 10} ${(bb.y + seatTubeTop.y) / 2})`}>
            STA: {geometry.seatTubeAngle || 73}°
          </text>
          {/* Seat tube length - use validated value */}
          <text x={seatTubeTop.x - 25} y={(bb.y + seatTubeTop.y) / 2 + 12} textAnchor="end" fill="#666">
            ST: {Math.round(bikePoints.geo.seatTubeLength)}mm
          </text>
        </g>
      )}

      {/* Legend */}
      <g className="legend" transform={`translate(10, ${height - 50})`} fontSize="9">
        <rect x="0" y="0" width="12" height="12" fill="#333" />
        <text x="16" y="10" fill="#666">Frame</text>

        {fitPosition && (
          <>
            <rect x="60" y="0" width="12" height="12" fill="#444" />
            <text x="76" y="10" fill="#666">Fit Position</text>
          </>
        )}

        {riderPoints && (
          <>
            <rect x="150" y="0" width="12" height="12" fill="#3b82f6" opacity="0.7" />
            <text x="166" y="10" fill="#666">Rider</text>
          </>
        )}
      </g>
    </svg>
  );
}

// Compact version for cards/previews
export function BikeFitDiagramCompact({
  geometry,
  fitPosition,
  className = '',
}: {
  geometry: BikeGeometryData;
  fitPosition?: FitPositionData;
  className?: string;
}) {
  return (
    <BikeFitDiagram
      geometry={geometry}
      fitPosition={fitPosition}
      showMeasurements={false}
      width={300}
      height={200}
      className={className}
    />
  );
}

export default BikeFitDiagram;
