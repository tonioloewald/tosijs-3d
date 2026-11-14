import{fu,$e,ci}from"./site-3t3g319r.js";import{Ye,w}from"./site-8r8s7x74.js";import{o}from"./site-twypjy9n.js";class wg extends $e{constructor(e){super(e);this.config=e,this.type=this.registerDataInput("type",w,e.type),this.value=this.registerDataOutput("value",w),this.index=this.registerDataInput("index",w,new Ye(ci(e.index??-1)))}_updateOutputs(e){let s=this.type.getValue(e),r=this.index.getValue(e),i=fu(e.assetsContext,s,ci(r),this.config.useIndexAsUniqueId);this.value.setValue(i,e)}getClassName(){return"FlowGraphGetAssetBlock"}}var t=!1;function Og(){if(t)return;t=!0,o("FlowGraphGetAssetBlock",wg)}Og();
export{wg,Og};

//# debugId=ED57A373FEACC8F364756E2164756E21
//# sourceMappingURL=site-sy4dh6vf.js.map
