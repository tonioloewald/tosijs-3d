class d{static SetMatrixPrecision(w){if(d.MatrixTrackPrecisionChange=!1,w&&!d.MatrixUse64Bits){if(d.MatrixTrackedMatrices)for(let k=0;k<d.MatrixTrackedMatrices.length;++k){let q=d.MatrixTrackedMatrices[k],y=q._m;q._m=Array(16);for(let h=0;h<16;++h)q._m[h]=y[h]}}d.MatrixUse64Bits=w,d.MatrixCurrentType=d.MatrixUse64Bits?Array:Float32Array,d.MatrixTrackedMatrices=null}}d.MatrixUse64Bits=!1;d.MatrixTrackPrecisionChange=!0;d.MatrixCurrentType=Float32Array;d.MatrixTrackedMatrices=[];
export{d as UE};

//# debugId=26DE0371053DBCF764756E2164756E21
//# sourceMappingURL=site-bt9ev9f2.js.map
