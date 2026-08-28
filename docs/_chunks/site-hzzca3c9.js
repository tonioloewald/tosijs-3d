class t{static SetMatrixPrecision(a){if(t.MatrixTrackPrecisionChange=!1,a&&!t.MatrixUse64Bits){if(t.MatrixTrackedMatrices)for(let i=0;i<t.MatrixTrackedMatrices.length;++i){let M=t.MatrixTrackedMatrices[i],x=M._m;M._m=Array(16);for(let s=0;s<16;++s)M._m[s]=x[s]}}t.MatrixUse64Bits=a,t.MatrixCurrentType=t.MatrixUse64Bits?Array:Float32Array,t.MatrixTrackedMatrices=null}}t.MatrixUse64Bits=!1;t.MatrixTrackPrecisionChange=!0;t.MatrixCurrentType=Float32Array;t.MatrixTrackedMatrices=[];
export{t as HG};

//# debugId=67C30A680CF51EF064756E2164756E21
//# sourceMappingURL=site-hzzca3c9.js.map
