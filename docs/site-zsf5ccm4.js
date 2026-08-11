import{_B as f}from"./site-7jxv124x.js";var k="fluentPixelShader",p=`precision highp float;varying vec2 vUV;uniform vec4 albedoColor;
#ifdef INNERGLOW
uniform vec4 innerGlowColor;
#endif
#ifdef BORDER
varying vec2 scaleInfo;uniform float edgeSmoothingValue;uniform float borderMinValue;
#endif
#ifdef HOVERLIGHT
varying vec3 worldPosition;uniform vec3 hoverPosition;uniform vec4 hoverColor;uniform float hoverRadius;
#endif
#ifdef TEXTURE
uniform sampler2D albedoSampler;uniform mat4 textureMatrix;vec2 finalUV;
#endif
void main(void) {vec3 albedo=albedoColor.rgb;float alpha=albedoColor.a;
#ifdef TEXTURE
finalUV=vec2(textureMatrix*vec4(vUV,1.0,0.0));albedo=texture2D(albedoSampler,finalUV).rgb;
#endif
#ifdef HOVERLIGHT
float pointToHover=(1.0-clamp(length(hoverPosition-worldPosition)/hoverRadius,0.,1.))*hoverColor.a;albedo=clamp(albedo+hoverColor.rgb*pointToHover,0.,1.);
#else
float pointToHover=1.0;
#endif
#ifdef BORDER 
float borderPower=10.0;float inverseBorderPower=1.0/borderPower;vec3 borderColor=albedo*borderPower;vec2 distanceToEdge;distanceToEdge.x=abs(vUV.x-0.5)*2.0;distanceToEdge.y=abs(vUV.y-0.5)*2.0;float borderValue=max(smoothstep(scaleInfo.x-edgeSmoothingValue,scaleInfo.x+edgeSmoothingValue,distanceToEdge.x),
smoothstep(scaleInfo.y-edgeSmoothingValue,scaleInfo.y+edgeSmoothingValue,distanceToEdge.y));borderColor=borderColor*borderValue*max(borderMinValue*inverseBorderPower,pointToHover); 
albedo+=borderColor;alpha=max(alpha,borderValue);
#endif
#ifdef INNERGLOW
vec2 uvGlow=(vUV-vec2(0.5,0.5))*(innerGlowColor.a*2.0);uvGlow=uvGlow*uvGlow;uvGlow=uvGlow*uvGlow;albedo+=mix(vec3(0.0,0.0,0.0),innerGlowColor.rgb,uvGlow.x+uvGlow.y); 
#endif
gl_FragColor=vec4(albedo,alpha);}`;if(!f.ShadersStore[k])f.ShadersStore[k]=p;var u={name:k,shader:p};
export{u as mg};

//# debugId=0ED38F9BDAF23C7164756E2164756E21
//# sourceMappingURL=site-zsf5ccm4.js.map
