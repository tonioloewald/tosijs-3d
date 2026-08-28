import{DD as e}from"./site-53d1aqt6.js";var r="depthBoxBlurPixelShader",o=`varying vec2 vUV;uniform sampler2D textureSampler;uniform vec2 screenSize;
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void)
{vec4 colorDepth=vec4(0.0);for (int x=-OFFSET; x<=OFFSET; x++)
for (int y=-OFFSET; y<=OFFSET; y++)
colorDepth+=texture2D(textureSampler,vUV+vec2(x,y)/screenSize);gl_FragColor=(colorDepth/float((OFFSET*2+1)*(OFFSET*2+1)));}`;if(!e.ShadersStore[r])e.ShadersStore[r]=o;var S={name:r,shader:o};
export{S as bk};

//# debugId=1905E69361BD5B9A64756E2164756E21
//# sourceMappingURL=site-qvtxxts4.js.map
