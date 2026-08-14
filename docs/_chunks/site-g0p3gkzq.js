import{Sr as H}from"./site-qkw1eprc.js";import{as as v}from"./site-cg7jrefc.js";import{du as J}from"./site-pehed6st.js";import{eu as E,ku as q}from"./site-v2rprchq.js";import{sE as D}from"./site-c9kedmgh.js";class K extends J{constructor(b){super(b);this.config=b,this.type=this.registerDataInput("type",q,b.type),this.value=this.registerDataOutput("value",q),this.index=this.registerDataInput("index",q,new E(v(b.index??-1)))}_updateOutputs(b){let O=this.type.getValue(b),P=this.index.getValue(b),Q=H(b.assetsContext,O,v(P),this.config.useIndexAsUniqueId);this.value.setValue(Q,b)}getClassName(){return"FlowGraphGetAssetBlock"}}var z=!1;function L(){if(z)return;z=!0,D("FlowGraphGetAssetBlock",K)}L();
export{K as So,L as To};

//# debugId=73DC82274744291364756E2164756E21
//# sourceMappingURL=site-g0p3gkzq.js.map
