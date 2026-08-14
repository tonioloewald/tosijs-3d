var B={};function H(j,q=!1){if(q&&B[j])return;return B[j]=!0,`${j} needs to be imported before as it contains a side-effect required by your code.`}var C={},F=!1,G=0;function I(j,q,x=!1){let A=function(){if((x||F)&&G===0){let z=`${j}.${q}`;if(!C[z])C[z]=!0,console.warn(`[Babylon.js] ${z}() requires a side-effect import. See: https://doc.babylonjs.com/setup/treeshaking`)}};return A.__isSideEffectStub=!0,A}function J(j){if(!j)return!1;return!j.__isSideEffectStub}function K(j,q){return{get(){return},set(x){Object.defineProperty(this,q,{value:x,writable:!0,configurable:!0,enumerable:!0})},configurable:!0,enumerable:!0}}
export{H as ED,I as FD,J as GD,K as HD};

//# debugId=F69124EEED7C5EB364756E2164756E21
//# sourceMappingURL=site-6wdjth49.js.map
