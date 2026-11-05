import{gu,$e,ci}from"./site-sxxg2v6h.js";import{Ye,O}from"./site-fszd7aez.js";import{o}from"./site-9mf4pzsy.js";class vg extends $e{constructor(e){super(e);this.config=e,this.type=this.registerDataInput("type",O,e.type),this.value=this.registerDataOutput("value",O),this.index=this.registerDataInput("index",O,new Ye(ci(e.index??-1)))}_updateOutputs(e){let s=this.type.getValue(e),r=this.index.getValue(e),i=gu(e.assetsContext,s,ci(r),this.config.useIndexAsUniqueId);this.value.setValue(i,e)}getClassName(){return"FlowGraphGetAssetBlock"}}var t=!1;function Sg(){if(t)return;t=!0,o("FlowGraphGetAssetBlock",vg)}Sg();
export{vg,Sg};

//# debugId=D00E1DE36327109C64756E2164756E21
//# sourceMappingURL=site-v152g55j.js.map
