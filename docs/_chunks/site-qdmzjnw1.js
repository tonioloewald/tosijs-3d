var s={};function c(e,t=!1){if(t&&s[e])return;return s[e]=!0,`${e} needs to be imported before as it contains a side-effect required by your code.`}var f={},u=!1,o=0;function a(e,t,n=!1){let i=function(){if((n||u)&&o===0){let r=`${e}.${t}`;if(!f[r])f[r]=!0,console.warn(`[Babylon.js] ${r}() requires a side-effect import. See: https://doc.babylonjs.com/setup/treeshaking`)}};return i.__isSideEffectStub=!0,i}function d(e){if(!e)return!1;return!e.__isSideEffectStub}function p(e,t){return{get(){return},set(n){Object.defineProperty(this,t,{value:n,writable:!0,configurable:!0,enumerable:!0})},configurable:!0,enumerable:!0}}
export{c as zD,a as AD,d as BD,p as CD};

//# debugId=965603500B706A4E64756E2164756E21
//# sourceMappingURL=site-qdmzjnw1.js.map
