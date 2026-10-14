export interface GasGiantLook {
    /** Stripes from pole to pole. */
    bands: number;
    /** How torn the band edges are, 0…1. */
    turbulence: number;
    /** Size of the great storm, 0 = none. */
    storm: number;
    /** Zones, belts, accent: three `#rrggbb`. */
    colors: [string, string, string];
    seed: number;
    /** What its ring looks like, where a ring is asked for. */
    rings: GasGiantRing;
}
export interface GasGiantRing {
    /** Inner edge, in planet radii from the centre. */
    inner: number;
    /** Outer edge, in planet radii. */
    outer: number;
    /** 0…1. */
    opacity: number;
    color: string;
}
export declare const GAS_GIANTS: Record<string, GasGiantLook>;
export interface GasGiantOverrides {
    /** `> 0` replaces the preset's. */
    bands?: number;
    /** `>= 0` replaces the preset's. */
    turbulence?: number;
    /** `>= 0` replaces the preset's. */
    storm?: number;
    /** Up to three colours, comma separated or an array; blanks keep the preset's. */
    colors?: string | string[];
    /** `> 0` replaces the preset's. */
    seed?: number;
}
/**
 * A preset plus overrides. An unknown preset name is Jupiter, so a typo still
 * draws a planet; the sentinels (`0`, `-1`, `''`) mean "the preset's own".
 */
export declare function resolveGasGiant(preset: string, over?: GasGiantOverrides): GasGiantLook;
/** `#rrggbb` (display) to linear-ish RGB 0…1, which is what the shader mixes in. */
export declare function gasGiantRgb(hex: string): [number, number, number];
export declare const GAS_GIANT_GLSL = "\nfloat b3dGgHash(vec3 p){p=fract(p*0.3183099+vec3(0.1,0.2,0.3));p*=17.0;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}\nfloat b3dGgHashL(vec3 p){return b3dGgHash(floor(p+0.5));}\nfloat b3dGgNoise(vec3 x){vec3 i=floor(x);vec3 f=fract(x);f=f*f*(3.0-2.0*f);\nreturn mix(mix(mix(b3dGgHashL(i),b3dGgHashL(i+vec3(1.0,0.0,0.0)),f.x),mix(b3dGgHashL(i+vec3(0.0,1.0,0.0)),b3dGgHashL(i+vec3(1.0,1.0,0.0)),f.x),f.y),\nmix(mix(b3dGgHashL(i+vec3(0.0,0.0,1.0)),b3dGgHashL(i+vec3(1.0,0.0,1.0)),f.x),mix(b3dGgHashL(i+vec3(0.0,1.0,1.0)),b3dGgHashL(i+vec3(1.0,1.0,1.0)),f.x),f.y),f.z);}\nfloat b3dGgFbm(vec3 p){float a=0.5;float s=0.0;for(int i=0;i<3;i++){s+=a*b3dGgNoise(p);p=p*2.03+vec3(7.1,3.3,5.7);a*=0.5;}return s/0.875;}\nvec3 b3dGgTurn(vec3 n,float a){float c=cos(a);float s=sin(a);return vec3(n.x*c-n.z*s,n.y,n.x*s+n.z*c);}\nvec3 b3dGasGiant(vec3 n,vec4 k,vec3 c0,vec3 c1,vec3 c2,float t){\nfloat u=asin(clamp(n.y,-1.0,1.0))/1.5708;\nfloat au=abs(u);\nfloat e=sign(u)*mix(au,pow(au,1.6),0.65);\nfloat ph=e*k.x*1.5708;\nvec3 sd=vec3(k.w*13.1,k.w*7.7,k.w*3.3);\nvec3 q=b3dGgTurn(n,t*0.012*cos(ph));\nvec3 sp=q*vec3(4.0,11.0,4.0)+sd;\nq+=k.y*0.11*(vec3(b3dGgNoise(sp),b3dGgNoise(sp+vec3(17.0)),b3dGgNoise(sp+vec3(31.0)))-0.5);\nfloat w=b3dGgFbm(q*vec3(1.7,8.0,1.7)+sd)-0.5;\nfloat w2=b3dGgFbm(q*vec3(5.0,34.0,5.0)+sd*1.7+vec3(w*2.0))-0.5;\nfloat w3=b3dGgNoise(q*vec3(16.0,70.0,16.0)+sd*2.3)-0.5;\nfloat v=e+k.y*(0.1*w+0.05*w2+0.016*w3);\nfloat tone=b3dGgNoise(vec3(floor(v*k.x*0.25+0.5)*3.7,k.w*5.1,1.3));\nfloat band=0.5+0.5*cos(v*k.x*1.5708+(tone-0.5)*1.2);\nvec3 col=mix(c1,c0,smoothstep(0.25,0.75,band));\ncol=mix(col,mix(c0,c2,0.5),(1.0-band)*tone*0.55);\ncol*=0.93+0.22*w2*k.y+0.08*(tone-0.5);\nif(k.z>0.0){\nfloat la=-0.36;\nvec3 sn=b3dGgTurn(n,t*0.004+k.w*2.1);\nfloat lon=atan(sn.z,sn.x);\nvec2 d=vec2(lon*cos(la)*0.55,(asin(clamp(n.y,-1.0,1.0))-la))*(k.x/(3.2*k.z));\nfloat r=length(d);\nfloat sw=b3dGgNoise(vec3(atan(d.y,d.x)*1.5+r*9.0-t*0.05,r*5.0,k.w));\nfloat m=1.0-smoothstep(0.55,1.0,r+0.12*(sw-0.5));\ncol=mix(col,c2*(0.82+0.3*sw),m);\n}\ncol=mix(col,mix(c1,c2,0.35)*0.72,smoothstep(0.72,1.0,abs(u)));\nreturn col;}\nvec3 b3dGasGiantLit(vec3 alb,float nl,float nv,vec3 haze){\nfloat l=max(nl,0.0);float e=clamp(nv,0.0,1.0);\nfloat lit=pow(l,0.8)+0.05*smoothstep(-0.2,0.0,nl)*(1.0-l);\nvec3 c=alb*lit*pow(e,0.35);\nc+=haze*pow(1.0-e,2.5)*smoothstep(-0.15,0.35,nl)*0.45;\nreturn c;}\n";
//# sourceMappingURL=gas-giant.d.ts.map