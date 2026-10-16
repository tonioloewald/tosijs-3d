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
export declare const GAS_GIANT_GLSL = "\nfloat b3dGgHash(vec3 p){p=fract(p*0.3183099+vec3(0.1,0.2,0.3));p*=17.0;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}\nfloat b3dGgHashL(vec3 p){return b3dGgHash(floor(p+0.5));}\nfloat b3dGgNoise(vec3 x){vec3 i=floor(x);vec3 f=fract(x);f=f*f*(3.0-2.0*f);\nreturn mix(mix(mix(b3dGgHashL(i),b3dGgHashL(i+vec3(1.0,0.0,0.0)),f.x),mix(b3dGgHashL(i+vec3(0.0,1.0,0.0)),b3dGgHashL(i+vec3(1.0,1.0,0.0)),f.x),f.y),\nmix(mix(b3dGgHashL(i+vec3(0.0,0.0,1.0)),b3dGgHashL(i+vec3(1.0,0.0,1.0)),f.x),mix(b3dGgHashL(i+vec3(0.0,1.0,1.0)),b3dGgHashL(i+vec3(1.0,1.0,1.0)),f.x),f.y),f.z);}\nfloat b3dGgFbm(vec3 p){float a=0.5;float s=0.0;for(int i=0;i<3;i++){s+=a*b3dGgNoise(p);p=p*2.03+vec3(7.1,3.3,5.7);a*=0.5;}return s/0.875;}\nvec3 b3dGgTurn(vec3 n,float a){float c=cos(a);float s=sin(a);return vec3(n.x*c-n.z*s,n.y,n.x*s+n.z*c);}\nvec3 b3dGasGiant(vec3 n,vec4 k,vec3 c0,vec3 c1,vec3 c2,float t){\nfloat u=asin(clamp(n.y,-1.0,1.0))/1.5708;\nfloat au=abs(u);\nfloat e=sign(u)*mix(au,pow(au,1.6),0.65);\nfloat ph=e*k.x*1.5708;\nvec3 sd=vec3(k.w*13.1,k.w*7.7,k.w*3.3);\nvec3 q=b3dGgTurn(n,t*0.012*cos(ph));\nfloat w=b3dGgFbm(q*vec3(1.7,8.0,1.7)+sd)-0.5;\nfloat wb=abs(b3dGgFbm(q*vec3(4.0,18.0,4.0)+sd*1.7+vec3(w*2.0))-0.5)*2.0;\nfloat edge=1.0-abs(cos(ph));edge*=edge;\nfloat eddy=edge*smoothstep(0.42,0.75,b3dGgNoise(q*vec3(2.5,5.0,2.5)+sd*0.7));\nvec3 ep=q*10.0+sd;\nvec3 ew=vec3(b3dGgNoise(ep),b3dGgNoise(ep+vec3(17.0)),b3dGgNoise(ep+vec3(31.0)))-0.5;\nfloat cw=b3dGgFbm(ep+ew*2.5+sd*0.3)-0.5;\nfloat v=e+k.y*(0.025*w+0.012*(wb-0.5)+eddy*cw*(2.4/k.x));\nfloat tone=b3dGgNoise(vec3(floor(v*k.x*0.25+0.5)*3.7,k.w*5.1,1.3));\nfloat band=0.5+0.5*cos(v*k.x*1.5708+(tone-0.5)*1.2);\nvec3 col=mix(c1,c0,smoothstep(0.25,0.75,band));\ncol=mix(col,mix(c0,c2,0.5),(1.0-band)*tone*0.55);\ncol*=0.95+0.07*(wb-0.5)*k.y+0.08*(tone-0.5)+0.1*eddy*cw*k.y;\nif(k.z>0.0){\nfloat la=-0.36;\nvec3 sn=b3dGgTurn(n,t*0.004+k.w*2.1);\nfloat lon=atan(sn.z,sn.x);\nvec2 d=vec2(lon*cos(la)*0.55,(asin(clamp(n.y,-1.0,1.0))-la))*(k.x/(3.2*k.z));\nfloat r=length(d);\nfloat sa=(1.0-smoothstep(0.0,1.1,r))*3.5-t*0.05;\nvec2 dr=vec2(d.x*cos(sa)-d.y*sin(sa),d.x*sin(sa)+d.y*cos(sa));\nfloat sw=b3dGgFbm(vec3(dr*3.0,k.w*1.7));\nfloat m=1.0-smoothstep(0.55,1.0,r+0.3*(sw-0.5));\nvec3 lw=vec3(0.3,0.59,0.11);\nif(dot(c2,lw)<dot(c0,lw)){\ncol=mix(col,c2*(0.82+0.3*sw),m);\n}else{\ncol=mix(col,c1*(0.5+0.25*sw),m);\nfloat rim=smoothstep(0.55,0.85,r)*(1.0-smoothstep(0.85,1.25,r))*smoothstep(0.45,0.7,sw);\ncol=mix(col,c2,rim*0.8);\n}\n}\ncol=mix(col,col*0.6+c1*0.25,smoothstep(0.6,1.0,abs(u))*0.6);\nreturn col;}\nvec3 b3dGasGiantLit(vec3 alb,float nl,float nv,vec3 haze){\nfloat l=max(nl,0.0);float e=clamp(nv,0.0,1.0);\nfloat lit=pow(l,0.8)+0.05*smoothstep(-0.2,0.0,nl)*(1.0-l);\nvec3 c=alb*lit*pow(e,0.35);\nc+=haze*pow(1.0-e,2.5)*smoothstep(-0.15,0.35,nl)*0.45;\nreturn c;}\n";
export declare const RING_GLSL = "\nfloat b3dRingHash(float p){return fract(sin(p*127.1)*43758.5453);}\nvec2 b3dRing(float t,float theta,float seed,float px){\n  // A shepherd moon in the narrow gap: the edges either side of it\n  // ripple round the ring, fading away from the gap. (The integer\n  // count keeps the ripple whole across atan's jump.)\n  float gapB=b3dRingHash(seed+1.0)*0.15+0.8;\n  float near=abs(t-gapB);\n  t+=0.004*sin(theta*36.0)*exp(-near/0.02);\n  // SHARP, as rings are, and irregular: the density along the radius is\n  // 1D noise at several scales, TERRACED, so it holds plateaus of\n  // different widths and steps between them with edges about a pixel wide.\n  float n=0.0;\n  float a=0.5;\n  float f=6.0;\n  float norm=0.0;\n  for(float i=0.0;i<5.0;i++){\n    float x=t*f+seed*13.1+i*7.3;\n    float c=floor(x);\n    float k=fract(x);\n    float vn=mix(b3dRingHash(c),b3dRingHash(c+1.0),k*k*(3.0-2.0*k));\n    float fade=1.0-smoothstep(0.3,0.6,f*px);\n    n+=a*fade*(vn-0.5);\n    norm+=a;\n    a*=0.55;\n    f*=2.7;\n  }\n  n=clamp(n/norm*1.6+0.5,0.0,1.0);\n  float steps=n*6.0;\n  float sw=max(fwidth(steps),1e-4);\n  float terrace=(floor(steps)+smoothstep(1.0-sw,1.0,fract(steps)))/6.0;\n  float density=mix(n,terrace,0.75);\n  // The broad profile: faint inside, brightest a little out.\n  float profile=0.35+0.65*sin(3.1416*pow(clamp(t,0.0,1.0),0.75));\n  float bands=profile*(0.3+1.1*density)*1.3;\n  // Gaps: the wide one (Cassini's) and the moon's narrow one, cut clean,\n  // a pixel soft.\n  float g1=abs(t-b3dRingHash(seed)*0.4-0.45);\n  float gap1=smoothstep(0.022-px,0.022+px,g1);\n  float gap2=smoothstep(0.005-px,0.005+px,abs(t-gapB));\n  bands*=mix(0.04,1.0,gap1)*mix(0.06,1.0,gap2);\n  // Edges: crisp, a few pixels at most.\n  float edge=smoothstep(0.0,max(0.015,px*2.0),t)*smoothstep(1.0,1.0-max(0.01,px*2.0),t);\n  return vec2(bands,clamp(bands,0.0,1.0)*edge);\n}\n";
//# sourceMappingURL=gas-giant.d.ts.map