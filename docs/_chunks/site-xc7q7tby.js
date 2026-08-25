import{_B as e}from"./site-ea0e8ybd.js";var r="depthBoxBlurPixelShader",o=`varying vec2 vUV;uniform sampler2D textureSampler;uniform vec2 screenSize;
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void)
{vec4 colorDepth=vec4(0.0);for (int x=-OFFSET; x<=OFFSET; x++)
for (int y=-OFFSET; y<=OFFSET; y++)
colorDepth+=texture2D(textureSampler,vUV+vec2(x,y)/screenSize);gl_FragColor=(colorDepth/float((OFFSET*2+1)*(OFFSET*2+1)));}`;if(!e.ShadersStore[r])e.ShadersStore[r]=o;var S={name:r,shader:o};
export{S as Vj};

//# debugId=1257DEE1203E1CF964756E2164756E21
//# sourceMappingURL=site-xc7q7tby.js.map
