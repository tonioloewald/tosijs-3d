import{_u,$e,ci}from"./site-j6ranrbs.js";import{Ye,w}from"./site-g82qva8f.js";import{o}from"./site-3cf5tsfq.js";class Cg extends $e{constructor(e){super(e);this.config=e,this.type=this.registerDataInput("type",w,e.type),this.value=this.registerDataOutput("value",w),this.index=this.registerDataInput("index",w,new Ye(ci(e.index??-1)))}_updateOutputs(e){let s=this.type.getValue(e),r=this.index.getValue(e),i=_u(e.assetsContext,s,ci(r),this.config.useIndexAsUniqueId);this.value.setValue(i,e)}getClassName(){return"FlowGraphGetAssetBlock"}}var t=!1;function Ag(){if(t)return;t=!0,o("FlowGraphGetAssetBlock",Cg)}Ag();
export{Cg,Ag};

//# debugId=EAF77D54F03BE01464756E2164756E21
//# sourceMappingURL=site-85cywwhw.js.map
