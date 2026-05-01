import { PRNG } from './mersenne-twister';
export declare function capitalize(s: string): string;
export declare function romanNumeral(n: number): string;
export declare function randomName(prng: PRNG, numberOfSyllables: number, allowSecondName?: boolean, allowSecondary?: boolean): string;
export interface StarTypeInfo {
    luminosity: number;
    color: string;
    rgb: [number, number, number];
    planets: [number, number];
    mass: number;
    lifespan: number;
    inSpiralArm: number;
}
export declare const starTypeData: Record<string, StarTypeInfo>;
type AtmosphereType = 'Breathable' | 'Filterable' | 'Inert' | 'Corrosive' | 'Toxic' | 'Trace' | 'Crushing';
interface PlanetTemplate {
    classification: string;
    radius: [number, number];
    density: [number, number];
    hydrographics: (prng: PRNG, insolation: number, radius: number, density: number) => number;
    atmosphere: (prng: PRNG, insolation: number, radius: number, density: number, hydrographics: number) => AtmosphereType;
}
declare const planetTypeData: PlanetTemplate[];
export { planetTypeData };
export interface StarData {
    name: string;
    seed: number;
    position: {
        x: number;
        y: number;
        z: number;
    };
    spectralType: string;
    spectralClass: string;
    spectralIndex: number;
    luminosity: number;
    mass: number;
    numberOfPlanets: number;
    planetSeed: number;
    rgb: [number, number, number];
    color: string;
    inSpiralArm: boolean;
    lifespan: number;
    scale: number;
    bestHI: number;
}
export interface PlanetData {
    name: string;
    seed: number;
    orbitalRadius: number;
    insolation: number;
    classification: string;
    radius: number;
    density: number;
    hydrographics: number;
    atmosphere: string;
    HI: number;
    description: string;
    g: string;
    albedo: number;
    tempC: string;
    temp: string;
    rings: number;
}
export interface StarSystemData {
    star: StarData;
    planets: PlanetData[];
}
export declare function generateStarSystem(star: StarData): StarSystemData;
export interface GalaxyOptions {
    spiralArms?: number;
    spiralAngleDegrees?: number;
    minRadius?: number;
    maxRadius?: number;
    thickness?: number;
}
export interface NebulaData {
    position: {
        x: number;
        y: number;
        z: number;
    };
    scale: number;
    rgb: [number, number, number];
    type: 'emission' | 'dark';
    opacity: number;
}
export interface GalaxyData {
    stars: StarData[];
    nebulae: NebulaData[];
    seed: number;
    options: Required<GalaxyOptions>;
}
export declare function generateGalaxy(seed: number, numberOfStars: number, options?: GalaxyOptions): GalaxyData;
//# sourceMappingURL=galaxy-data.d.ts.map