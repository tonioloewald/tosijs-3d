import{Sr as H}from"./site-j6qv97s6.js";import{as as v}from"./site-fk6vvnk0.js";import{du as J}from"./site-037v9pkv.js";import{eu as E,ku as q}from"./site-5mc4escc.js";import{sE as D}from"./site-tvqrtn5a.js";class K extends J{constructor(b){super(b);this.config=b,this.type=this.registerDataInput("type",q,b.type),this.value=this.registerDataOutput("value",q),this.index=this.registerDataInput("index",q,new E(v(b.index??-1)))}_updateOutputs(b){let O=this.type.getValue(b),P=this.index.getValue(b),Q=H(b.assetsContext,O,v(P),this.config.useIndexAsUniqueId);this.value.setValue(Q,b)}getClassName(){return"FlowGraphGetAssetBlock"}}var z=!1;function L(){if(z)return;z=!0,D("FlowGraphGetAssetBlock",K)}L();
export{K as So,L as To};

//# debugId=08BEDD22C722783A64756E2164756E21
//# sourceMappingURL=site-y8566cx3.js.map
