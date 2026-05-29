export type CloseApproach = {
    date: string | null;
    dateTime: string | null;
    velocityKmPerHour: number | null;
    missDistanceKm: number | null;
    missDistanceLunar: number | null;
    orbitingBody: string | null;
};

export type Asteroid = {
    id: string;
    name: string;
    nasaJplUrl: string | null;
    estimatedDiameterMinKm: number | null;
    estimatedDiameterMaxKm: number | null;
    averageDiameterKm: number | null;
    potentiallyHazardous: boolean;
    primaryApproach: CloseApproach | null;
    closeApproaches: CloseApproach[];
};

export type AsteroidStats = {
    total: number;
    hazardous: number;
    largestDiameterKm: number | null;
    fastestVelocityKmH: number | null;
    closestDistanceKm: number | null;
    byDay: Array<{ date: string; total: number }>;
    hazardousBreakdown: Array<{ name: string; value: number }>;
    topLargest: Array<{ name: string; diameterKm: number | null }>;
};

export type SmallBodyObjectType = 'asteroid' | 'comet' | 'other';

export type JplCloseApproach = {
    designation: string;
    fullName: string | null;
    spkId: string | null;
    detailId: string;
    orbitId: string | null;
    julianDate: string | null;
    calendarDate: string | null;
    distanceAu: number | null;
    distanceKm: number | null;
    distanceLunar: number | null;
    distanceMinAu: number | null;
    distanceMaxAu: number | null;
    relativeVelocityKmS: number | null;
    relativeVelocityKmH: number | null;
    infinityVelocityKmS: number | null;
    timeUncertainty: string | null;
    approachBody: string | null;
    absoluteMagnitude: number | null;
    diameterKm: number | null;
    diameterSigmaKm: number | null;
    objectType: SmallBodyObjectType;
    displayName: string;
};

export type JplApproachSummary = {
    total: number;
    comets: number;
    asteroids: number;
    closestDistanceAu: number | null;
    closestDistanceKm: number | null;
    closestObjectName: string | null;
    fastestVelocityKmS: number | null;
    fastestVelocityKmH: number | null;
    fastestObjectName: string | null;
    nextApproachDate: string | null;
    nextApproachName: string | null;
};

export type JplApproachCharts = {
    byDay: Array<{ date: string; total: number }>;
    byType: Array<{ name: string; value: number }>;
    closest: Array<{ name: string; distanceAu: number | null; distanceKm: number | null }>;
    fastest: Array<{ name: string; velocityKmS: number | null; velocityKmH: number | null }>;
    byBody: Array<{ name: string; value: number }>;
};

export type JplCloseApproachFilters = {
    date_min: string;
    date_max: string;
    type: 'all' | 'asteroid' | 'comet';
    dist_max: string;
    sort: string;
};

export type DistanceContext = {
    kilometers: number | null;
    miles: number | null;
    lunarDistance: number | null;
    lunarReferenceKm: number;
    earthDiametersApprox: number | null;
    proximityBand: 'inside_moon' | 'near_moon' | 'beyond_moon' | 'unknown';
    headline: string;
    comparison: string;
};

export type UnifiedApproach = {
    id: string;
    source: 'neows' | 'cad';
    sourceLabel: string;
    rawName?: string;
    name: string;
    designation: string | null;
    spkId?: string | null;
    permanentNumber?: string | null;
    properName?: string | null;
    provisionalDesignation?: string | null;
    displayName?: string;
    subtitle?: string | null;
    aliases?: string[];
    objectType: SmallBodyObjectType;
    approachDate: string | null;
    approachBody: string | null;
    nominalDistanceKm: number | null;
    nominalDistanceMiles: number | null;
    lunarDistance: number | null;
    relativeVelocityKph: number | null;
    relativeVelocityKms: number | null;
    estimatedDiameterMinMeters: number | null;
    estimatedDiameterMaxMeters: number | null;
    diameterMeters: number | null;
    hazardFlag: boolean;
    detailIdentifier: string;
    detailSource: string;
    detailRoute: string;
    orbitId: string | null;
    absoluteMagnitude: number | null;
    distanceContext: DistanceContext;
};

export type TrajectoryPoint = {
    timestamp: string;
    x: number;
    y: number;
    z?: number;
    vx?: number | null;
    vy?: number | null;
    vz?: number | null;
    rangeKm?: number | null;
    rangeRateKmS?: number | null;
    distanceKm?: number;
    distanceLunar?: number;
};

export type AsteroidTrajectory = {
    objectId: string;
    objectName: string;
    source: 'JPL Horizons';
    center: 'Earth';
    projection: '2D simplified';
    closestApproachTime: string;
    points: TrajectoryPoint[];
    /** When the trajectory is anchored to "now" (closest-now mode), Horizons returns the points
     * already split into the segment before and after the current instant. */
    pastPoints?: TrajectoryPoint[];
    futurePoints?: TrajectoryPoint[];
    currentPoint?: TrajectoryPoint | null;
    currentDistanceKm?: number | null;
    currentDistanceLD?: number | null;
    anchor?: 'now' | 'closest_approach';
    anchorTime?: string | null;
    referencePoint?: TrajectoryPoint | null;
    motionState?: 'approaching' | 'receding' | 'near_closest' | 'unknown';
    /** Osculating heliocentric orbital elements from the Horizons VECTORS header, used to draw the
     * object's full orbit around the Sun. Null when Horizons didn't provide them. */
    orbitalElements?: OrbitalElements | null;
    status: 'available' | 'unavailable' | 'fallback';
    horizonsFailureKind?: HorizonsFailureKind | null;
    note?: string;
};

export type OrbitalElements = {
    /** Eccentricity. */
    ec: number;
    /** Perihelion distance, AU. */
    qrAu: number;
    /** Inclination, degrees (ecliptic J2000). */
    inDeg: number;
    /** Longitude of ascending node Ω, degrees. */
    omDeg: number;
    /** Argument of perihelion ω, degrees. */
    wDeg: number;
    /** Time of perihelion passage, Julian date. */
    tpJd: number;
    /** Element epoch, Julian date. */
    epochJd: number;
};

export type ClosestNowObject = {
    approach: UnifiedApproach;
    trajectory: AsteroidTrajectory | null;
    currentDistanceKm: number | null;
    currentDistanceLD: number | null;
    hasRealCurrentDistance: boolean;
};

export type ClosestNowResponse = {
    mode: 'closest_now';
    generatedAt: string;
    window: { dateMin: string; dateMax: string };
    requestedLimit: number;
    candidatesEvaluated: number;
    objects: ClosestNowObject[];
    note?: string;
    lunarReference: LunarReference;
};

export type RadarMode = 'closest-5-now' | 'today' | 'next-7d' | 'pha' | 'all';

export type AsteroidModelFidelityLevel = 'N1' | 'N2' | 'N3' | 'N4' | 'N5';

export type AsteroidModelKind = 'real_shape' | 'catalog_reference' | 'procedural' | 'size_placeholder';

export type AsteroidModelMetadata = {
    objectId: string;
    objectName: string;
    status: 'available' | 'fallback';
    fidelityLevel: AsteroidModelFidelityLevel;
    modelKind: AsteroidModelKind;
    modelUrl: string | null;
    sourceName: string;
    sourceUrl: string | null;
    cacheTtlSeconds: number;
    generatedAt: string;
    shapeSeed: number;
    diameterMeters: number | null;
    diameterMinMeters: number | null;
    diameterMaxMeters: number | null;
    rotationPeriodHours: number | null;
    albedo: number | null;
    confidence: number;
    note: string;
};

export type HorizonsPositionFailureReason =
    | 'no_command_candidates'
    | 'no_ephemeris'
    | 'parse_error'
    | 'no_point_near_reference'
    | 'no_reference_time'
    | 'rate_limit'
    | 'timeout'
    | 'http_error'
    | 'invalid_target';

/**
 * UI-facing classification of why Horizons position is unavailable.
 * - horizons_transient: 503/timeout/rate-limit — worth retrying, already attempted with backoff.
 * - no_ephemeris: Horizons responded but has no published ephemeris for this object yet (too new).
 * - no_orbital_data: no valid Horizons identifier exists (no designation, no SPKID).
 * - symbolic: generic fallback — distance-only, reason unclear.
 */
export type HorizonsFailureKind =
    | 'horizons_transient'
    | 'no_ephemeris'
    | 'no_orbital_data'
    | 'symbolic';

export type HorizonsPositionResult = {
    id: string;
    status: 'available' | 'unavailable';
    positionKind: 'horizons_current' | 'symbolic_distance_only';
    x: number | null;
    y: number | null;
    z: number | null;
    vx: number | null;
    vy: number | null;
    vz: number | null;
    currentPositionTime: string | null;
    closestApproachTime: string | null;
    closestApproachDistanceKm: number | null;
    closestApproachDistanceLD: number | null;
    distanceSource: 'JPL Horizons' | 'NeoWs' | 'CAD' | 'fallback';
    positionSource: 'JPL Horizons' | 'symbolic' | 'unavailable';
    failureReason: HorizonsPositionFailureReason | null;
    horizonsFailureKind: HorizonsFailureKind | null;
    note: string | null;
};

export type HorizonsReferenceMode = 'current' | 'closest_approach';

export type SunDirection = {
    longitudeDeg: number;
    x: number;
    y: number;
    timestamp: string;
};

export type HorizonsPositionsResponse = {
    positions: Record<string, HorizonsPositionResult>;
    referenceMode: HorizonsReferenceMode;
    sunDirection: SunDirection | null;
    generatedAt: string;
};

export type ApproachObservatorySummary = {
    total: number;
    asteroids: number;
    comets: number;
    fromNeoWs: number;
    fromCad: number;
    closerThanMoon: number;
    nearMoon: number;
    closestObjectName: string | null;
    closestDistanceKm: number | null;
    closestLunarDistance: number | null;
    fastestObjectName: string | null;
    fastestVelocityKph: number | null;
    nextApproachName: string | null;
    nextApproachDate: string | null;
};

export type ApproachObservatoryCharts = {
    byDay: Array<{ date: string; total: number }>;
    byType: Array<{ name: string; value: number }>;
    bySource: Array<{ name: string; value: number }>;
    closest: Array<{ name: string; lunarDistance: number | null; distanceKm: number | null }>;
    fastest: Array<{ name: string; velocityKph: number | null }>;
};

export type ApproachObservatoryFilters = {
    date_min: string;
    date_max: string;
    type: 'all' | 'asteroid' | 'comet';
    dist_max: string;
    sort: string;
    distance_unit: 'km' | 'mi';
};

export type LunarReference = {
    distanceKm: number;
    earthDiametersApprox: number;
    label: string;
    description: string;
};

export type OrbitalElement = {
    name: string;
    label: string | null;
    title: string | null;
    value: number | null;
    displayValue: string | null;
    sigma: number | null;
    units: string | null;
};

export type PhysicalParameter = {
    name: string;
    title: string | null;
    value: number | null;
    displayValue: string | null;
    sigma: number | null;
    units: string | null;
    description: string | null;
    reference: string | null;
};

export type SmallBodyCloseApproach = {
    date: string | null;
    julianDate: string | null;
    body: string | null;
    distanceAu: number | null;
    distanceKm: number | null;
    distanceLunar: number | null;
    distanceMinAu: number | null;
    distanceMaxAu: number | null;
    relativeVelocityKmS: number | null;
    relativeVelocityKmH: number | null;
    infinityVelocityKmS: number | null;
    timeUncertainty: string | null;
    orbitReference: string | null;
};

export type SmallBody = {
    designation: string | null;
    spkId: string | null;
    fullName: string | null;
    shortName: string | null;
    primaryName: string;
    orbitClass: string | null;
    orbitClassDescription: string | null;
    kind: string | null;
    prefix: string | null;
    firstObservation: string | null;
    epoch: string | null;
    equinox: string | null;
    solutionDate: string | null;
    objectType: SmallBodyObjectType;
    absoluteMagnitude: number | null;
    diameterKm: number | null;
    albedo: number | null;
    rotationPeriodHours: number | null;
    orbitalElements: OrbitalElement[];
    physicalParameters: PhysicalParameter[];
    closeApproaches: SmallBodyCloseApproach[];
};

export type EpicImage = {
    identifier: string;
    image: string;
    caption: string | null;
    date: string | null;
    imageUrl: string | null;
    centroidCoordinates: Record<string, number> | null;
    dscovrPosition: Record<string, number> | null;
};

export type HomeEarthImage = {
    url: string | null;
    imageUrl: string | null;
    alt: string;
    caption: string | null;
    credit: string;
    source: 'EPIC' | 'fallback' | null;
    date: string | null;
};

export type Apod = {
    date: string;
    title: string;
    explanation: string | null;
    mediaType: string;
    url: string | null;
    hdUrl: string | null;
    thumbnailUrl: string | null;
    displayUrl: string | null;
    videoUrl: string | null;
    copyright: string | null;
    isImage: boolean;
    isVideo: boolean;
};

export type PageProps<T = Record<string, unknown>> = T & {
    [key: string]: unknown;
    flash?: {
        error?: string | null;
    };
    errors?: Record<string, string>;
};

export type SpaceNewsHighlight = {
    title: string;
    source: string;
    publishedAt: string;
    url: string;
    imageUrl?: string | null;
};

export type HomePageData = {
    apod: Apod | null;
    apodError?: string | null;
    nextApproach?: UnifiedApproach | null;
    spaceNewsHighlight?: SpaceNewsHighlight | null;
};
