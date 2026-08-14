import{_B as b}from"./site-1q3afg48.js";var k="depthBoxBlurPixelShader",q=`varying vec2 vUV;uniform sampler2D textureSampler;uniform vec2 screenSize;
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void)
{vec4 colorDepth=vec4(0.0);for (int x=-OFFSET; x<=OFFSET; x++)
for (int y=-OFFSET; y<=OFFSET; y++)
colorDepth+=texture2D(textureSampler,vUV+vec2(x,y)/screenSize);gl_FragColor=(colorDepth/float((OFFSET*2+1)*(OFFSET*2+1)));}`;if(!b.ShadersStore[k])b.ShadersStore[k]=q;var w={name:k,shader:q};
export{w as Vj};

//# debugId=D8B795D2101DE66464756E2164756E21
//# sourceMappingURL=site-b1jqt2rz.js.map
