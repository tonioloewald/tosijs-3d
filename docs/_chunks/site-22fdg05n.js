import{_u,$e,ci}from"./site-2z9zdtr9.js";import{Ye,w}from"./site-6xzhcvhx.js";import{o}from"./site-rtzsfcas.js";class Cg extends $e{constructor(e){super(e);this.config=e,this.type=this.registerDataInput("type",w,e.type),this.value=this.registerDataOutput("value",w),this.index=this.registerDataInput("index",w,new Ye(ci(e.index??-1)))}_updateOutputs(e){let s=this.type.getValue(e),r=this.index.getValue(e),i=_u(e.assetsContext,s,ci(r),this.config.useIndexAsUniqueId);this.value.setValue(i,e)}getClassName(){return"FlowGraphGetAssetBlock"}}var t=!1;function Ag(){if(t)return;t=!0,o("FlowGraphGetAssetBlock",Cg)}Ag();
export{Cg,Ag};

//# debugId=EAF77D54F03BE01464756E2164756E21
//# sourceMappingURL=site-22fdg05n.js.map
