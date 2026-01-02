/**
 * Bike Fit Parser and Calculator
 *
 * Parses Retül bike fit PDF reports and calculates stem/spacer requirements
 * to match a fit position on a new frame.
 */

export interface RetulFitData {
  // Rider info
  riderName?: string;
  fitDate?: string;

  // Original bike info
  originalBike?: {
    make: string;
    model: string;
    size: string;
    year: number;
    type: string;
  };

  // Components
  components?: {
    stem: string; // e.g., "-6° x 120mm"
    stemAngle?: number;
    stemLength?: number;
    spacerStack: number;
    crankLength: number;
    saddle?: string;
    bars?: string;
  };

  // Frame geometry (from the fit)
  frameStack: number;
  frameReach: number;

  // Fit position measurements (the key data)
  fitPosition: {
    saddleHeight: number;        // BB to center of saddle
    saddleSetback: number;       // BB to front tip of saddle (negative = behind BB)
    saddleAngle: number;         // degrees, negative = nose down
    handlebarStack: number;      // BB to center of handlebar
    handlebarReach: number;      // BB to center of handlebar
    handlebarDrop: number;       // Saddle to bar top (negative = bar below saddle)
    effectiveSeatTubeAngle: number;
    gripReach?: number;          // Saddle tip to grip trough
    gripDrop?: number;           // Saddle to grip (negative = below)
    barReach?: number;           // Bar center to grip
    gripWidth?: number;
    gripAngle?: number;
  };

  // Fitter info
  fitter?: {
    name: string;
    site: string;
    notes?: string;
  };
}

export interface StemCalculation {
  // Required stem specs
  stemLength: number;           // mm, center to center
  stemAngle: number;            // degrees (negative = drop)
  spacerStack: number;          // mm of spacers needed

  // Position deltas from original fit
  stackDelta: number;           // How much higher/lower the bars will be
  reachDelta: number;           // How much further/closer the bars will be

  // Confidence/notes
  isAchievable: boolean;
  notes: string[];
}

export interface BikeSetupCalculation {
  // Cockpit
  stem: StemCalculation;

  // Saddle position
  saddleHeight: number;              // BB to saddle (from fit, unchanged)
  seatpostExtension: number | null;  // Amount of seatpost showing above seat tube
  saddleSetback: number;             // Distance behind BB (negative = behind)
  saddleAngle: number;               // Degrees (negative = nose down)

  // Derived/helpful
  effectiveSeatTubeAngle: number;    // Calculated STA for this setup
  seatpostOffsetNeeded: number;      // 0mm, 20mm, 25mm offset post needed

  // Original fit reference
  originalFitBike?: string;
  originalFitDate?: string;

  // Notes and warnings
  notes: string[];
  warnings: string[];
}

export interface FrameGeometry {
  stackMm: number;
  reachMm: number;
  headTubeAngle: number;        // degrees
  headTubeLengthMm?: number;
  seatTubeAngle?: number;       // degrees
  seatTubeLengthMm?: number;    // center-to-top or center-to-center
  bbDropMm?: number;            // BB drop below wheel axle line
}

/**
 * Parse a Retül ZIN report PDF text content
 */
export function parseRetulPdf(text: string): RetulFitData | null {
  try {
    const data: Partial<RetulFitData> = {
      fitPosition: {} as RetulFitData['fitPosition'],
    };

    // Extract rider name
    const nameMatch = text.match(/Personal Bicycle Fitting Report\s*\n\s*([A-Z\s]+)\n/i);
    if (nameMatch) {
      data.riderName = nameMatch[1].trim();
    }

    // Extract date
    const dateMatch = text.match(/(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) {
      data.fitDate = dateMatch[1];
    }

    // Extract original bike info
    const makeModelMatch = text.match(/MAKE\/MODEL:\s*([^,]+),\s*(.+)/i);
    const sizeMatch = text.match(/SIZE:\s*(\S+)/i);
    const yearMatch = text.match(/YEAR:\s*(\d{4})/i);
    const typeMatch = text.match(/TYPE:\s*(\w+)/i);

    if (makeModelMatch) {
      data.originalBike = {
        make: makeModelMatch[1].trim(),
        model: makeModelMatch[2].trim(),
        size: sizeMatch?.[1] || '',
        year: yearMatch ? parseInt(yearMatch[1]) : 0,
        type: typeMatch?.[1] || 'Road',
      };
    }

    // Extract stem info: "-6 ° x 120 mm" or "-6° x 120mm"
    const stemMatch = text.match(/(-?\d+)\s*°?\s*x\s*(\d+)\s*mm/i);
    if (stemMatch) {
      const stemAngle = parseInt(stemMatch[1]);
      const stemLength = parseInt(stemMatch[2]);
      data.components = {
        stem: `${stemAngle}° x ${stemLength}mm`,
        stemAngle,
        stemLength,
        spacerStack: 0,
        crankLength: 170,
      };
    }

    // Extract spacer stack
    const spacerMatch = text.match(/SPACER\s*STACK[:\s]*(\d+)\s*mm/i) ||
                        text.match(/(\d+)\s*mm\s*(?=\d+\s*mm.*Crank)/i);
    if (spacerMatch && data.components) {
      data.components.spacerStack = parseInt(spacerMatch[1]);
    }

    // Extract crank length
    const crankMatch = text.match(/CRANK\s*LENGTH[:\s]*(\d+)\s*mm/i) ||
                       text.match(/(\d+)\s*mm\s*(?=.*(?:Crank\s*brothers|Shimano|SRAM))/i);
    if (crankMatch && data.components) {
      data.components.crankLength = parseInt(crankMatch[1]);
    }

    // Extract key measurements
    const measurements: Record<string, RegExp> = {
      saddleHeight: /Saddle Height:\s*(\d+)\s*mm/i,
      saddleSetback: /Saddle Setback:\s*(-?\d+)\s*mm/i,
      saddleAngle: /Saddle Angle:\s*(-?\d+)\s*°/i,
      handlebarReach: /Handlebar Reach:\s*(\d+)\s*mm/i,
      handlebarDrop: /Handlebar Drop:\s*(-?\d+)\s*mm/i,
      effectiveSeatTubeAngle: /Eff\.\s*Seat Tube Angle:\s*(\d+)\s*°/i,
      gripReach: /Grip Reach:\s*(\d+)\s*mm/i,
      gripDrop: /Grip Drop:\s*(-?\d+)\s*mm/i,
      barReach: /Bar Reach:\s*(\d+)\s*mm/i,
      gripWidth: /Grip Width:\s*(\d+)\s*mm/i,
      gripAngle: /Grip Angle:\s*(-?\d+)\s*°/i,
      frameStack: /Frame Stack:\s*(\d+)\s*mm/i,
      frameReach: /Frame Reach:\s*(\d+)\s*mm/i,
      handlebarStack: /Handlebar Stack:\s*(\d+)\s*mm/i,
      handlebarReachBB: /Handlebar Reach:\s*(\d+)\s*mm\s*\n\s*BB to center/i,
    };

    for (const [key, regex] of Object.entries(measurements)) {
      const match = text.match(regex);
      if (match) {
        const value = parseFloat(match[1]);
        if (key === 'frameStack') {
          data.frameStack = value;
        } else if (key === 'frameReach') {
          data.frameReach = value;
        } else if (key === 'handlebarReachBB') {
          // BB to handlebar reach (different from saddle to handlebar)
          if (data.fitPosition) {
            data.fitPosition.handlebarReach = value;
          }
        } else if (data.fitPosition) {
          (data.fitPosition as Record<string, number>)[key] = value;
        }
      }
    }

    // Also try to extract handlebar stack/reach from "BB to center" format
    const hbStackMatch = text.match(/Handlebar Stack:\s*(\d+)\s*mm\s*\n.*BB to center/i);
    const hbReachMatch = text.match(/Handlebar Reach:\s*(\d+)\s*mm\s*\n.*BB to center of bar/i);

    if (hbStackMatch && data.fitPosition) {
      data.fitPosition.handlebarStack = parseInt(hbStackMatch[1]);
    }
    if (hbReachMatch && data.fitPosition) {
      data.fitPosition.handlebarReach = parseInt(hbReachMatch[1]);
    }

    // Validate we have minimum required data
    if (!data.frameStack || !data.frameReach || !data.fitPosition?.handlebarStack) {
      console.warn('Missing required fit data', data);
      return null;
    }

    return data as RetulFitData;
  } catch (error) {
    console.error('Error parsing Retül PDF:', error);
    return null;
  }
}

/**
 * Calculate required stem length and angle to achieve a fit position on a new frame
 *
 * The key insight is:
 * - Handlebar position (stack/reach from BB) = Frame stack/reach + spacers + stem contribution
 * - Spacers follow the head tube angle
 * - Stem angle is measured relative to the steerer tube (which follows head tube angle)
 */
export function calculateStemRequirements(
  fitPosition: RetulFitData['fitPosition'],
  newFrame: FrameGeometry,
  options: {
    maxStemLength?: number;
    minStemLength?: number;
    maxSpacers?: number;
    preferredStemAngle?: number;
  } = {}
): StemCalculation {
  const {
    maxStemLength = 140,
    minStemLength = 60,
    maxSpacers = 50,
    preferredStemAngle = -6,
  } = options;

  const notes: string[] = [];

  // Target handlebar position from fit
  const targetStack = fitPosition.handlebarStack;
  const targetReach = fitPosition.handlebarReach;

  // New frame geometry
  const frameStack = newFrame.stackMm;
  const frameReach = newFrame.reachMm;
  const headTubeAngle = newFrame.headTubeAngle || 73; // Default to 73° if not provided

  // Convert head tube angle to radians
  const htaRad = (headTubeAngle * Math.PI) / 180;

  // Calculate the required delta from frame to handlebar position
  const requiredStackGain = targetStack - frameStack;
  const requiredReachGain = targetReach - frameReach;

  // Try to find a valid stem/spacer combination
  // We'll iterate through spacer heights and calculate required stem
  let bestSolution: { spacers: number; stemLength: number; stemAngle: number; error: number } | null = null;

  for (let spacers = 0; spacers <= maxSpacers; spacers += 5) {
    // Spacers contribute to stack and reach based on head tube angle
    const spacerStackContrib = spacers * Math.sin(htaRad);
    const spacerReachContrib = spacers * Math.cos(htaRad);

    // Remaining delta for stem to handle
    const stemStackNeeded = requiredStackGain - spacerStackContrib;
    const stemReachNeeded = requiredReachGain - spacerReachContrib;

    // Try different stem angles
    for (let stemAngle = -17; stemAngle <= 17; stemAngle += 1) {
      // Stem angle is relative to horizontal when installed (accounting for head tube angle)
      // Effective stem angle from horizontal = headTubeAngle - 90 + stemAngle
      const effectiveAngle = ((headTubeAngle - 90 + stemAngle) * Math.PI) / 180;

      // Calculate required stem length to achieve the reach
      // stem_reach = stem_length * cos(effective_angle)
      // stem_stack = stem_length * sin(effective_angle)

      if (Math.abs(Math.cos(effectiveAngle)) < 0.1) continue; // Avoid division by near-zero

      const stemLengthFromReach = stemReachNeeded / Math.cos(effectiveAngle);
      const stemLengthFromStack = Math.abs(Math.sin(effectiveAngle)) > 0.1
        ? stemStackNeeded / Math.sin(effectiveAngle)
        : stemLengthFromReach;

      // Use the average, weighted by confidence
      const stemLength = (stemLengthFromReach + stemLengthFromStack) / 2;

      // Check if this stem length is valid
      if (stemLength >= minStemLength && stemLength <= maxStemLength) {
        // Calculate actual position with this stem
        const actualReachGain = spacerReachContrib + stemLength * Math.cos(effectiveAngle);
        const actualStackGain = spacerStackContrib + stemLength * Math.sin(effectiveAngle);

        const reachError = Math.abs(actualReachGain - requiredReachGain);
        const stackError = Math.abs(actualStackGain - requiredStackGain);
        const totalError = reachError + stackError;

        // Prefer solutions closer to preferred stem angle
        const anglePenalty = Math.abs(stemAngle - preferredStemAngle) * 0.5;
        const scoredError = totalError + anglePenalty;

        if (!bestSolution || scoredError < bestSolution.error) {
          bestSolution = {
            spacers,
            stemLength: Math.round(stemLength),
            stemAngle,
            error: scoredError,
          };
        }
      }
    }
  }

  if (!bestSolution) {
    // No valid solution found, provide best approximation
    notes.push('Exact fit position may not be achievable with standard components');

    // Calculate what we can get with max spacers and a 100mm stem at -6°
    const defaultStemLength = 100;
    const defaultStemAngle = preferredStemAngle;
    const effectiveAngle = ((headTubeAngle - 90 + defaultStemAngle) * Math.PI) / 180;

    const spacerStackContrib = maxSpacers * Math.sin(htaRad);
    const spacerReachContrib = maxSpacers * Math.cos(htaRad);
    const stemReachContrib = defaultStemLength * Math.cos(effectiveAngle);
    const stemStackContrib = defaultStemLength * Math.sin(effectiveAngle);

    const achievableStack = frameStack + spacerStackContrib + stemStackContrib;
    const achievableReach = frameReach + spacerReachContrib + stemReachContrib;

    return {
      stemLength: defaultStemLength,
      stemAngle: defaultStemAngle,
      spacerStack: maxSpacers,
      stackDelta: achievableStack - targetStack,
      reachDelta: achievableReach - targetReach,
      isAchievable: false,
      notes,
    };
  }

  // Calculate actual deltas with best solution
  const effectiveAngle = ((headTubeAngle - 90 + bestSolution.stemAngle) * Math.PI) / 180;
  const spacerStackContrib = bestSolution.spacers * Math.sin(htaRad);
  const spacerReachContrib = bestSolution.spacers * Math.cos(htaRad);
  const stemReachContrib = bestSolution.stemLength * Math.cos(effectiveAngle);
  const stemStackContrib = bestSolution.stemLength * Math.sin(effectiveAngle);

  const achievableStack = frameStack + spacerStackContrib + stemStackContrib;
  const achievableReach = frameReach + spacerReachContrib + stemReachContrib;

  const stackDelta = achievableStack - targetStack;
  const reachDelta = achievableReach - targetReach;

  // Add notes about the fit
  if (Math.abs(stackDelta) > 5) {
    notes.push(`Handlebar will be ${Math.abs(stackDelta).toFixed(0)}mm ${stackDelta > 0 ? 'higher' : 'lower'} than original fit`);
  }
  if (Math.abs(reachDelta) > 5) {
    notes.push(`Handlebar will be ${Math.abs(reachDelta).toFixed(0)}mm ${reachDelta > 0 ? 'further' : 'closer'} than original fit`);
  }

  // Note about common stem lengths
  const commonStemLengths = [70, 80, 90, 100, 110, 120, 130, 140];
  const nearestCommon = commonStemLengths.reduce((prev, curr) =>
    Math.abs(curr - bestSolution!.stemLength) < Math.abs(prev - bestSolution!.stemLength) ? curr : prev
  );
  if (nearestCommon !== bestSolution.stemLength) {
    notes.push(`Nearest common stem length: ${nearestCommon}mm`);
  }

  return {
    stemLength: bestSolution.stemLength,
    stemAngle: bestSolution.stemAngle,
    spacerStack: bestSolution.spacers,
    stackDelta: Math.round(stackDelta),
    reachDelta: Math.round(reachDelta),
    isAchievable: Math.abs(stackDelta) <= 10 && Math.abs(reachDelta) <= 10,
    notes,
  };
}

/**
 * Calculate complete bike setup from fit data and new frame geometry
 * Includes saddle position, seatpost requirements, and cockpit setup
 */
export function calculateBikeSetup(
  fitData: RetulFitData,
  newFrame: FrameGeometry
): BikeSetupCalculation {
  const notes: string[] = [];
  const warnings: string[] = [];

  // Calculate stem requirements
  const stem = calculateStemRequirements(fitData.fitPosition, newFrame);

  // Saddle position from fit (these are absolute measurements)
  const saddleHeight = fitData.fitPosition.saddleHeight;
  const saddleSetback = fitData.fitPosition.saddleSetback;
  const saddleAngle = fitData.fitPosition.saddleAngle || 0;
  const effectiveSTA = fitData.fitPosition.effectiveSeatTubeAngle;

  // Calculate seatpost extension if we have seat tube length
  let seatpostExtension: number | null = null;
  if (newFrame.seatTubeLengthMm) {
    // Seatpost extension = saddle height - seat tube length (approximate)
    // This assumes seat tube is measured center-to-top
    // Need to account for seat tube angle vs effective STA
    const seatTubeAngle = newFrame.seatTubeAngle || effectiveSTA || 73;
    const staRad = (seatTubeAngle * Math.PI) / 180;

    // Project saddle height along the seat tube angle
    const projectedSaddleHeight = saddleHeight / Math.sin(staRad);
    seatpostExtension = Math.round(projectedSaddleHeight - newFrame.seatTubeLengthMm);

    if (seatpostExtension < 50) {
      warnings.push(`Low seatpost extension (${seatpostExtension}mm) - check minimum insertion depth`);
    }
    if (seatpostExtension > 200) {
      warnings.push(`High seatpost extension (${seatpostExtension}mm) - consider a longer seat tube`);
    }
  }

  // Calculate seatpost offset needed
  // If the frame's STA differs from effective STA, we might need an offset post
  const frameSTA = newFrame.seatTubeAngle || 73;
  const staDifference = effectiveSTA - frameSTA;
  let seatpostOffsetNeeded = 0;

  if (Math.abs(staDifference) > 0.5) {
    // Each degree of STA difference ≈ 10-12mm of setback change at typical saddle heights
    const setbackChangePerDegree = saddleHeight * Math.tan((1 * Math.PI) / 180);
    const setbackDifference = staDifference * setbackChangePerDegree;

    if (setbackDifference > 15) {
      seatpostOffsetNeeded = 25;
      notes.push(`Frame STA (${frameSTA}°) is steeper than fit (${effectiveSTA}°) - use 25mm setback seatpost`);
    } else if (setbackDifference > 8) {
      seatpostOffsetNeeded = 20;
      notes.push(`Frame STA (${frameSTA}°) is steeper than fit (${effectiveSTA}°) - use 20mm setback seatpost`);
    } else if (setbackDifference < -15) {
      seatpostOffsetNeeded = 0;
      notes.push(`Frame STA (${frameSTA}°) is slacker than fit (${effectiveSTA}°) - use 0mm offset seatpost, may need forward saddle position`);
    }
  }

  // Add saddle position notes
  if (Math.abs(saddleSetback) < 50) {
    notes.push('Forward saddle position - ensure saddle rails allow this adjustment');
  }

  // Original fit reference
  const originalFitBike = fitData.originalBike
    ? `${fitData.originalBike.make} ${fitData.originalBike.model} ${fitData.originalBike.size}`
    : undefined;

  return {
    stem,
    saddleHeight,
    seatpostExtension,
    saddleSetback,
    saddleAngle,
    effectiveSeatTubeAngle: effectiveSTA,
    seatpostOffsetNeeded,
    originalFitBike,
    originalFitDate: fitData.fitDate,
    notes: [...stem.notes, ...notes],
    warnings,
  };
}

/**
 * Extract text from a PDF file using browser APIs
 */
export async function extractPdfText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();

  // Dynamic import of pdf.js
  const pdfjsLib = await import('pdfjs-dist');

  // Use unpkg CDN which is more reliable for cross-origin loading
  // Get the version from the package
  const version = pdfjsLib.version;
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;

  try {
    const pdf = await pdfjsLib.getDocument({
      data: arrayBuffer,
    }).promise;

    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item) => {
          // TextItem has str property, TextMarkedContent doesn't
          if ('str' in item) {
            return (item as { str: string }).str;
          }
          return '';
        })
        .join(' ');
      fullText += pageText + '\n';
    }

    return fullText;
  } catch (error) {
    console.error('PDF parsing error with worker:', error);

    // Fallback: try without worker (runs on main thread, but works)
    pdfjsLib.GlobalWorkerOptions.workerSrc = '';

    const pdf = await pdfjsLib.getDocument({
      data: arrayBuffer,
    }).promise;

    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item) => {
          if ('str' in item) {
            return (item as { str: string }).str;
          }
          return '';
        })
        .join(' ');
      fullText += pageText + '\n';
    }

    return fullText;
  }
}

/**
 * Hook for managing bike fit data
 */
import { useState, useCallback } from 'react';

export function useBikeFit() {
  const [fitData, setFitData] = useState<RetulFitData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parseFitFile = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);

    try {
      const text = await extractPdfText(file);
      console.log('Extracted PDF text:', text.substring(0, 500));

      const parsed = parseRetulPdf(text);

      if (!parsed) {
        throw new Error('Could not parse fit data from PDF. Please ensure this is a Retül ZIN report.');
      }

      setFitData(parsed);
      return parsed;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to parse fit file';
      setError(message);
      console.error('Fit file parse error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearFitData = useCallback(() => {
    setFitData(null);
    setError(null);
  }, []);

  const calculateStem = useCallback((frameGeometry: FrameGeometry) => {
    if (!fitData?.fitPosition) return null;
    return calculateStemRequirements(fitData.fitPosition, frameGeometry);
  }, [fitData]);

  const calculateSetup = useCallback((frameGeometry: FrameGeometry) => {
    if (!fitData) return null;
    return calculateBikeSetup(fitData, frameGeometry);
  }, [fitData]);

  return {
    fitData,
    loading,
    error,
    parseFitFile,
    clearFitData,
    calculateStem,
    calculateSetup,
  };
}
